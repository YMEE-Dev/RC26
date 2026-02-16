(() => {
  const STYLE_ID = 'side-drawer-runtime-styles';

  /*
    SideDrawer usage examples:

    <side-drawer
      class="drawer"
      data-drawer="promo-info"
      data-drawer-size="30"
      data-drawer-direction="right-to-left"
    >
      <div class="drawer__inner" data-drawer-inner>
        <button data-drawer-close="promo-info">Close</button>
      </div>
      <span class="underlay drawer__underlay" data-drawer-underlay></span>
    </side-drawer>

    Trigger buttons:
    <button data-drawer-open="promo-info">Open</button>
    <button data-drawer-toggle="promo-info">Toggle</button>
    <button data-drawer-close="promo-info">Close</button>

    Supported options:
    - data-drawer-size: "fullscreen", "30", "30%", "100vw", "100vh"
    - data-drawer-direction: "left-to-right" (default), "right-to-left", "bottom-to-top"
  */

  const selectors = {
    drawers: 'side-drawer[data-drawer]',
    drawerInner: '[data-drawer-inner]',
    drawerClose: '[data-drawer-close]',
    underlay: '[data-drawer-underlay]',
    stagger: '[data-stagger-animation]',
    focusable: 'button, [href], select, textarea, [tabindex]:not([tabindex="-1"])',
    drawerTrigger: '[data-drawer-toggle], [data-drawer-open], [data-drawer-close]',
  };

  const classes = {
    animated: 'drawer--animated',
    open: 'is-open',
    closing: 'is-closing',
    isFocused: 'is-focused',
  };

  class SideDrawer extends HTMLElement {
    static get observedAttributes() {
      return ['data-drawer-direction', 'data-drawer-size'];
    }

    constructor() {
      super();

      this.a11y = window.theme?.a11y;
      this.isAnimating = false;
      this.drawerInner = this.querySelector(selectors.drawerInner);
      this.underlay = this.querySelector(selectors.underlay);
      this.triggerButton = null;

      this.staggers = this.querySelectorAll(selectors.stagger);
      this.showDrawer = this.showDrawer.bind(this);
      this.hideDrawer = this.hideDrawer.bind(this);

      SideDrawer.ensureStyles();
      this.applyLayoutOptions();

      this.connectDrawer();
      this.closers();

      SideDrawer.initGlobalDrawerTriggers();
    }

    static initGlobalDrawerTriggers() {
      if (window.theme?.sideDrawerTriggersInitialized) return;

      document.addEventListener('click', (event) => {
        const trigger = event.target.closest(selectors.drawerTrigger);

        if (!trigger) return;

        const isHeaderHamburgerTrigger =
          trigger.getAttribute('data-drawer-toggle') === 'hamburger' &&
          (trigger.classList.contains('header__mobile__hamburger') || Boolean(trigger.closest('header-component')));

        if (isHeaderHamburgerTrigger) return;

        const toggleName = trigger.getAttribute('data-drawer-toggle');
        const openName = trigger.getAttribute('data-drawer-open');
        const closeName = trigger.getAttribute('data-drawer-close');

        let action = '';
        let drawerName = '';

        if (toggleName) {
          action = 'toggle';
          drawerName = toggleName;
        } else if (openName) {
          action = 'open';
          drawerName = openName;
        } else if (closeName) {
          action = 'close';
          drawerName = closeName;
        }

        if (!action || !drawerName) return;

        const drawer = SideDrawer.getDrawerByName(drawerName);

        if (!drawer) return;

        event.preventDefault();

        if (window.a11y) {
          window.a11y.lastElement = trigger;
        }

        drawer.dispatchEvent(
          new CustomEvent(`theme:drawer:${action}`, {
            bubbles: true,
            detail: {
              button: trigger,
            },
          })
        );
      });

      if (!window.theme) window.theme = {};
      window.theme.sideDrawerTriggersInitialized = true;
    }

    static ensureStyles() {
      if (document.getElementById(STYLE_ID)) return;

      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = `
        side-drawer .drawer__inner {
          left: auto;
          right: 100%;
          top: 0;
          z-index: 6001;
          pointer-events: auto;
          transform: translateZ(0);
          will-change: transform, opacity;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          contain: paint;
          width: var(--side-drawer-width, var(--DRAWER-WIDTH));
          max-width: var(--side-drawer-width, var(--DRAWER-WIDTH));
          height: 100%;
        }

        side-drawer .drawer__close {
          position: absolute;
          top: 40px;
          right: 40px;
          z-index: 6002;
        }

        side-drawer.side-drawer--from-right.is-open .drawer__inner {
          animation: sideDrawerInFromRight var(--side-drawer-duration, 0.45s) cubic-bezier(0.22, 1, 0.36, 1);
          animation-fill-mode: forwards;
        }

        side-drawer.side-drawer--from-right.is-closing .drawer__inner {
          animation: sideDrawerOutToRight var(--side-drawer-close-duration, 0.52s) cubic-bezier(0.4, 0, 0.2, 1);
          animation-fill-mode: forwards;
        }

        side-drawer.side-drawer--from-left .drawer__inner {
          left: 100%;
          right: auto;
          border-left: 0;
          border-right: 1px solid var(--border);
        }

        side-drawer.side-drawer--from-left.is-open .drawer__inner {
          animation: sideDrawerInFromLeft var(--side-drawer-duration, 0.45s) cubic-bezier(0.22, 1, 0.36, 1);
          animation-fill-mode: forwards;
        }

        side-drawer.side-drawer--from-left.is-closing .drawer__inner {
          animation: sideDrawerOutToLeft var(--side-drawer-close-duration, 0.52s) cubic-bezier(0.4, 0, 0.2, 1);
          animation-fill-mode: forwards;
        }

        side-drawer.side-drawer--from-bottom .drawer__inner {
          right: 0;
          left: 0;
          top: 100%;
          width: 100%;
          max-width: 100%;
          height: var(--side-drawer-height, 60vh);
          border-left: 0;
          border-top: 1px solid var(--border);
        }

        side-drawer.side-drawer--from-bottom.is-open .drawer__inner {
          animation: sideDrawerInFromBottom var(--side-drawer-duration, 0.45s) cubic-bezier(0.22, 1, 0.36, 1);
          animation-fill-mode: forwards;
        }

        side-drawer.side-drawer--from-bottom.is-closing .drawer__inner {
          animation: sideDrawerOutToBottom var(--side-drawer-close-duration, 0.52s) cubic-bezier(0.4, 0, 0.2, 1);
          animation-fill-mode: forwards;
        }

        @keyframes sideDrawerInFromRight {
          from {
            opacity: 0;
            transform: translate3d(0, 0, 0);
            visibility: hidden;
          }

          to {
            opacity: 1;
            transform: translate3d(100%, 0, 0);
            visibility: unset;
          }
        }

        @keyframes sideDrawerOutToRight {
          from {
            opacity: 1;
            transform: translate3d(100%, 0, 0);
            visibility: unset;
          }

          to {
            opacity: 0;
            transform: translate3d(0, 0, 0);
            visibility: hidden;
          }
        }

        @keyframes sideDrawerInFromLeft {
          from {
            opacity: 0;
            transform: translate3d(0, 0, 0);
            visibility: hidden;
          }

          to {
            opacity: 1;
            transform: translate3d(-100%, 0, 0);
            visibility: unset;
          }
        }

        @keyframes sideDrawerOutToLeft {
          from {
            opacity: 1;
            transform: translate3d(-100%, 0, 0);
            visibility: unset;
          }

          to {
            opacity: 0;
            transform: translate3d(0, 0, 0);
            visibility: hidden;
          }
        }

        @keyframes sideDrawerInFromBottom {
          from {
            opacity: 0;
            transform: translate3d(0, 0, 0);
            visibility: hidden;
          }

          to {
            opacity: 1;
            transform: translate3d(0, -100%, 0);
            visibility: unset;
          }
        }

        @keyframes sideDrawerOutToBottom {
          from {
            opacity: 1;
            transform: translate3d(0, -100%, 0);
            visibility: unset;
          }

          to {
            opacity: 0;
            transform: translate3d(0, 0, 0);
            visibility: hidden;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          side-drawer.is-open .drawer__inner,
          side-drawer.is-closing .drawer__inner {
            animation-duration: 0.01ms;
          }
        }
      `;

      document.head.appendChild(style);
    }

    normalizeSizeValue(sizeValue) {
      if (!sizeValue) return '';

      const value = `${sizeValue}`.trim().toLowerCase();

      if (value === 'fullscreen' || value === '100%' || value === '100vw' || value === '100vh') {
        return 'fullscreen';
      }

      if (/^\d+(\.\d+)?$/.test(value)) {
        return `${value}%`;
      }

      return sizeValue;
    }

    applyLayoutOptions() {
      const direction = (this.dataset.drawerDirection || 'left-to-right').trim().toLowerCase();
      const normalizedSize = this.normalizeSizeValue(this.dataset.drawerSize);

      this.classList.remove('side-drawer--from-right', 'side-drawer--from-left', 'side-drawer--from-bottom');
      this.style.removeProperty('--side-drawer-width');
      this.style.removeProperty('--side-drawer-height');

      if (direction === 'bottom-to-top') {
        this.classList.add('side-drawer--from-bottom');

        if (normalizedSize === 'fullscreen') {
          this.style.setProperty('--side-drawer-height', '100vh');
        } else if (normalizedSize) {
          this.style.setProperty('--side-drawer-height', normalizedSize);
        }

        return;
      }

      if (direction === 'left-to-right') {
        this.classList.add('side-drawer--from-left');
      } else {
        this.classList.add('side-drawer--from-right');
      }

      if (normalizedSize === 'fullscreen') {
        this.style.setProperty('--side-drawer-width', '100vw');
      } else if (normalizedSize) {
        this.style.setProperty('--side-drawer-width', normalizedSize);
      }
    }

    static getDrawerByName(drawerName) {
      const drawers = document.querySelectorAll(selectors.drawers);

      const namedDrawer = [...drawers].find((drawer) => {
        const currentName = drawer.getAttribute('data-drawer') || drawer.id;
        return currentName === drawerName;
      });

      if (namedDrawer) return namedDrawer;

      if (drawers.length === 1) {
        return drawers[0];
      }

      return null;
    }

    connectedCallback() {
      this.applyLayoutOptions();
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (oldValue === newValue) return;
      if (name !== 'data-drawer-direction' && name !== 'data-drawer-size') return;

      this.applyLayoutOptions();
    }

    connectDrawer() {
      this.addEventListener('theme:drawer:toggle', (event) => {
        this.triggerButton = event.detail?.button;

        if (this.classList.contains(classes.open)) {
          this.dispatchEvent(
            new CustomEvent('theme:drawer:close', {
              bubbles: true,
            })
          );
        } else {
          this.dispatchEvent(
            new CustomEvent('theme:drawer:open', {
              bubbles: true,
            })
          );
        }
      });

      this.addEventListener('theme:drawer:close', this.hideDrawer);
      this.addEventListener('theme:drawer:open', this.showDrawer);
      document.addEventListener('theme:cart-drawer:open', this.hideDrawer);
    }

    closers() {
      this.querySelectorAll(selectors.drawerClose)?.forEach((button) => {
        button.addEventListener('click', () => {
          this.hideDrawer();
        });
      });

      document.addEventListener('keyup', (event) => {
        if (event.code !== 'Escape') return;
        this.hideDrawer();
      });

      this.underlay?.addEventListener('click', () => {
        this.hideDrawer();
      });
    }

    showDrawer() {
      if (this.isAnimating) return;

      this.isAnimating = true;

      this.triggerButton?.setAttribute('aria-expanded', true);
      this.classList.add(classes.open, classes.animated);

      document.dispatchEvent(new CustomEvent('theme:scroll:lock', {bubbles: true}));

      if (this.drawerInner && this.a11y) {
        this.a11y.removeTrapFocus();

        window.theme.waitForAnimationEnd(this.drawerInner).then(() => {
          this.isAnimating = false;

          this.a11y.trapFocus(this.drawerInner, {
            elementToFocus: this.querySelector(selectors.focusable),
          });
        });
      } else {
        this.isAnimating = false;
      }
    }

    hideDrawer() {
      if (this.isAnimating || !this.classList.contains(classes.open)) return;

      this.isAnimating = true;

      this.classList.add(classes.closing);
      this.classList.remove(classes.open);

      this.a11y?.removeTrapFocus();

      if (this.triggerButton) {
        this.triggerButton.setAttribute('aria-expanded', false);

        if (document.body.classList.contains(classes.isFocused)) {
          this.triggerButton.focus();
        }
      }

      document.dispatchEvent(new CustomEvent('theme:scroll:unlock', {bubbles: true}));

      if (this.drawerInner) {
        window.theme.waitForAnimationEnd(this.drawerInner).then(() => {
          this.classList.remove(classes.closing, classes.animated);
          this.isAnimating = false;
          document.dispatchEvent(new CustomEvent('theme:sliderule:close', {bubbles: false}));
        });
      } else {
        this.classList.remove(classes.closing, classes.animated);
        this.isAnimating = false;
      }
    }

    disconnectedCallback() {
      document.removeEventListener('theme:cart-drawer:open', this.hideDrawer);
    }
  }

  if (!customElements.get('side-drawer')) {
    customElements.define('side-drawer', SideDrawer);
  }
})();
