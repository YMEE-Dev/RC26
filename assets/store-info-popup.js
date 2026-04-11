(() => {
  const COUNTRY_REDIRECT_OPEN_ATTRIBUTE = 'data-country-redirect-open';
  const COUNTRY_REDIRECT_SHOWN_ATTRIBUTE = 'data-country-redirect-shown';
  const COUNTRY_REDIRECT_OPEN_EVENT = 'theme:country-redirect:opened';

  class StoreInfoPopupCookie {
    constructor(name, hoursToExpire = 24) {
      this.name = String(name || '').trim();
      this.maxAge = Math.max(0, Number(hoursToExpire) * 60 * 60);
    }

    read() {
      if (!this.name) return false;

      const cookiePrefix = `${this.name}=`;
      const cookieValue = document.cookie
        .split('; ')
        .find((row) => row.startsWith(cookiePrefix));

      if (!cookieValue) return false;

      return cookieValue.slice(cookiePrefix.length);
    }

    write(value = 'seen') {
      if (!this.name || !this.maxAge) return;

      let cookieString = `${this.name}=${value}; path=/; max-age=${this.maxAge}; SameSite=Lax`;

      if (window.location.protocol === 'https:') {
        cookieString += '; Secure';
      }

      document.cookie = cookieString;
    }
  }

  class StoreInfoPopup extends HTMLElement {
    connectedCallback() {
      if (this.initialized) return;
      this.initialized = true;

      const init = () => {
        this.dialog = this.querySelector('.store-info-popup__dialog');
        this.scrollableEl = this.querySelector('[data-scroll-lock-scrollable]');
        this.closeButtons = Array.from(this.querySelectorAll('[data-store-info-popup-close]'));
        this.closeButton = this.closeButtons.find((button) => !button.hasAttribute('hidden')) || this.closeButtons[0];
        this.config = this.getConfig();

        if (!this.dialog || !this.config?.enabled) return;

        this.designMode = this.isDesignMode();
        this.cookie = new StoreInfoPopupCookie(this.dialog.dataset.cookieName, 24);

        this.bindEvents();

        if (!this.designMode && this.cookie.read() !== false) {
          return;
        }

        window.setTimeout(() => {
          this.maybeOpen();
        }, 0);
      };

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, {once: true});
      } else {
        init();
      }
    }

    disconnectedCallback() {
      if (this.handleEscape) {
        document.removeEventListener('keydown', this.handleEscape, true);
      }

      if (this.handleCloseClick) {
        this.closeButtons?.forEach((button) => {
          button.removeEventListener('click', this.handleCloseClick);
        });
      }

      if (this.handleBackdropClose) {
        this.dialog?.removeEventListener('click', this.handleBackdropClose);
      }

      if (this.handleCancel) {
        this.dialog?.removeEventListener('cancel', this.handleCancel);
      }

      if (this.handleCountryRedirectOpen) {
        document.removeEventListener(COUNTRY_REDIRECT_OPEN_EVENT, this.handleCountryRedirectOpen);
      }
    }

    isDialogOpen() {
      return Boolean(this.dialog?.open || this.dataset.fallbackOpen === 'true');
    }

    getConfig() {
      const configNode = this.querySelector('[data-store-info-popup-config]');

      if (!configNode) return null;

      try {
        return JSON.parse(configNode.textContent);
      } catch (error) {
        return null;
      }
    }

    isDesignMode() {
      const searchParams = new URLSearchParams(window.location.search);

      return Boolean(
        window.Shopify?.designMode ||
        window.Shopify?.visualPreviewMode ||
        window.theme?.info?.role === 'development' ||
        searchParams.has('preview_theme_id')
      );
    }

    hasCountryRedirectPriority() {
      return (
        document.documentElement.hasAttribute(COUNTRY_REDIRECT_OPEN_ATTRIBUTE) ||
        document.documentElement.hasAttribute(COUNTRY_REDIRECT_SHOWN_ATTRIBUTE)
      );
    }

    bindEvents() {
      if (this.eventsBound) return;
      this.eventsBound = true;

      this.handleCountryRedirectOpen = () => {
        this.blockedByCountryRedirect = true;

        if (this.isDialogOpen()) {
          this.close({skipScrollUnlock: true});
        }
      };

      this.handleCancel = (event) => {
        event.preventDefault();
        this.close();
      };

      this.handleEscape = (event) => {
        if (event.key !== 'Escape') return;
        if (!this.isDialogOpen()) return;
        event.preventDefault();
        event.stopPropagation();
        this.close();
      };

      this.handleCloseClick = () => {
        this.close();
      };

      this.handleBackdropClose = (event) => {
        if (event.target !== this.dialog) return;
        this.close();
      };

      document.addEventListener(COUNTRY_REDIRECT_OPEN_EVENT, this.handleCountryRedirectOpen);
      this.dialog.addEventListener('cancel', this.handleCancel);
      document.addEventListener('keydown', this.handleEscape, true);
      this.closeButtons.forEach((button) => {
        button.addEventListener('click', this.handleCloseClick);
      });
      this.dialog.addEventListener('click', this.handleBackdropClose);
    }

    maybeOpen() {
      if (this.hasAttemptedOpen) return;
      this.hasAttemptedOpen = true;

      if (this.blockedByCountryRedirect || this.hasCountryRedirectPriority()) {
        return;
      }

      this.open();
    }

    open() {
      if (!this.dialog || this.isDialogOpen()) return;

      document.dispatchEvent(
        new CustomEvent('theme:scroll:lock', {
          bubbles: true,
          detail: this.scrollableEl,
        })
      );

      this.dialog.removeAttribute('inert');
      this.dialog.setAttribute('aria-hidden', 'false');

      if (typeof this.dialog.showModal === 'function') {
        try {
          this.dialog.showModal();
        } catch (error) {
          this.dataset.fallbackOpen = 'true';
          this.dialog.setAttribute('open', '');
        }
      } else {
        this.dataset.fallbackOpen = 'true';
        this.dialog.setAttribute('open', '');
      }

      if (!this.designMode) {
        this.cookie.write();
      }

      if (window.theme?.a11y?.trapFocus) {
        window.theme.a11y.lastElement = document.activeElement;
        window.theme.a11y.trapFocus(this.dialog, {
          elementToFocus: this.closeButton || this.scrollableEl || this.dialog,
        });
      } else {
        (this.closeButton || this.scrollableEl || this.dialog).focus?.();
      }
    }

    close({skipScrollUnlock = false} = {}) {
      if (!this.dialog || !this.isDialogOpen()) return;

      if (window.theme?.a11y?.removeTrapFocus) {
        window.theme.a11y.removeTrapFocus();
      }

      this.dialog.setAttribute('aria-hidden', 'true');
      this.dialog.setAttribute('inert', '');

      if (typeof this.dialog.close === 'function' && this.dialog.open) {
        this.dialog.close();
      } else {
        this.dialog.removeAttribute('open');
      }

      delete this.dataset.fallbackOpen;

      if (!skipScrollUnlock && (!window.theme?.hasOpenModals || !window.theme.hasOpenModals())) {
        document.dispatchEvent(
          new CustomEvent('theme:scroll:unlock', {
            bubbles: true,
          })
        );
      }

      if (window.theme?.a11y?.autoFocusLastElement) {
        window.theme.a11y.autoFocusLastElement();
      }
    }
  }

  if (!customElements.get('store-info-popup')) {
    customElements.define('store-info-popup', StoreInfoPopup);
  }
})();
