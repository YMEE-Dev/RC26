
/*
* @license
* Broadcast Theme (c) Presidio Creative
*
* This file is included for advanced development by
* Shopify Agencies.  Modified versions of the theme
* code are not supported by Shopify or Presidio Creative.
*
* In order to use this file you will need to change
* theme.js to theme.dev.js in /layout/theme.liquid
*
*/

(function (scrollLock) {
    'use strict';

    (function() {
        const env = {"NODE_ENV":"production"};
        try {
            if (process) {
                process.env = Object.assign({}, process.env);
                Object.assign(process.env, env);
                return;
            }
        } catch (e) {} // avoid ReferenceError: process is not defined
        globalThis.process = { env:env };
    })();

    window.theme = window.theme || {};

    window.theme.sizes = {
      mobile: 480,
      small: 750,
      large: 990,
      widescreen: 1400,
    };

    window.theme.focusable = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

    window.theme.getWindowWidth = function () {
      return document.documentElement.clientWidth || document.body.clientWidth || window.innerWidth;
    };

    window.theme.getWindowHeight = function () {
      return document.documentElement.clientHeight || document.body.clientHeight || window.innerHeight;
    };

    window.theme.isMobile = function () {
      return window.theme.getWindowWidth() < window.theme.sizes.small;
    };

    const PUB_SUB_EVENTS = {
      cartUpdate: 'cart-update',
      quantityUpdate: 'quantity-update',
      optionValueSelectionChange: 'option-value-selection-change',
      variantChange: 'variant-change',
      cartError: 'cart-error',
    };

    window.theme.PUB_SUB_EVENTS = PUB_SUB_EVENTS;

    let subscribers = {};

    function subscribe$1(eventName, callback) {
      if (subscribers[eventName] === undefined) {
        subscribers[eventName] = [];
      }

      subscribers[eventName] = [...subscribers[eventName], callback];

      return function unsubscribe() {
        subscribers[eventName] = subscribers[eventName].filter((cb) => {
          return cb !== callback;
        });
      };
    }

    function publish$1(eventName, data) {
      if (subscribers[eventName]) {
        const promises = subscribers[eventName].map((callback) => callback(data));
        return Promise.all(promises);
      } else {
        return Promise.resolve();
      }
    }

    window.publish = publish$1;
    window.subscribe = subscribe$1;

    /**
     * Currency Helpers
     * -----------------------------------------------------------------------------
     * A collection of useful functions that help with currency formatting
     *
     * Current contents
     * - formatMoney - Takes an amount in cents and returns it as a formatted dollar value.
     *
     */

    const moneyFormat = '${{amount}}';

    /**
     * Format money values based on your shop currency settings
     * @param  {Number|string} cents - value in cents or dollar amount e.g. 300 cents
     * or 3.00 dollars
     * @param  {String} format - shop money_format setting
     * @return {String} value - formatted value
     */
    window.theme.formatMoney = function (cents, format) {
      if (typeof cents === 'string') {
        cents = cents.replace('.', '');
      }
      let value = '';
      const placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
      const formatString = format || moneyFormat;

      function formatWithDelimiters(number, precision = 2, thousands = ',', decimal = '.') {
        if (isNaN(number) || number == null) {
          return 0;
        }

        number = (number / 100.0).toFixed(precision);

        const parts = number.split('.');
        const dollarsAmount = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, `$1${thousands}`);
        const centsAmount = parts[1] ? decimal + parts[1] : '';

        return dollarsAmount + centsAmount;
      }

      switch (formatString.match(placeholderRegex)[1]) {
        case 'amount':
          value = formatWithDelimiters(cents, 2);
          break;
        case 'amount_no_decimals':
          value = formatWithDelimiters(cents, 0);
          break;
        case 'amount_with_comma_separator':
          value = formatWithDelimiters(cents, 2, '.', ',');
          break;
        case 'amount_no_decimals_with_comma_separator':
          value = formatWithDelimiters(cents, 0, '.', ',');
          break;
        case 'amount_with_apostrophe_separator':
          value = formatWithDelimiters(cents, 2, "'", '.');
          break;
        case 'amount_no_decimals_with_space_separator':
          value = formatWithDelimiters(cents, 0, ' ', '');
          break;
        case 'amount_with_space_separator':
          value = formatWithDelimiters(cents, 2, ' ', ',');
          break;
        case 'amount_with_period_and_space_separator':
          value = formatWithDelimiters(cents, 2, ' ', '.');
          break;
      }

      return formatString.replace(placeholderRegex, value);
    };

    window.theme.debounce = function (fn, time) {
      let timeout;
      return function () {
        // eslint-disable-next-line prefer-rest-params
        if (fn) {
          const functionCall = () => fn.apply(this, arguments);
          clearTimeout(timeout);
          timeout = setTimeout(functionCall, time);
        }
      };
    };

    let screenOrientation = getScreenOrientation();
    let firstLoad = true;

    window.theme.readHeights = function () {
      const h = {};
      h.windowHeight = Math.min(window.screen.height, window.innerHeight);
      h.footerHeight = getHeight('[data-section-type*="footer"]');
      h.headerHeight = getHeight('[data-header-height]');
      h.stickyHeaderHeight = document.querySelector('[data-header-sticky]') ? h.headerHeight : 0;
      h.collectionNavHeight = getHeight('[data-collection-nav]');
      h.logoHeight = getFooterLogoWithPadding();

      return h;
    };

    function setVars() {
      const {windowHeight, headerHeight, logoHeight, footerHeight, collectionNavHeight} = window.theme.readHeights();
      const currentScreenOrientation = getScreenOrientation();

      if (!firstLoad || currentScreenOrientation !== screenOrientation || window.innerWidth > window.theme.sizes.mobile) {
        // Only update the heights on screen orientation change or larger than mobile devices
        document.documentElement.style.setProperty('--full-height', `${windowHeight}px`);
        document.documentElement.style.setProperty('--three-quarters', `${windowHeight * (3 / 4)}px`);
        document.documentElement.style.setProperty('--two-thirds', `${windowHeight * (2 / 3)}px`);
        document.documentElement.style.setProperty('--one-half', `${windowHeight / 2}px`);
        document.documentElement.style.setProperty('--one-third', `${windowHeight / 3}px`);

        // Update the screen orientation state
        screenOrientation = currentScreenOrientation;
        firstLoad = false;
      }

      document.documentElement.style.setProperty('--collection-nav-height', `${collectionNavHeight}px`);
      document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
      document.documentElement.style.setProperty('--footer-height', `${footerHeight}px`);
      document.documentElement.style.setProperty('--content-full', `${windowHeight - headerHeight - logoHeight / 2}px`);
      document.documentElement.style.setProperty('--content-min', `${windowHeight - headerHeight - footerHeight}px`);
    }

    function getScreenOrientation() {
      if (window.matchMedia('(orientation: portrait)').matches) {
        return 'portrait';
      }

      if (window.matchMedia('(orientation: landscape)').matches) {
        return 'landscape';
      }
    }

    function getHeight(selector) {
      const el = document.querySelector(selector);
      if (el) {
        return el.offsetHeight;
      } else {
        return 0;
      }
    }

    function getFooterLogoWithPadding() {
      const height = getHeight('[data-footer-logo]');
      if (height > 0) {
        return height + 20;
      } else {
        return 0;
      }
    }

    setVars();

    window.addEventListener('DOMContentLoaded', setVars);
    document.addEventListener('theme:resize', setVars);
    document.addEventListener('shopify:section:load', setVars);

    function pauseAllMedia() {
      document.querySelectorAll('[data-host="youtube"]').forEach((video) => {
        video.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
      });
      document.querySelectorAll('[data-host="vimeo"]').forEach((video) => {
        video.contentWindow.postMessage('{"method":"pause"}', '*');
      });
      document.querySelectorAll('video').forEach((video) => video.pause());
      document.querySelectorAll('product-model').forEach((model) => {
        if (model.modelViewerUI) model.modelViewerUI.pause();
      });
    }

    window.theme.pauseAllMedia = pauseAllMedia;

    window.theme.scrollTo = (elementTop) => {
      const stickyHeaderHeight = document.querySelector('[data-header-sticky]') ? document.querySelector('[data-header-height]').offsetHeight : 0;

      window.scrollTo({
        top: elementTop + window.scrollY - stickyHeaderHeight,
        left: 0,
        behavior: 'smooth',
      });
    };

    /**
     * A11y Helpers
     * -----------------------------------------------------------------------------
     * A collection of useful functions that help make your theme more accessible
     */

    // Define trapFocusHandlers as a global variable within the module.
    const trapFocusHandlers = {};

    const a11y = {
      /**
       * Moves focus to an HTML element
       * @param {Element} element - The element to focus on.
       * @param {Object} options - Settings unique to your theme.
       * @param {string} options.className - Class name to apply to element on focus.
       */
      forceFocus(element, options) {
        options = options || {};

        var savedTabIndex = element.tabIndex;

        element.tabIndex = -1;
        element.dataset.tabIndex = savedTabIndex;
        element.focus();
        if (typeof options.className !== 'undefined') {
          element.classList.add(options.className);
        }
        element.addEventListener('blur', callback);

        function callback(event) {
          event.target.removeEventListener(event.type, callback);

          element.tabIndex = savedTabIndex;
          delete element.dataset.tabIndex;
          if (typeof options.className !== 'undefined') {
            element.classList.remove(options.className);
          }
        }
      },

      /**
       * Focus the appropriate element based on the URL hash.
       * @param {Object} options - Settings unique to your theme.
       */
      focusHash(options) {
        options = options || {};
        var hash = window.location.hash;
        var element = document.getElementById(hash.slice(1));

        if (element && options.ignore && element.matches(options.ignore)) {
          return false;
        }

        if (hash && element) {
          this.forceFocus(element, options);
        }
      },

      /**
       * Bind in-page links to focus the appropriate element.
       * @param {Object} options - Settings unique to your theme.
       */
      bindInPageLinks(options) {
        options = options || {};
        var links = Array.prototype.slice.call(document.querySelectorAll('a[href^="#"]'));

        function queryCheck(selector) {
          return document.getElementById(selector) !== null;
        }

        return links.filter((link) => {
          if (link.hash === '#' || link.hash === '') {
            return false;
          }

          if (options.ignore && link.matches(options.ignore)) {
            return false;
          }

          if (!queryCheck(link.hash.substr(1))) {
            return false;
          }

          var element = document.querySelector(link.hash);

          if (!element) {
            return false;
          }

          link.addEventListener('click', () => {
            this.forceFocus(element, options);
          });

          return true;
        });
      },

      focusable(container) {
        var elements = Array.prototype.slice.call(
          container.querySelectorAll('[tabindex],' + '[draggable],' + 'a[href],' + 'area,' + 'button:enabled,' + 'input:not([type=hidden]):enabled,' + 'object,' + 'select:enabled,' + 'textarea:enabled')
        );

        return elements.filter((element) => !!((element.offsetWidth || element.offsetHeight || element.getClientRects().length) && this.isVisible(element)));
      },

      trapFocus(container, options) {
        options = options || {};
        var elements = this.focusable(container);
        var elementToFocus = options.elementToFocus || container;
        var first = elements[0];
        var last = elements[elements.length - 1];

        this.removeTrapFocus();

        trapFocusHandlers.focusin = function (event) {
          if (container !== event.target && !container.contains(event.target) && first && first === event.target) {
            first.focus();
          }

          if (event.target !== container && event.target !== last && event.target !== first) return;
          document.addEventListener('keydown', trapFocusHandlers.keydown);
        };

        trapFocusHandlers.focusout = function () {
          document.removeEventListener('keydown', trapFocusHandlers.keydown);
        };

        trapFocusHandlers.keydown = function (event) {
          if (event.code !== 'Tab') return;

          if (event.target === last && !event.shiftKey) {
            event.preventDefault();
            first.focus();
          }

          if ((event.target === container || event.target === first) && event.shiftKey) {
            event.preventDefault();
            last.focus();
          }
        };

        document.addEventListener('focusout', trapFocusHandlers.focusout);
        document.addEventListener('focusin', trapFocusHandlers.focusin);

        this.forceFocus(elementToFocus, options);
      },

      removeTrapFocus() {
        document.removeEventListener('focusin', trapFocusHandlers.focusin);
        document.removeEventListener('focusout', trapFocusHandlers.focusout);
        document.removeEventListener('keydown', trapFocusHandlers.keydown);
      },

      autoFocusLastElement() {
        if (window.a11y.lastElement && document.body.classList.contains('is-focused')) {
          setTimeout(() => {
            window.a11y.lastElement?.focus();
          });
        }
      },

      accessibleLinks(elements, options) {
        if (typeof elements !== 'string') {
          throw new TypeError(elements + ' is not a String.');
        }

        elements = document.querySelectorAll(elements);

        if (elements.length === 0) {
          return;
        }

        options = options || {};
        options.messages = options.messages || {};

        var messages = {
          newWindow: options.messages.newWindow || 'Opens in a new window.',
          external: options.messages.external || 'Opens external website.',
          newWindowExternal: options.messages.newWindowExternal || 'Opens external website in a new window.',
        };

        var prefix = options.prefix || 'a11y';

        var messageSelectors = {
          newWindow: prefix + '-new-window-message',
          external: prefix + '-external-message',
          newWindowExternal: prefix + '-new-window-external-message',
        };

        function generateHTML(messages) {
          var container = document.createElement('ul');
          var htmlMessages = Object.keys(messages).reduce((html, key) => {
            return (html += '<li id=' + messageSelectors[key] + '>' + messages[key] + '</li>');
          }, '');

          container.setAttribute('hidden', true);
          container.innerHTML = htmlMessages;

          document.body.appendChild(container);
        }

        function externalSite(link) {
          return link.hostname !== window.location.hostname;
        }

        elements.forEach((link) => {
          var target = link.getAttribute('target');
          var rel = link.getAttribute('rel');
          var isExternal = externalSite(link);
          var isTargetBlank = target === '_blank';
          var missingRelNoopener = rel === null || rel.indexOf('noopener') === -1;

          if (isTargetBlank && missingRelNoopener) {
            var relValue = rel === null ? 'noopener' : rel + ' noopener';
            link.setAttribute('rel', relValue);
          }

          if (isExternal && isTargetBlank) {
            link.setAttribute('aria-describedby', messageSelectors.newWindowExternal);
          } else if (isExternal) {
            link.setAttribute('aria-describedby', messageSelectors.external);
          } else if (isTargetBlank) {
            link.setAttribute('aria-describedby', messageSelectors.newWindow);
          }
        });

        generateHTML(messages);
      },

      isVisible(el) {
        var style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
      },
    };

    window.theme = window.theme || {};
    window.theme.a11y = a11y;

    window.theme.throttle = (fn, wait) => {
      let prev, next;
      return function invokeFn(...args) {
        const now = Date.now();
        next = clearTimeout(next);
        if (!prev || now - prev >= wait) {
          // eslint-disable-next-line prefer-spread
          fn.apply(null, args);
          prev = now;
        } else {
          next = setTimeout(invokeFn.bind(null, ...args), wait - (now - prev));
        }
      };
    };

    class QuantityInput extends HTMLElement {
      constructor() {
        super();
        this.input = this.querySelector('input');
        this.changeEvent = new Event('change', {bubbles: true});
        this.input.addEventListener('change', this.onInputChange.bind(this));
        this.querySelectorAll('button').forEach((button) => button.addEventListener('click', this.onButtonClick.bind(this)));
      }

      quantityUpdateUnsubscriber = undefined;

      connectedCallback() {
        this.validateQtyRules();
        this.quantityUpdateUnsubscriber = subscribe(theme.PUB_SUB_EVENTS.quantityUpdate, this.validateQtyRules.bind(this));
      }

      disconnectedCallback() {
        if (this.quantityUpdateUnsubscriber) {
          this.quantityUpdateUnsubscriber();
        }
      }

      onInputChange(event) {
        this.validateQtyRules();
        if (this.input && this.input.name === 'updates[]') {
          this.updateCart();
        }
      }

      onButtonClick(event) {
        event.preventDefault();
        const previousValue = this.input.value;
        const button = event.target.nodeName === 'BUTTON' ? event.target : event.target.closest('button');
        const name = button ? button.name : undefined;

        const isIncrease = name === 'increase' || name === 'plus';
        const isDecrease = name === 'decrease' || name === 'minus';

        if (isIncrease) {
          if (parseInt(this.input?.dataset?.min) > parseInt(this.input.step) && this.input.value == 0) {
            this.input.value = this.input.dataset.min;
          } else {
            this.input.stepUp();
          }
        } else if (isDecrease) {
          this.input.stepDown();
        }

        if (previousValue !== this.input.value) this.input.dispatchEvent(this.changeEvent);

        if (this.input?.dataset?.min === previousValue && isDecrease) {
          this.input.value = parseInt(this.input.min);
        }
      }

      validateQtyRules() {
        const value = parseInt(this.input.value);
        if (this.input.min) {
          const buttonMinus = this.querySelector(".quantity__button[name='minus']") || this.querySelector(".quantity__button[name='decrease']");
          if (buttonMinus) buttonMinus.classList.toggle('disabled', parseInt(value) <= parseInt(this.input.min));
        }
        if (this.input.max) {
          const max = parseInt(this.input.max);
          const buttonPlus = this.querySelector(".quantity__button[name='plus']") || this.querySelector(".quantity__button[name='increase']");
          if (buttonPlus) buttonPlus.classList.toggle('disabled', value >= max);
        }
      }

      updateCart() {
        if (!this.input || this.input.value === '') return;
        this.dispatchEvent(
          new CustomEvent('theme:cart:update', {
            bubbles: true,
            detail: {
              id: this.input.dataset.id,
              quantity: this.input.value,
            },
          })
        );
      }
    }

    customElements.define('quantity-input', QuantityInput);

    class HTMLUpdateUtility {
      /**
       * Used to swap an HTML node with a new node.
       * The new node is inserted as a previous sibling to the old node, the old node is hidden, and then the old node is removed.
       *
       * The function currently uses a double buffer approach, but this should be replaced by a view transition once it is more widely supported https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API
       */
      static viewTransition(oldNode, newContent, preProcessCallbacks = [], postProcessCallbacks = []) {
        preProcessCallbacks?.forEach((callback) => callback(newContent));

        const newNodeWrapper = document.createElement('div');
        HTMLUpdateUtility.setInnerHTML(newNodeWrapper, newContent.outerHTML);
        const newNode = newNodeWrapper.firstChild;

        // dedupe IDs
        const uniqueKey = Date.now();
        oldNode.querySelectorAll('[id], [form]').forEach((element) => {
          element.id && (element.id = `${element.id}-${uniqueKey}`);
          element.form && element.setAttribute('form', `${element.form.getAttribute('id')}-${uniqueKey}`);
        });

        oldNode.parentNode.insertBefore(newNode, oldNode);
        oldNode.style.display = 'none';

        postProcessCallbacks?.forEach((callback) => callback(newNode));

        setTimeout(() => oldNode.remove(), 500);
      }

      // Sets inner HTML and reinjects the script tags to allow execution. By default, scripts are disabled when using element.innerHTML.
      static setInnerHTML(element, html) {
        element.innerHTML = html;
        element.querySelectorAll('script').forEach((oldScriptTag) => {
          const newScriptTag = document.createElement('script');
          Array.from(oldScriptTag.attributes).forEach((attribute) => {
            newScriptTag.setAttribute(attribute.name, attribute.value);
          });
          newScriptTag.appendChild(document.createTextNode(oldScriptTag.innerHTML));
          oldScriptTag.parentNode.replaceChild(newScriptTag, oldScriptTag);
        });
      }
    }

    window.HTMLUpdateUtility = HTMLUpdateUtility;

    function appendCartItems() {
      if (document.querySelector('cart-items')) return;

      // Add cart items tag when the cart drawer section is missing so we can still run the JS associated with the error handling
      const cartItems = document.createElement('cart-items');
      document.body.appendChild(cartItems);
    }

    function floatLabels(container) {
      const floats = container.querySelectorAll('.form-field');
      floats.forEach((element) => {
        const label = element.querySelector('label');
        const input = element.querySelector('input, textarea');
        if (label && input) {
          input.addEventListener('keyup', (event) => {
            if (event.target.value !== '') {
              label.classList.add('label--float');
            } else {
              label.classList.remove('label--float');
            }
          });
          if (input.value && input.value.length) {
            label.classList.add('label--float');
          }
        }
      });
    }

    let lastWindowWidth = window.theme.getWindowWidth();
    let lastWindowHeight = window.theme.getWindowHeight();

    function dispatch$1() {
      document.dispatchEvent(
        new CustomEvent('theme:resize', {
          bubbles: true,
        })
      );

      if (lastWindowWidth !== window.theme.getWindowWidth()) {
        document.dispatchEvent(
          new CustomEvent('theme:resize:width', {
            bubbles: true,
          })
        );

        lastWindowWidth = window.theme.getWindowWidth();
      }

      if (lastWindowHeight !== window.theme.getWindowHeight()) {
        document.dispatchEvent(
          new CustomEvent('theme:resize:height', {
            bubbles: true,
          })
        );

        lastWindowHeight = window.theme.getWindowHeight();
      }
    }

    function resizeListener() {
      window.addEventListener(
        'resize',
        window.theme.debounce(function () {
          dispatch$1();
        }, 50)
      );
    }

    let prev = window.scrollY;
    let up = null;
    let down = null;
    let wasUp = null;
    let wasDown = null;
    let scrollLockTimer = 0;

    function dispatch() {
      const position = window.scrollY;
      if (position > prev) {
        down = true;
        up = false;
      } else if (position < prev) {
        down = false;
        up = true;
      } else {
        up = null;
        down = null;
      }
      prev = position;
      document.dispatchEvent(
        new CustomEvent('theme:scroll', {
          detail: {
            up,
            down,
            position,
          },
          bubbles: false,
        })
      );
      if (up && !wasUp) {
        document.dispatchEvent(
          new CustomEvent('theme:scroll:up', {
            detail: {position},
            bubbles: false,
          })
        );
      }
      if (down && !wasDown) {
        document.dispatchEvent(
          new CustomEvent('theme:scroll:down', {
            detail: {position},
            bubbles: false,
          })
        );
      }
      wasDown = down;
      wasUp = up;
    }

    function lock(e) {
      // Prevent body scroll lock race conditions
      setTimeout(() => {
        if (scrollLockTimer) {
          clearTimeout(scrollLockTimer);
        }

        scrollLock.disablePageScroll(e.detail, {
          allowTouchMove: (el) => el.tagName === 'TEXTAREA',
        });

        document.documentElement.setAttribute('data-scroll-locked', '');
      });
    }

    function unlock(e) {
      const timeout = e.detail;

      if (timeout) {
        scrollLockTimer = setTimeout(removeScrollLock, timeout);
      } else {
        removeScrollLock();
      }
    }

    function removeScrollLock() {
      scrollLock.clearQueueScrollLocks();
      scrollLock.enablePageScroll();
      document.documentElement.removeAttribute('data-scroll-locked');
    }

    function scrollListener() {
      let timeout;
      window.addEventListener(
        'scroll',
        function () {
          if (timeout) {
            window.cancelAnimationFrame(timeout);
          }
          timeout = window.requestAnimationFrame(function () {
            dispatch();
          });
        },
        {passive: true}
      );

      window.addEventListener('theme:scroll:lock', lock);
      window.addEventListener('theme:scroll:unlock', unlock);
    }

    const wrap = (toWrap, wrapperClass = '', wrapperOption) => {
      const wrapper = wrapperOption || document.createElement('div');
      wrapper.classList.add(wrapperClass);
      toWrap.parentNode.insertBefore(wrapper, toWrap);
      return wrapper.appendChild(toWrap);
    };

    function wrapElements(container) {
      // Target tables to make them scrollable
      const tableSelectors = '.rte table';
      const tables = container.querySelectorAll(tableSelectors);
      tables.forEach((table) => {
        wrap(table, 'rte__table-wrapper');
        table.setAttribute('data-scroll-lock-scrollable', '');
      });

      // Target iframes to make them responsive
      const iframeSelectors = '.rte iframe[src*="youtube.com/embed"], .rte iframe[src*="player.vimeo"], .rte iframe#admin_bar_iframe';
      const frames = container.querySelectorAll(iframeSelectors);
      frames.forEach((frame) => {
        wrap(frame, 'rte__video-wrapper');
      });
    }

    function isTouchDevice() {
      return 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
    }

    function isTouch() {
      if (isTouchDevice()) {
        document.documentElement.className = document.documentElement.className.replace('no-touch', 'supports-touch');
        window.theme.touch = true;
      } else {
        window.theme.touch = false;
      }
    }

    function ariaToggle(container) {
      const toggleButtons = container.querySelectorAll('[data-aria-toggle]');
      if (toggleButtons.length) {
        toggleButtons.forEach((element) => {
          element.addEventListener('click', function (event) {
            event.preventDefault();
            const currentTarget = event.currentTarget;
            currentTarget.setAttribute('aria-expanded', currentTarget.getAttribute('aria-expanded') == 'false' ? 'true' : 'false');
            const toggleID = currentTarget.getAttribute('aria-controls');
            const toggleElement = document.querySelector(`#${toggleID}`);
            const removeExpandingClass = () => {
              toggleElement.classList.remove('expanding');
              toggleElement.removeEventListener('transitionend', removeExpandingClass);
            };
            const addExpandingClass = () => {
              toggleElement.classList.add('expanding');
              toggleElement.removeEventListener('transitionstart', addExpandingClass);
            };

            toggleElement.addEventListener('transitionstart', addExpandingClass);
            toggleElement.addEventListener('transitionend', removeExpandingClass);

            toggleElement.classList.toggle('expanded');
          });
        });
      }
    }

    function loading() {
      document.body.classList.add('is-loaded');
    }

    const classes$l = {
      loading: 'is-loading',
    };

    const selectors$o = {
      img: 'img.is-loading',
    };

    /*
      Catch images loaded events and add class "is-loaded" to them and their containers
    */
    function loadedImagesEventHook() {
      document.addEventListener(
        'load',
        (e) => {
          if (e.target.tagName.toLowerCase() == 'img' && e.target.classList.contains(classes$l.loading)) {
            e.target.classList.remove(classes$l.loading);
            e.target.parentNode.classList.remove(classes$l.loading);

            if (e.target.parentNode.parentNode.classList.contains(classes$l.loading)) {
              e.target.parentNode.parentNode.classList.remove(classes$l.loading);
            }
          }
        },
        true
      );
    }

    /*
      Remove "is-loading" class to the loaded images and their containers
    */
    function removeLoadingClassFromLoadedImages(container) {
      container.querySelectorAll(selectors$o.img).forEach((img) => {
        if (img.complete) {
          img.classList.remove(classes$l.loading);
          img.parentNode.classList.remove(classes$l.loading);

          if (img.parentNode.parentNode.classList.contains(classes$l.loading)) {
            img.parentNode.parentNode.classList.remove(classes$l.loading);
          }
        }
      });
    }

    const selectors$n = {
      aos: '[data-aos]:not(.aos-animate)',
      aosAnchor: '[data-aos-anchor]',
      aosIndividual: '[data-aos]:not([data-aos-anchor]):not(.aos-animate)',
    };

    const classes$k = {
      aosAnimate: 'aos-animate',
    };

    const observerConfig = {
      attributes: false,
      childList: true,
      subtree: true,
    };

    let anchorContainers = [];

    const mutationCallback = (mutationList) => {
      for (const mutation of mutationList) {
        if (mutation.type === 'childList') {
          const element = mutation.target;
          const elementsToAnimate = element.querySelectorAll(selectors$n.aos);
          const anchors = element.querySelectorAll(selectors$n.aosAnchor);

          if (elementsToAnimate.length) {
            elementsToAnimate.forEach((element) => {
              aosItemObserver.observe(element);
            });
          }

          if (anchors.length) {
            // Get all anchors and attach observers
            initAnchorObservers(anchors);
          }
        }
      }
    };

    /*
      Observe each element that needs to be animated
    */
    const aosItemObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(classes$k.aosAnimate);

            // Stop observing element after it was animated
            observer.unobserve(entry.target);
          }
        });
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      }
    );

    /*
      Observe anchor elements
    */
    const aosAnchorObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.intersectionRatio) {
            const elementsToAnimate = entry.target.querySelectorAll(selectors$n.aos);

            if (elementsToAnimate.length) {
              elementsToAnimate.forEach((item) => {
                item.classList.add(classes$k.aosAnimate);
              });
            }

            // Stop observing anchor element after inner elements were animated
            observer.unobserve(entry.target);

            // Remove the container from the anchorContainers array
            const sectionIndex = anchorContainers.indexOf('#' + entry.target.id);
            if (sectionIndex !== -1) {
              anchorContainers.splice(sectionIndex, 1);
            }
          }
        });
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: [0.1, 0.25, 0.5, 0.75, 1],
      }
    );

    /*
      Watch for mutations in the body and start observing the newly added animated elements and anchors
    */
    function bodyMutationObserver() {
      const bodyObserver = new MutationObserver(mutationCallback);
      bodyObserver.observe(document.body, observerConfig);
    }

    /*
      Observe animated elements that have attribute [data-aos]
    */
    function elementsIntersectionObserver() {
      const elementsToAnimate = document.querySelectorAll(selectors$n.aosIndividual);

      if (elementsToAnimate.length) {
        elementsToAnimate.forEach((element) => {
          aosItemObserver.observe(element);
        });
      }
    }

    /*
      Observe animated elements that have attribute [data-aos]
    */
    function anchorsIntersectionObserver() {
      const anchors = document.querySelectorAll(selectors$n.aosAnchor);

      if (anchors.length) {
        // Get all anchors and attach observers
        initAnchorObservers(anchors);
      }
    }

    function initAnchorObservers(anchors) {
      if (!anchors.length || Shopify.visualPreviewMode) return;

      anchors.forEach((anchor) => {
        const containerId = anchor.dataset.aosAnchor;

        // Avoid adding multiple observers to the same element
        if (containerId && anchorContainers.indexOf(containerId) === -1) {
          const container = document.querySelector(containerId);

          if (container) {
            aosAnchorObserver.observe(container);
            anchorContainers.push(containerId);
          }
        }
      });
    }

    function initAnimations() {
      elementsIntersectionObserver();
      anchorsIntersectionObserver();
      bodyMutationObserver();

      // Remove unloaded section from the anchors array on section:unload event
      document.addEventListener('shopify:section:unload', (e) => {
        const sectionId = '#' + e.target.querySelector('[data-section-id]')?.id;
        const sectionIndex = anchorContainers.indexOf(sectionId);

        if (sectionIndex !== -1) {
          anchorContainers.splice(sectionIndex, 1);
        }
      });
    }

    // Safari requestIdleCallback polyfill
    window.requestIdleCallback =
      window.requestIdleCallback ||
      function (cb) {
        var start = Date.now();
        return setTimeout(function () {
          cb({
            didTimeout: false,
            timeRemaining: function () {
              return Math.max(0, 50 - (Date.now() - start));
            },
          });
        }, 1);
      };
    window.cancelIdleCallback =
      window.cancelIdleCallback ||
      function (id) {
        clearTimeout(id);
      };

    if (window.theme.settings.enableAnimations) {
      initAnimations();
    }

    resizeListener();
    scrollListener();
    isTouch();
    loadedImagesEventHook();

    window.addEventListener('DOMContentLoaded', () => {
      ariaToggle(document);
      floatLabels(document);
      wrapElements(document);
      removeLoadingClassFromLoadedImages(document);
      loading();
      appendCartItems();

      requestIdleCallback(() => {
        if (Shopify.visualPreviewMode) {
          document.documentElement.classList.add('preview-mode');
        }
      });
    });

    document.addEventListener('shopify:section:load', (e) => {
      const container = e.target;
      floatLabels(container);
      wrapElements(container);
      ariaToggle(document);
    });

    const classes$j = {
      focus: 'is-focused',
    };

    const selectors$m = {
      inPageLink: '[data-skip-content]',
      linkesWithOnlyHash: 'a[href="#"]',
    };

    class Accessibility {
      constructor() {
        this.init();
      }

      init() {
        this.a11y = window.theme.a11y;

        // DOM Elements
        this.html = document.documentElement;
        this.body = document.body;
        this.inPageLink = document.querySelector(selectors$m.inPageLink);
        this.linkesWithOnlyHash = document.querySelectorAll(selectors$m.linkesWithOnlyHash);

        // A11Y init methods
        this.a11y.focusHash();
        this.a11y.bindInPageLinks();

        // Events
        this.clickEvents();
        this.focusEvents();
      }

      /**
       * Clicked events accessibility
       *
       * @return  {Void}
       */

      clickEvents() {
        if (this.inPageLink) {
          this.inPageLink.addEventListener('click', (event) => {
            event.preventDefault();
          });
        }

        if (this.linkesWithOnlyHash) {
          this.linkesWithOnlyHash.forEach((item) => {
            item.addEventListener('click', (event) => {
              event.preventDefault();
            });
          });
        }
      }

      /**
       * Focus events
       *
       * @return  {Void}
       */

      focusEvents() {
        document.addEventListener('mousedown', () => {
          this.body.classList.remove(classes$j.focus);
        });

        document.addEventListener('keyup', (event) => {
          if (event.code !== 'Tab') {
            return;
          }

          this.body.classList.add(classes$j.focus);
        });
      }
    }

    window.a11y = new Accessibility();

    /*
      Trigger event after animation completes
    */
    window.theme.waitForAnimationEnd = function (element) {
      return new Promise((resolve) => {
        function onAnimationEnd(event) {
          if (event.target != element) return;

          element.removeEventListener('animationend', onAnimationEnd);
          resolve();
        }

        element?.addEventListener('animationend', onAnimationEnd);
      });
    };

    /*
      Trigger event after all animations complete in a specific section
    */
    window.theme.waitForAllAnimationsEnd = function (section) {
      return new Promise((resolve, rejected) => {
        const animatedElements = section.querySelectorAll('[data-aos]');
        let animationCount = 0;

        function onAnimationEnd(event) {
          animationCount++;

          if (animationCount === animatedElements.length) {
            // All animations have ended
            resolve();
          }

          event.target.removeEventListener('animationend', onAnimationEnd);
        }

        animatedElements.forEach((element) => {
          element.addEventListener('animationend', onAnimationEnd);
        });

        if (!animationCount) rejected();
      });
    };

    function FetchError(object) {
      this.status = object.status || null;
      this.headers = object.headers || null;
      this.json = object.json || null;
      this.body = object.body || null;
    }
    FetchError.prototype = Error.prototype;

    const classes$i = {
      animated: 'is-animated',
      active: 'is-active',
      added: 'is-added',
      disabled: 'is-disabled',
      empty: 'is-empty',
      error: 'has-error',
      headerStuck: 'js__header__stuck',
      hidden: 'is-hidden',
      hiding: 'is-hiding',
      loading: 'is-loading',
      open: 'is-open',
      removed: 'is-removed',
      success: 'is-success',
      visible: 'is-visible',
      expanded: 'is-expanded',
      updated: 'is-updated',
      variantSoldOut: 'variant--soldout',
      variantUnavailable: 'variant--unavailable',
    };

    const selectors$l = {
      apiContent: '[data-api-content]',
      apiLineItems: '[data-api-line-items]',
      apiUpsellItems: '[data-api-upsell-items]',
      apiBundleItems: '[data-api-bundle-items]',
      apiCartPrice: '[data-api-cart-price]',
      animation: '[data-animation]',
      buttonSkipUpsellProduct: '[data-skip-upsell-product]',
      cartBarAdd: '[data-cart-bar-add-to-cart]',
      cartCloseError: '[data-cart-error-close]',
      cartDrawer: 'cart-drawer',
      cartDrawerClose: '[data-cart-drawer-close]',
      cartEmpty: '[data-cart-empty]',
      cartErrors: '[data-cart-errors]',
      cartItemRemove: '[data-item-remove]',
      cartPage: '[data-cart-page]',
      cartForm: '[data-cart-form]',
      cartTermsCheckbox: '[data-cart-acceptance-checkbox]',
      cartCheckoutButtonWrapper: '[data-cart-checkout-buttons]',
      cartCheckoutButton: '[data-cart-checkout-button]',
      cartTotal: '[data-cart-total]',
      checkoutButtons: '[data-checkout-buttons]',
      errorMessage: '[data-error-message]',
      formCloseError: '[data-close-error]',
      formErrorsContainer: '[data-cart-errors-container]',
      formWrapper: '[data-form-wrapper]',
      freeShipping: '[data-free-shipping]',
      freeShippingGraph: '[data-progress-graph]',
      freeShippingProgress: '[data-progress-bar]',
      headerWrapper: '[data-header-wrapper]',
      item: '[data-item]',
      itemsHolder: '[data-items-holder]',
      leftToSpend: '[data-left-to-spend]',
      navDrawer: '[data-drawer]',
      outerSection: '[data-section-id]',
      priceHolder: '[data-cart-price-holder]',
      quickAddHolder: '[data-quick-add-holder]',
      quickAddModal: '[data-quick-add-modal]',
      qtyInput: 'input[name="updates[]"]',
      upsellProductsHolder: '[data-upsell-products]',
      bundleProductsHolder: '[data-bundle-products]',
      upsellWidget: '[data-upsell-widget]',
      bundleWidget: '[data-bundle-widget]',
      termsErrorMessage: '[data-terms-error-message]',
      collapsibleBody: '[data-collapsible-body]',
      discountInput: '[data-discount-input]',
      discountField: '[data-discount-field]',
      discountButton: '[data-apply-discount]',
      discountBody: '[data-discount-body]',
      discountCode: '[data-discount-code]',
      discountErrorMessage: '[data-discount-error-message]',
      removeDiscount: '[data-remove-discount]',
    };

    const attributes$d = {
      cartTotal: 'data-cart-total',
      disabled: 'disabled',
      freeShipping: 'data-free-shipping',
      freeShippingLimit: 'data-free-shipping-limit',
      item: 'data-item',
      itemIndex: 'data-item-index',
      itemTitle: 'data-item-title',
      open: 'open',
      quickAddHolder: 'data-quick-add-holder',
      quickAddVariant: 'data-quick-add-variant',
      scrollLocked: 'data-scroll-locked',
      upsellAutoOpen: 'data-upsell-auto-open',
      name: 'name',
      maxInventoryReached: 'data-max-inventory-reached',
      errorMessagePosition: 'data-error-message-position',
      discountButton: 'data-cart-discount-button',
    };

    class CartItems extends HTMLElement {
      constructor() {
        super();

        this.a11y = window.theme.a11y;
      }

      connectedCallback() {
        // DOM Elements
        this.cartPage = document.querySelector(selectors$l.cartPage);
        this.cartForm = document.querySelector(selectors$l.cartForm);
        this.cartDrawer = document.querySelector(selectors$l.cartDrawer);
        this.cartEmpty = document.querySelector(selectors$l.cartEmpty);
        this.cartTermsCheckbox = document.querySelector(selectors$l.cartTermsCheckbox);
        this.cartCheckoutButtonWrapper = document.querySelector(selectors$l.cartCheckoutButtonWrapper);
        this.cartCheckoutButton = document.querySelector(selectors$l.cartCheckoutButton);
        this.checkoutButtons = document.querySelector(selectors$l.checkoutButtons);
        this.itemsHolder = document.querySelector(selectors$l.itemsHolder);
        this.priceHolder = document.querySelector(selectors$l.priceHolder);
        this.items = document.querySelectorAll(selectors$l.item);
        this.cartTotal = document.querySelector(selectors$l.cartTotal);
        this.freeShipping = document.querySelectorAll(selectors$l.freeShipping);
        this.cartErrorHolder = document.querySelector(selectors$l.cartErrors);
        this.cartCloseErrorMessage = document.querySelector(selectors$l.cartCloseError);
        this.headerWrapper = document.querySelector(selectors$l.headerWrapper);
        this.navDrawer = document.querySelector(selectors$l.navDrawer);
        this.upsellProductsHolder = document.querySelector(selectors$l.upsellProductsHolder);
        this.bundleProductsHolder = document.querySelector(selectors$l.bundleProductsHolder);
        this.subtotal = window.theme.subtotal;
        this.discountInput = document.querySelector(selectors$l.discountInput);
        this.discountField = document.querySelector(selectors$l.discountField);
        this.discountButton = document.querySelector(selectors$l.discountButton);
        this.hasDiscountBlock = !!document.querySelector(selectors$l.discountButton);
        this.discountErrorMessage = document.querySelector(selectors$l.discountErrorMessage);
        this.existingDiscountCodes = [];
        this.discounts = document.querySelectorAll(selectors$l.discountBody);

        // Define Cart object depending on if we have cart drawer or cart page
        this.cart = this.cartDrawer || this.cartPage;

        // Discounts
        if (this.hasDiscountBlock) {
          this.discountButton.addEventListener('click', (event) => {
            event.preventDefault();

            const newDiscountCode = this.discountInput.value.trim();
            this.discountInput.value = '';

            if (newDiscountCode) {
              this.applyDiscount(newDiscountCode);
            }
          });

          // Fill existing discount codes and bind event listeners
          this.bindDiscountEventListeners();
        }

        // Cart events
        this.animateItems = this.animateItems.bind(this);
        this.addToCart = this.addToCart.bind(this);
        this.cartAddEvent = this.cartAddEvent.bind(this);
        this.updateProgress = this.updateProgress.bind(this);
        this.onCartDrawerClose = this.onCartDrawerClose.bind(this);

        // Set global event listeners for "Add to cart" and Announcement bar wheel progress
        document.addEventListener('theme:cart:add', this.cartAddEvent);
        document.addEventListener('theme:announcement:init', this.updateProgress);

        if (theme.settings.cartType == 'drawer') {
          document.addEventListener('theme:cart-drawer:open', this.animateItems);
          document.addEventListener('theme:cart-drawer:close', this.onCartDrawerClose);
        }

        // Upsell or bundle products
        this.skipUpsellProductsArray = [];
        this.skipBundleProductsArray = [];
        this.skipUpsellOrBundleProductEvent();
        this.checkSkippedUpsellOrBundleProductsFromStorage();
        this.toggleCartUpsellOrBundleWidgetVisibility();

        // Free Shipping values
        this.circumference = 28 * Math.PI; // radius - stroke * 4 * PI
        this.freeShippingLimit = this.freeShipping.length ? Number(this.freeShipping[0].getAttribute(attributes$d.freeShippingLimit)) * 100 * window.Shopify.currency.rate : 0;

        this.freeShippingMessageHandle(this.subtotal);
        this.updateProgress();

        this.build = this.build.bind(this);
        this.updateCart = this.updateCart.bind(this);
        this.productAddCallback = this.productAddCallback.bind(this);
        this.formSubmitHandler = window.theme.throttle(this.formSubmitHandler.bind(this), 50);

        if (this.cartPage) {
          this.animateItems();
        }

        if (this.cart) {
          // Checking
          this.hasItemsInCart = this.hasItemsInCart.bind(this);
          this.cartCount = this.getCartItemCount();
        }

        // Set classes
        this.toggleClassesOnContainers = this.toggleClassesOnContainers.bind(this);

        // Flags
        this.totalItems = this.items.length;
        this.showCannotAddMoreInCart = false;
        this.cartUpdateFailed = false;
        this.discountError = false;

        // Cart Events
        this.cartEvents();
        this.cartRemoveEvents();
        this.cartUpdateEvents();

        document.addEventListener('theme:product:add', this.productAddCallback);
        document.addEventListener('theme:product:add-error', this.productAddCallback);
        document.addEventListener('theme:cart:refresh', this.getCart.bind(this));
      }

      disconnectedCallback() {
        document.removeEventListener('theme:cart:add', this.cartAddEvent);
        document.removeEventListener('theme:cart:refresh', this.cartAddEvent);
        document.removeEventListener('theme:announcement:init', this.updateProgress);
        document.removeEventListener('theme:product:add', this.productAddCallback);
        document.removeEventListener('theme:product:add-error', this.productAddCallback);

        if (document.documentElement.hasAttribute(attributes$d.scrollLocked)) {
          document.dispatchEvent(new CustomEvent('theme:scroll:unlock', {bubbles: true}));
        }
      }

      onCartDrawerClose() {
        this.resetAnimatedItems();

        if (this.cartDrawer?.classList.contains(classes$i.open)) {
          this.cart.classList.remove(classes$i.updated);
        }

        this.cartEmpty.classList.remove(classes$i.updated);
        this.cartErrorHolder.classList.remove(classes$i.expanded);
        this.cart.querySelectorAll(selectors$l.animation).forEach((item) => {
          const removeHidingClass = () => {
            item.classList.remove(classes$i.hiding);
            item.removeEventListener('animationend', removeHidingClass);
          };

          item.classList.add(classes$i.hiding);
          item.addEventListener('animationend', removeHidingClass);
        });

        if (this.hasDiscountBlock) {
          this.discountErrorMessage?.classList.add('hidden');
        }
      }

      /**
       * Cart update event hook
       *
       * @return  {Void}
       */

      cartUpdateEvents() {
        this.items = document.querySelectorAll(selectors$l.item);

        this.items.forEach((item) => {
          item.addEventListener('theme:cart:update', (event) => {
            this.updateCart(
              {
                id: event.detail.id,
                quantity: event.detail.quantity,
              },
              item
            );
          });
        });
      }

      /**
       * Cart events
       *
       * @return  {Void}
       */

      cartRemoveEvents() {
        const cartItemRemove = document.querySelectorAll(selectors$l.cartItemRemove);

        cartItemRemove.forEach((button) => {
          const item = button.closest(selectors$l.item);
          button.addEventListener('click', (event) => {
            event.preventDefault();

            if (button.classList.contains(classes$i.disabled)) return;

            this.updateCart(
              {
                id: button.dataset.id,
                quantity: 0,
              },
              item
            );
          });
        });

        if (this.cartCloseErrorMessage) {
          this.cartCloseErrorMessage.addEventListener('click', (event) => {
            event.preventDefault();

            this.cartErrorHolder.classList.remove(classes$i.expanded);
          });
        }
      }

      /**
       * Cart event add product to cart
       *
       * @return  {Void}
       */

      cartAddEvent(event) {
        let formData = '';
        let button = event.detail.button;

        if (button.hasAttribute('disabled')) return;
        const form = button.form || button.closest('form');
        // Validate form

        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }
        formData = new FormData(form);

        if (form !== null && form.querySelector('[type="file"]')) {
          return;
        }
        if (theme.settings.cartType === 'drawer' && this.cartDrawer) {
          event.preventDefault();
        }

        const maxInventoryReached = form.getAttribute(attributes$d.maxInventoryReached);
        const errorMessagePosition = form.getAttribute(attributes$d.errorMessagePosition);
        this.showCannotAddMoreInCart = false;
        if (maxInventoryReached === 'true' && errorMessagePosition === 'cart') {
          this.showCannotAddMoreInCart = true;
        }

        this.addToCart(formData, button);
      }

      /**
       * Bind event listeners for discount elements
       *
       * @return  {Void}
       */
      bindDiscountEventListeners() {
        if (!this.hasDiscountBlock) return;

        this.discounts = document.querySelectorAll(selectors$l.discountBody);

        this.discounts.forEach((discount) => {
          const discountCode = discount.dataset.discountCode;

          if (!this.existingDiscountCodes.includes(discountCode)) {
            this.existingDiscountCodes.push(discountCode);
          }

          // Add event listener to remove discount
          const removeButton = discount.querySelector(selectors$l.removeDiscount);
          if (removeButton) {
            // Remove existing listener to prevent duplicates
            removeButton.removeEventListener('click', this.handleRemoveDiscount);

            // Add new listener
            removeButton.addEventListener('click', (event) => {
              event.preventDefault();
              this.removeDiscount(discountCode);
            });
          }
        });
      }

      applyDiscount(discountCode) {
        if (this.existingDiscountCodes.includes(discountCode)) {
          this.discountErrorMessage.classList.remove('hidden');
          this.discountErrorMessage.textContent = window.theme.strings.discount_already_applied;
          return;
        }

        this.existingDiscountCodes.push(discountCode);
        this.updateCartDiscounts(this.existingDiscountCodes.join(','));
      }

      removeDiscount(discountCode) {
        if (!this.existingDiscountCodes.includes(discountCode)) return;

        this.existingDiscountCodes = this.existingDiscountCodes.filter((code) => code !== discountCode);
        this.updateCartDiscounts(this.existingDiscountCodes.join(','));
      }

      updateCartDiscounts(discountString) {
        const lastAttemptedDiscount = discountString
          .split(',')
          .filter((c) => c)
          .pop()
          ?.trim();

        this.disableCartButtons();
        this.discountErrorMessage.classList.add('hidden');

        fetch(window.theme.routes.cart_update_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            discount: discountString,
          }),
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
          })
          .then((text) => {
            let data;
            try {
              data = JSON.parse(text);
            } catch (e) {
              console.error('Failed to parse cart update response:', text);
              throw new Error('Invalid JSON response from server.');
            }

            if (lastAttemptedDiscount) {
              const wasApplied = data.discount_codes && Array.isArray(data.discount_codes) && data.discount_codes.some((d) => d.code === lastAttemptedDiscount && d.applicable);

              if (!wasApplied) {
                this.discountError = true;
                this.existingDiscountCodes = this.existingDiscountCodes.filter((code) => code !== lastAttemptedDiscount);
              } else {
                this.discountError = false;
              }
            } else {
              this.discountError = false;
            }

            this.getCart();
          })
          .catch((error) => {
            console.log(error);
          });
      }

      /**
       * Cart events
       *
       * @return  {Void}
       */

      cartEvents() {
        if (this.cartTermsCheckbox) {
          this.cartTermsCheckbox.removeEventListener('change', this.formSubmitHandler);
          this.cartCheckoutButtonWrapper.removeEventListener('click', this.formSubmitHandler);
          this.cartForm.removeEventListener('submit', this.formSubmitHandler);

          this.cartTermsCheckbox.addEventListener('change', this.formSubmitHandler);
          this.cartCheckoutButtonWrapper.addEventListener('click', this.formSubmitHandler);
          this.cartForm.addEventListener('submit', this.formSubmitHandler);
        }
      }

      formSubmitHandler() {
        const termsAccepted = document.querySelector(selectors$l.cartTermsCheckbox).checked;
        const termsError = document.querySelector(selectors$l.termsErrorMessage);

        // Disable form submit if terms and conditions are not accepted
        if (!termsAccepted) {
          if (document.querySelector(selectors$l.termsErrorMessage).length > 0) {
            return;
          }

          termsError.innerText = theme.strings.cartAcceptanceError;
          this.cartCheckoutButton.setAttribute(attributes$d.disabled, true);
          termsError.classList.add(classes$i.expanded);
        } else {
          termsError.classList.remove(classes$i.expanded);
          this.cartCheckoutButton.removeAttribute(attributes$d.disabled);
        }
      }

      /**
       * Cart event remove out of stock error
       *
       * @return  {Void}
       */

      formErrorsEvents(errorContainer) {
        const buttonErrorClose = errorContainer.querySelector(selectors$l.formCloseError);
        buttonErrorClose?.addEventListener('click', (e) => {
          e.preventDefault();

          if (errorContainer) {
            errorContainer.classList.remove(classes$i.visible);
          }
        });
      }

      /**
       * Get response from the cart
       *
       * @return  {Void}
       */

      getCart() {
        fetch(theme.routes.cart_url + '?section_id=api-cart-items')
          .then(this.cartErrorsHandler)
          .then((response) => response.text())
          .then((response) => {
            const element = document.createElement('div');
            element.innerHTML = response;

            const cleanResponse = element.querySelector(selectors$l.apiContent);
            this.build(cleanResponse);
          })
          .catch((error) => console.log(error));
      }

      /**
       * Add item(s) to the cart and show the added item(s)
       *
       * @param   {String}  formData
       * @param   {DOM Element}  button
       *
       * @return  {Void}
       */

      addToCart(formData, button) {
        if (this.cart) {
          this.cart.classList.add(classes$i.loading);
        }

        const quickAddHolder = button?.closest(selectors$l.quickAddHolder);

        if (button) {
          button.classList.add(classes$i.loading);
          button.disabled = true;
        }

        if (quickAddHolder) {
          quickAddHolder.classList.add(classes$i.visible);
        }

        fetch(theme.routes.cart_add_url, {
          method: 'POST',
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            Accept: 'application/javascript',
          },
          body: formData,
        })
          .then((response) => {
            return response.json();
          })
          .then((response) => {
            if (response.status) {
              this.addToCartError(response, button);

              if (button) {
                button.classList.remove(classes$i.loading);
                button.disabled = false;
              }

              if (!this.showCannotAddMoreInCart) return;
            }

            if (this.cart) {
              if (button) {
                button.classList.remove(classes$i.loading);
                button.classList.add(classes$i.added);

                button.dispatchEvent(
                  new CustomEvent('theme:product:add', {
                    detail: {
                      response: response,
                      button: button,
                    },
                    bubbles: true,
                  })
                );
              }
              if (theme.settings.cartType === 'page') {
                window.location = theme.routes.cart_url;
              }
              this.getCart();
            } else {
              // Redirect to cart page if "Add to cart" is successful
              window.location = theme.routes.cart_url;
            }
          })
          .catch((error) => {
            this.addToCartError(error, button);
            this.enableCartButtons();
          });
      }

      /**
       * Update cart
       *
       * @param   {Object}  updateData
       *
       * @return  {Void}
       */

      updateCart(updateData = {}, currentItem = null) {
        this.cart.classList.add(classes$i.loading);

        let updatedQuantity = updateData.quantity;
        if (currentItem !== null) {
          if (updatedQuantity) {
            currentItem.classList.add(classes$i.loading);
          } else {
            currentItem.classList.add(classes$i.removed);
          }
        }
        this.disableCartButtons();

        const newItem = this.cart.querySelector(`[${attributes$d.item}="${updateData.id}"]`) || currentItem;
        const lineIndex = newItem?.hasAttribute(attributes$d.itemIndex) ? parseInt(newItem.getAttribute(attributes$d.itemIndex)) : 0;
        const itemTitle = newItem?.hasAttribute(attributes$d.itemTitle) ? newItem.getAttribute(attributes$d.itemTitle) : null;

        if (lineIndex === 0) return;

        const data = {
          line: lineIndex,
          quantity: updatedQuantity,
        };

        fetch(theme.routes.cart_change_url, {
          method: 'post',
          headers: {'Content-Type': 'application/json', Accept: 'application/json'},
          body: JSON.stringify(data),
        })
          .then((response) => {
            return response.text();
          })
          .then((state) => {
            const parsedState = JSON.parse(state);

            if (parsedState.errors) {
              this.cartUpdateFailed = true;
              this.updateErrorText(itemTitle);
              this.toggleErrorMessage();
              this.resetLineItem(currentItem);
              this.enableCartButtons();
              this.bindDiscountEventListeners();

              return;
            }

            this.getCart();
          })
          .catch((error) => {
            console.log(error);
            this.enableCartButtons();
          });
      }

      /**
       * Reset line item initial state
       *
       * @return  {Void}
       */
      resetLineItem(item) {
        const qtyInput = item.querySelector(selectors$l.qtyInput);
        const qty = qtyInput.getAttribute('value');
        qtyInput.value = qty;
        item.classList.remove(classes$i.loading);
      }

      /**
       * Disable cart buttons and inputs
       *
       * @return  {Void}
       */
      disableCartButtons() {
        const inputs = this.cart.querySelectorAll('input');
        const buttons = this.cart.querySelectorAll(`button, ${selectors$l.cartItemRemove}`);

        if (inputs.length) {
          inputs.forEach((item) => {
            item.classList.add(classes$i.disabled);
            item.blur();
            item.disabled = true;
          });
        }

        if (buttons.length) {
          buttons.forEach((item) => {
            item.setAttribute(attributes$d.disabled, true);
          });
        }
      }

      /**
       * Enable cart buttons and inputs
       *
       * @return  {Void}
       */
      enableCartButtons() {
        const inputs = this.cart.querySelectorAll('input');
        const buttons = this.cart.querySelectorAll(`button, ${selectors$l.cartItemRemove}`);

        if (inputs.length) {
          inputs.forEach((item) => {
            item.classList.remove(classes$i.disabled);
            item.disabled = false;
          });
        }

        if (buttons.length) {
          buttons.forEach((item) => {
            item.removeAttribute(attributes$d.disabled);
          });
        }

        this.cart.classList.remove(classes$i.loading);
      }

      /**
       * Update error text
       *
       * @param   {String}  itemTitle
       *
       * @return  {Void}
       */

      updateErrorText(itemTitle) {
        this.cartErrorHolder.querySelector(selectors$l.errorMessage).innerText = itemTitle;
      }

      /**
       * Toggle error message
       *
       * @return  {Void}
       */

      toggleErrorMessage() {
        if (!this.cartErrorHolder) return;

        this.cartErrorHolder.classList.toggle(classes$i.expanded, this.cartUpdateFailed || this.showCannotAddMoreInCart);

        // Reset cart error events flag
        this.showCannotAddMoreInCart = false;
        this.cartUpdateFailed = false;
      }

      /**
       * Handle errors
       *
       * @param   {Object}  response
       *
       * @return  {Object}
       */

      cartErrorsHandler(response) {
        if (!response.ok) {
          return response.json().then(function (json) {
            const e = new FetchError({
              status: response.statusText,
              headers: response.headers,
              json: json,
            });
            throw e;
          });
        }
        return response;
      }

      /**
       * Add to cart error handle
       *
       * @param   {Object}  data
       * @param   {DOM Element/Null} button
       *
       * @return  {Void}
       */

      /**
       * Hide error message container as soon as an item is successfully added to the cart
       */
      hideAddToCartErrorMessage() {
        const holder = this.button.closest(selectors$l.upsellHolder) ? this.button.closest(selectors$l.upsellHolder) : this.button.closest(selectors$l.productForm);
        const errorContainer = holder?.querySelector(selectors$l.formErrorsContainer);

        errorContainer?.classList.remove(classes$i.visible);
      }

      addToCartError(data, button) {
        if (this.showCannotAddMoreInCart) return; // Show error in cart drawer instead of product form

        if (button !== null) {
          const outerContainer = button.closest(selectors$l.outerSection) || button.closest(selectors$l.quickAddHolder) || button.closest(selectors$l.quickAddModal);
          let errorContainer = outerContainer?.querySelector(selectors$l.formErrorsContainer);
          const buttonUpsellHolder = button.closest(selectors$l.quickAddHolder);

          if (buttonUpsellHolder && buttonUpsellHolder.querySelector(selectors$l.formErrorsContainer)) {
            errorContainer = buttonUpsellHolder.querySelector(selectors$l.formErrorsContainer);
          }

          if (errorContainer) {
            let errorMessage = `${data.message}: ${data.description}`;

            if (data.message == data.description) {
              errorMessage = data.message;
            }

            errorContainer.innerHTML = `<div class="errors">${errorMessage}<button type="button" class="errors__close" data-close-error><svg aria-hidden="true" focusable="false" role="presentation" width="24px" height="24px" stroke-width="1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="currentColor" class="icon icon-cancel"><path d="M6.758 17.243L12.001 12m5.243-5.243L12 12m0 0L6.758 6.757M12.001 12l5.243 5.243" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"></path></svg></button></div>`;
            errorContainer.classList.add(classes$i.visible);
            this.formErrorsEvents(errorContainer);
          }

          button.dispatchEvent(
            new CustomEvent('theme:product:add-error', {
              detail: {
                response: data,
                button: button,
              },
              bubbles: true,
            })
          );
        }

        const quickAddHolder = button?.closest(selectors$l.quickAddHolder);

        if (quickAddHolder) {
          quickAddHolder.dispatchEvent(
            new CustomEvent('theme:cart:error', {
              bubbles: true,
              detail: {
                message: data.message,
                description: data.description,
                holder: quickAddHolder,
              },
            })
          );
        }

        this.cart?.classList.remove(classes$i.loading);
      }

      /**
       * Add product to cart events
       *
       * @return  {Void}
       */
      productAddCallback(event) {
        let buttons = [];
        let quickAddHolder = null;
        const hasError = event.type == 'theme:product:add-error';
        const buttonATC = event.detail.button;
        const cartBarButtonATC = document.querySelector(selectors$l.cartBarAdd);

        buttons.push(buttonATC);
        quickAddHolder = buttonATC.closest(selectors$l.quickAddHolder);

        if (cartBarButtonATC) {
          buttons.push(cartBarButtonATC);
        }

        buttons.forEach((button) => {
          button.classList.remove(classes$i.loading);
          if (!hasError) {
            button.classList.add(classes$i.added);
          }
        });

        setTimeout(() => {
          buttons.forEach((button) => {
            button.classList.remove(classes$i.added);
            const isVariantUnavailable =
              button.closest(selectors$l.formWrapper)?.classList.contains(classes$i.variantSoldOut) || button.closest(selectors$l.formWrapper)?.classList.contains(classes$i.variantUnavailable);

            if (!isVariantUnavailable) {
              button.disabled = false;
            }
          });

          quickAddHolder?.classList.remove(classes$i.visible);
        }, 1000);
      }

      /**
       * Toggle classes on different containers and messages
       *
       * @return  {Void}
       */

      toggleClassesOnContainers() {
        const hasItemsInCart = this.hasItemsInCart();

        this.cart.classList.toggle(classes$i.empty, !hasItemsInCart);

        if (!hasItemsInCart && this.cartDrawer) {
          setTimeout(() => {
            this.a11y.trapFocus(this.cartDrawer, {
              elementToFocus: this.cartDrawer.querySelector(selectors$l.cartDrawerClose),
            });
          }, 100);
        }
      }

      /**
       * Build cart depends on results
       *
       * @param   {Object}  data
       *
       * @return  {Void}
       */

      build(data) {
        const cartItemsData = data.querySelector(selectors$l.apiLineItems);
        const upsellItemsData = data.querySelector(selectors$l.apiUpsellItems);
        const bundleItemsData = data.querySelector(selectors$l.apiBundleItems);

        const cartEmptyData = Boolean(cartItemsData === null && upsellItemsData === null && bundleItemsData === null);
        const priceData = data.querySelector(selectors$l.apiCartPrice);
        const cartTotal = data.querySelector(selectors$l.cartTotal);

        if (this.priceHolder && priceData) {
          this.priceHolder.innerHTML = priceData.innerHTML;
        }

        if (cartEmptyData) {
          this.itemsHolder.innerHTML = data.innerHTML;

          if (this.upsellProductsHolder) {
            this.upsellProductsHolder.innerHTML = '';
          }

          if (this.bundleProductsHolder) {
            this.bundleProductsHolder.innerHTML = '';
          }
        } else {
          this.itemsHolder.innerHTML = cartItemsData.innerHTML;

          if (this.upsellProductsHolder) {
            this.upsellProductsHolder.innerHTML = upsellItemsData.innerHTML;
          }

          if (this.bundleProductsHolder) {
            this.bundleProductsHolder.innerHTML = bundleItemsData.innerHTML;
          }

          this.skipUpsellOrBundleProductEvent();
          this.checkSkippedUpsellOrBundleProductsFromStorage();
          this.toggleCartUpsellOrBundleWidgetVisibility();
        }

        this.newTotalItems = cartItemsData && cartItemsData.querySelectorAll(selectors$l.item).length ? cartItemsData.querySelectorAll(selectors$l.item).length : 0;
        this.subtotal = cartTotal && cartTotal.hasAttribute(attributes$d.cartTotal) ? parseInt(cartTotal.getAttribute(attributes$d.cartTotal)) : 0;
        this.cartCount = this.getCartItemCount();

        document.dispatchEvent(
          new CustomEvent('theme:cart:change', {
            bubbles: true,
            detail: {
              cartCount: this.cartCount,
            },
          })
        );

        // Update cart total price
        this.cartTotal.innerHTML = this.subtotal === 0 ? window.theme.strings.free : window.theme.formatMoney(this.subtotal, theme.moneyWithCurrencyFormat);

        if (this.totalItems !== this.newTotalItems) {
          this.totalItems = this.newTotalItems;

          this.toggleClassesOnContainers();
        }

        // Add class "is-updated" line items holder to reduce cart items animation delay via CSS variables
        if (this.cartDrawer?.classList.contains(classes$i.open)) {
          this.cart.classList.add(classes$i.updated);
        }

        // Remove cart loading class
        this.cart.classList.remove(classes$i.loading);

        // Prepare empty cart buttons for animation
        if (!this.hasItemsInCart()) {
          this.cartEmpty.querySelectorAll(selectors$l.animation).forEach((item) => {
            item.classList.remove(classes$i.animated);
          });
        }

        if (this.hasDiscountBlock) {
          if (this.discountField) {
            this.discountField.value = this.existingDiscountCodes.join(',');
          }

          if (this.discountError) {
            this.discountErrorMessage.textContent = window.theme.strings.discount_not_applicable;
            this.discountErrorMessage.classList.remove('hidden');
          } else {
            this.discountErrorMessage.classList.add('hidden');
          }
        }

        this.freeShippingMessageHandle(this.subtotal);
        this.cartRemoveEvents();
        this.cartUpdateEvents();
        this.toggleErrorMessage();
        this.enableCartButtons();
        this.updateProgress();
        this.animateItems();
        this.bindDiscountEventListeners();

        document.dispatchEvent(
          new CustomEvent('theme:product:added', {
            bubbles: true,
          })
        );
      }

      /**
       * Get cart item count
       *
       * @return  {Void}
       */

      getCartItemCount() {
        return Array.from(this.cart.querySelectorAll(selectors$l.qtyInput)).reduce((total, quantityInput) => total + parseInt(quantityInput.value), 0);
      }

      /**
       * Check for items in the cart
       *
       * @return  {Void}
       */

      hasItemsInCart() {
        return this.totalItems > 0;
      }

      /**
       * Show/hide free shipping message
       *
       * @param   {Number}  total
       *
       * @return  {Void}
       */

      freeShippingMessageHandle(total) {
        if (!this.freeShipping.length) return;

        this.freeShipping.forEach((message) => {
          const hasQualifiedShippingMessage = message.hasAttribute(attributes$d.freeShipping) && message.getAttribute(attributes$d.freeShipping) === 'true' && total >= 0;
          message.classList.toggle(classes$i.success, hasQualifiedShippingMessage && total >= this.freeShippingLimit);
        });
      }

      /**
       * Update progress when update cart
       *
       * @return  {Void}
       */

      updateProgress() {
        this.freeShipping = document.querySelectorAll(selectors$l.freeShipping);

        if (!this.freeShipping.length) return;

        const percentValue = isNaN(this.subtotal / this.freeShippingLimit) ? 100 : this.subtotal / this.freeShippingLimit;
        const percent = Math.min(percentValue * 100, 100);
        const dashoffset = this.circumference - ((percent / 100) * this.circumference) / 2;
        const leftToSpend = window.theme.formatMoney(this.freeShippingLimit - this.subtotal, theme.moneyFormat);

        this.freeShipping.forEach((item) => {
          const progressBar = item.querySelector(selectors$l.freeShippingProgress);
          const progressGraph = item.querySelector(selectors$l.freeShippingGraph);
          const leftToSpendMessage = item.querySelector(selectors$l.leftToSpend);

          if (leftToSpendMessage) {
            leftToSpendMessage.innerHTML = leftToSpend.replace('.00', '');
          }

          // Set progress bar value
          if (progressBar) {
            progressBar.value = percent;
          }

          // Set circle progress
          if (progressGraph) {
            progressGraph.style.setProperty('--stroke-dashoffset', `${dashoffset}`);
          }
        });
      }

      /**
       * Skip upsell or bundle product
       */
      skipUpsellOrBundleProductEvent() {
        if (this.upsellProductsHolder === null && this.bundleProductsHolder === null) {
          return;
        }

        const upsellSkipButtons = this.upsellProductsHolder?.querySelectorAll(selectors$l.buttonSkipUpsellProduct) || [];
        const bundleSkipButtons = this.bundleProductsHolder?.querySelectorAll(selectors$l.buttonSkipUpsellProduct) || [];
        const allSkipButtons = [...upsellSkipButtons, ...bundleSkipButtons];

        if (allSkipButtons.length) {
          allSkipButtons.forEach((button) => {
            button.addEventListener('click', (event) => {
              event.preventDefault();

              const productID = button.closest(selectors$l.quickAddHolder).getAttribute(attributes$d.quickAddHolder);
              const isUpsell = !!button.closest(selectors$l.upsellWidget);
              const isBundle = !!button.closest(selectors$l.bundleWidget);

              if (isUpsell && !this.skipUpsellProductsArray.includes(productID)) {
                this.skipUpsellProductsArray.push(productID);
                window.sessionStorage.setItem('skip_upsell_products', this.skipUpsellProductsArray);
                this.removeUpsellOrBundleProduct(productID, 'upsell');
              }

              if (isBundle && !this.skipBundleProductsArray.includes(productID)) {
                this.skipBundleProductsArray.push(productID);
                window.sessionStorage.setItem('skip_bundle_products', this.skipBundleProductsArray);
                this.removeUpsellOrBundleProduct(productID, 'bundle');
              }

              this.toggleCartUpsellOrBundleWidgetVisibility();
            });
          });
        }
      }

      /**
       * Check for skipped upsell or bundle product added to session storage
       */
      checkSkippedUpsellOrBundleProductsFromStorage() {
        const types = [
          {key: 'upsell', storageKey: 'skip_upsell_products', array: this.skipUpsellProductsArray},
          {key: 'bundle', storageKey: 'skip_bundle_products', array: this.skipBundleProductsArray},
        ];

        types.forEach(({key, storageKey, array}) => {
          const skippedItems = window.sessionStorage.getItem(storageKey);
          if (skippedItems) {
            skippedItems.split(',').forEach((productID) => {
              if (!array.includes(productID)) {
                array.push(productID);
              }
              this.removeUpsellOrBundleProduct(productID, key);
            });
          }
        });
      }

      removeUpsellOrBundleProduct(productID, type = 'upsell') {
        const holders = {
          upsell: this.upsellProductsHolder,
          bundle: this.bundleProductsHolder,
        };
        const holder = holders[type];
        if (!holder) return;

        const product = holder.querySelector(`[${attributes$d.quickAddHolder}="${productID}"]`);
        if (product && product.parentNode) {
          product.parentNode.remove();
        }
      }

      /**
       * Show or hide cart upsell or bundle products widget visibility
       */
      toggleCartUpsellOrBundleWidgetVisibility() {
        if (!this.upsellProductsHolder && !this.bundleProductsHolder) return;

        const upsellItems = this.upsellProductsHolder?.querySelectorAll(selectors$l.quickAddHolder);
        const bundleItems = this.bundleProductsHolder?.querySelectorAll(selectors$l.quickAddHolder);
        const upsellWidget = this.upsellProductsHolder?.closest(selectors$l.upsellWidget);
        const bundleWidget = this.bundleProductsHolder?.closest(selectors$l.bundleWidget);

        if (!upsellWidget && !bundleWidget) return;

        // Helper to toggle and auto-open widget
        const toggleWidget = (widget, items, autoOpenAttr) => {
          if (!widget) return;
          widget.classList.toggle(classes$i.hidden, !items.length);
          if (items.length && !widget.hasAttribute(attributes$d.open) && widget.hasAttribute(autoOpenAttr)) {
            widget.setAttribute(attributes$d.open, true);
            const widgetBody = widget.querySelector(selectors$l.collapsibleBody);
            if (widgetBody) {
              widgetBody.style.height = 'auto';
            }
          }
        };

        toggleWidget(upsellWidget, upsellItems, attributes$d.upsellAutoOpen);
        toggleWidget(bundleWidget, bundleItems, attributes$d.upsellAutoOpen);
      }

      /**
       * Remove initially added AOS classes to allow animation on cart drawer open
       *
       * @return  {Void}
       */
      resetAnimatedItems() {
        this.cart.querySelectorAll(selectors$l.animation).forEach((item) => {
          item.classList.remove(classes$i.animated);
          item.classList.remove(classes$i.hiding);
        });
      }

      /**
       * Cart elements opening animation
       *
       * @return  {Void}
       */
      animateItems(e) {
        requestAnimationFrame(() => {
          let cart = this.cart;

          if (e && e.detail && e.detail.target) {
            cart = e.detail.target;
          }

          cart?.querySelectorAll(selectors$l.animation).forEach((item) => {
            item.classList.add(classes$i.animated);
          });
        });
      }
    }

    if (!customElements.get('cart-items')) {
      customElements.define('cart-items', CartItems);
    }

    const attributes$c = {
      count: 'data-cart-count',
      limit: 'data-limit',
    };

    class CartCount extends HTMLElement {
      constructor() {
        super();

        this.cartCount = null;
        this.limit = this.getAttribute(attributes$c.limit);
        this.onCartChangeCallback = this.onCartChange.bind(this);
      }

      connectedCallback() {
        document.addEventListener('theme:cart:change', this.onCartChangeCallback);
      }

      disconnectedCallback() {
        document.addEventListener('theme:cart:change', this.onCartChangeCallback);
      }

      onCartChange(event) {
        this.cartCount = event.detail.cartCount;
        this.update();
      }

      update() {
        if (this.cartCount !== null) {
          this.setAttribute(attributes$c.count, this.cartCount);
          let countValue = this.cartCount;

          if (this.limit && this.cartCount >= this.limit) {
            countValue = '9+';
          }

          this.innerText = countValue;
        }
      }
    }

    if (!customElements.get('cart-count')) {
      customElements.define('cart-count', CartCount);
    }

    const classes$h = {
      open: 'is-open',
      closing: 'is-closing',
      duplicate: 'drawer--duplicate',
      drawerEditorError: 'drawer-editor-error',
    };

    const selectors$k = {
      additionalCheckoutButtons: '.additional-checkout-buttons',
      cartDrawer: 'cart-drawer',
      cartDrawerClose: '[data-cart-drawer-close]',
      cartDrawerInner: '[data-cart-drawer-inner]',
      shopifySection: '.shopify-section',
    };

    const attributes$b = {
      drawerUnderlay: 'data-drawer-underlay',
    };

    class CartDrawer extends HTMLElement {
      constructor() {
        super();

        this.cartDrawerIsOpen = false;

        this.cartDrawerClose = this.querySelector(selectors$k.cartDrawerClose);
        this.cartDrawerInner = this.querySelector(selectors$k.cartDrawerInner);
        this.openCartDrawer = this.openCartDrawer.bind(this);
        this.closeCartDrawer = this.closeCartDrawer.bind(this);
        this.toggleCartDrawer = this.toggleCartDrawer.bind(this);
        this.openCartDrawerOnProductAdded = this.openCartDrawerOnProductAdded.bind(this);
        this.openCartDrawerOnSelect = this.openCartDrawerOnSelect.bind(this);
        this.closeCartDrawerOnDeselect = this.closeCartDrawerOnDeselect.bind(this);
        this.cartDrawerSection = this.closest(selectors$k.shopifySection);
        this.a11y = window.theme.a11y;

        this.closeCartEvents();
      }

      connectedCallback() {
        const drawerSection = this.closest(selectors$k.shopifySection);

        /* Prevent duplicated cart drawers */
        if (window.theme.hasCartDrawer) {
          if (!window.Shopify.designMode) {
            drawerSection.remove();
            return;
          } else {
            const errorMessage = document.createElement('div');
            errorMessage.classList.add(classes$h.drawerEditorError);
            errorMessage.innerText = 'Cart drawer section already exists.';

            if (!this.querySelector(`.${classes$h.drawerEditorError}`)) {
              this.querySelector(selectors$k.cartDrawerInner).append(errorMessage);
            }

            this.classList.add(classes$h.duplicate);
          }
        }

        window.theme.hasCartDrawer = true;

        this.addEventListener('theme:cart-drawer:show', this.openCartDrawer);
        document.addEventListener('theme:cart:toggle', this.toggleCartDrawer);
        document.addEventListener('theme:quick-add:open', this.closeCartDrawer);
        document.addEventListener('theme:product:added', this.openCartDrawerOnProductAdded);
        document.addEventListener('shopify:block:select', this.openCartDrawerOnSelect);
        document.addEventListener('shopify:section:select', this.openCartDrawerOnSelect);
        document.addEventListener('shopify:section:deselect', this.closeCartDrawerOnDeselect);
      }

      disconnectedCallback() {
        document.removeEventListener('theme:product:added', this.openCartDrawerOnProductAdded);
        document.removeEventListener('theme:cart:toggle', this.toggleCartDrawer);
        document.removeEventListener('theme:quick-add:open', this.closeCartDrawer);
        document.removeEventListener('shopify:block:select', this.openCartDrawerOnSelect);
        document.removeEventListener('shopify:section:select', this.openCartDrawerOnSelect);
        document.removeEventListener('shopify:section:deselect', this.closeCartDrawerOnDeselect);

        if (document.querySelectorAll(selectors$k.cartDrawer).length <= 1) {
          window.theme.hasCartDrawer = false;
        }

        appendCartItems();
      }

      /**
       * Open cart drawer when product is added to cart
       *
       * @return  {Void}
       */
      openCartDrawerOnProductAdded() {
        if (!this.cartDrawerIsOpen) {
          this.openCartDrawer();
        }
      }

      /**
       * Open cart drawer on block or section select
       *
       * @return  {Void}
       */
      openCartDrawerOnSelect(e) {
        const cartDrawerSection = e.target.querySelector(selectors$k.shopifySection) || e.target.closest(selectors$k.shopifySection) || e.target;

        if (cartDrawerSection === this.cartDrawerSection) {
          this.openCartDrawer(true);
        }
      }

      /**
       * Close cart drawer on section deselect
       *
       * @return  {Void}
       */
      closeCartDrawerOnDeselect() {
        if (this.cartDrawerIsOpen) {
          this.closeCartDrawer();
        }
      }

      /**
       * Open cart drawer and add class on body
       *
       * @return  {Void}
       */

      openCartDrawer(forceOpen = false) {
        if (!forceOpen && this.classList.contains(classes$h.duplicate)) return;

        this.cartDrawerIsOpen = true;
        this.onBodyClickEvent = this.onBodyClickEvent || this.onBodyClick.bind(this);
        document.body.addEventListener('click', this.onBodyClickEvent);

        document.dispatchEvent(
          new CustomEvent('theme:cart-drawer:open', {
            detail: {
              target: this,
            },
            bubbles: true,
          })
        );
        document.dispatchEvent(new CustomEvent('theme:scroll:lock', {bubbles: true}));

        this.classList.add(classes$h.open);

        // Observe Additional Checkout Buttons
        this.observeAdditionalCheckoutButtons();

        window.theme.waitForAnimationEnd(this.cartDrawerInner).then(() => {
          this.a11y.trapFocus(this, {
            elementToFocus: this.querySelector(selectors$k.cartDrawerClose),
          });
        });
      }

      /**
       * Close cart drawer and remove class on body
       *
       * @return  {Void}
       */

      closeCartDrawer() {
        if (!this.classList.contains(classes$h.open)) return;

        this.classList.add(classes$h.closing);
        this.classList.remove(classes$h.open);

        this.cartDrawerIsOpen = false;

        document.dispatchEvent(
          new CustomEvent('theme:cart-drawer:close', {
            bubbles: true,
          })
        );

        this.a11y.removeTrapFocus();
        this.a11y.autoFocusLastElement();

        document.body.removeEventListener('click', this.onBodyClickEvent);
        document.dispatchEvent(new CustomEvent('theme:scroll:unlock', {bubbles: true}));

        window.theme.waitForAnimationEnd(this.cartDrawerInner).then(() => {
          this.classList.remove(classes$h.closing);
        });
      }

      /**
       * Toggle cart drawer
       *
       * @return  {Void}
       */

      toggleCartDrawer() {
        if (!this.cartDrawerIsOpen) {
          this.openCartDrawer();
        } else {
          this.closeCartDrawer();
        }
      }

      /**
       * Event click to element to close cart drawer
       *
       * @return  {Void}
       */

      closeCartEvents() {
        this.cartDrawerClose.addEventListener('click', (e) => {
          e.preventDefault();
          this.closeCartDrawer();
        });

        this.addEventListener('keyup', (e) => {
          if (e.code === 'Escape') {
            this.closeCartDrawer();
          }
        });
      }

      onBodyClick(e) {
        if (e.target.hasAttribute(attributes$b.drawerUnderlay)) this.closeCartDrawer();
      }

      observeAdditionalCheckoutButtons() {
        // identify an element to observe
        const additionalCheckoutButtons = this.querySelector(selectors$k.additionalCheckoutButtons);
        if (additionalCheckoutButtons) {
          // create a new instance of `MutationObserver` named `observer`,
          // passing it a callback function
          const observer = new MutationObserver(() => {
            this.a11y.trapFocus(this, {
              elementToFocus: this.querySelector(selectors$k.cartDrawerClose),
            });
            observer.disconnect();
          });

          // call `observe()` on that MutationObserver instance,
          // passing it the element to observe, and the options object
          observer.observe(additionalCheckoutButtons, {subtree: true, childList: true});
        }
      }
    }

    if (!customElements.get('cart-drawer')) {
      customElements.define('cart-drawer', CartDrawer);
    }

    class CollapsibleElements extends HTMLElement {
      constructor() {
        super();

        this.single = this.hasAttribute('single');
        this.toggle = this.toggle.bind(this);

        // Bind event handlers once and store references
        this.onCollapsibleClickEvent = this.onCollapsibleClick.bind(this);
        this.onTransitionEndEvent = this.onTransitionEnd.bind(this);
      }

      connectedCallback() {
        // Query fresh DOM elements first
        this.collapsibles = this.querySelectorAll('[data-collapsible]');

        this.toggle();
        document.addEventListener('theme:resize:width', this.toggle);

        this.collapsibles.forEach((collapsible) => {
          const trigger = collapsible.querySelector('[data-collapsible-trigger]');
          const body = collapsible.querySelector('[data-collapsible-body]');

          trigger?.addEventListener('click', this.onCollapsibleClickEvent);

          body?.addEventListener('transitionend', this.onTransitionEndEvent);
        });
      }

      disconnectedCallback() {
        document.removeEventListener('theme:resize:width', this.toggle);

        // Only proceed if collapsibles exist
        if (this.collapsibles) {
          this.collapsibles.forEach((collapsible) => {
            const trigger = collapsible.querySelector('[data-collapsible-trigger]');
            const body = collapsible.querySelector('[data-collapsible-body]');

            trigger?.removeEventListener('click', this.onCollapsibleClickEvent);
            body?.removeEventListener('transitionend', this.onTransitionEndEvent);
          });
        }

        // Clear the reference
        this.collapsibles = null;
      }

      toggle() {
        const isDesktopView = !window.theme.isMobile();

        this.collapsibles.forEach((collapsible) => {
          if (!collapsible.hasAttribute('desktop') && !collapsible.hasAttribute('mobile')) return;

          const enableDesktop = collapsible.hasAttribute('desktop') ? collapsible.getAttribute('desktop') : 'true';
          const enableMobile = collapsible.hasAttribute('mobile') ? collapsible.getAttribute('mobile') : 'true';
          const isEligible = (isDesktopView && enableDesktop == 'true') || (!isDesktopView && enableMobile == 'true');
          const body = collapsible.querySelector('[data-collapsible-body]');

          if (isEligible) {
            collapsible.removeAttribute('disabled');
            collapsible.querySelector('[data-collapsible-trigger]').removeAttribute('tabindex');
            collapsible.removeAttribute('open');

            this.setBodyHeight(body, '');
          } else {
            collapsible.setAttribute('disabled', '');
            collapsible.setAttribute('open', true);
            collapsible.querySelector('[data-collapsible-trigger]').setAttribute('tabindex', -1);
          }
        });
      }

      open(collapsible) {
        if (collapsible.getAttribute('open') == 'true') return;

        const body = collapsible.querySelector('[data-collapsible-body]');
        const content = collapsible.querySelector('[data-collapsible-content]');

        collapsible.setAttribute('open', true);

        this.setBodyHeight(body, content.offsetHeight);
      }

      close(collapsible) {
        if (!collapsible.hasAttribute('open')) return;

        const body = collapsible.querySelector('[data-collapsible-body]');
        const content = collapsible.querySelector('[data-collapsible-content]');

        this.setBodyHeight(body, content.offsetHeight);

        collapsible.setAttribute('open', false);

        setTimeout(() => {
          requestAnimationFrame(() => {
            this.setBodyHeight(body, 0);
          });
        });
      }

      setBodyHeight(body, contentHeight) {
        body.style.height = contentHeight !== 'auto' && contentHeight !== '' ? `${contentHeight}px` : contentHeight;
      }

      onTransitionEnd(event) {
        const target = event.target;
        const collapsible = target.closest('[data-collapsible]');
        const body = collapsible.querySelector('[data-collapsible-body]');

        if (target !== body || !collapsible) return;

        if (collapsible.getAttribute('open') == 'true') {
          this.setBodyHeight(body, 'auto');
        }

        if (collapsible.getAttribute('open') == 'false') {
          collapsible.removeAttribute('open');
          this.setBodyHeight(body, '');
        }
      }

      onCollapsibleClick(event) {
        event.preventDefault();

        const trigger = event.target;
        const collapsible = trigger.closest('[data-collapsible]');

        // When we want only one item expanded at the same time
        if (this.single) {
          this.collapsibles.forEach((otherCollapsible) => {
            // if otherCollapsible has attribute open and it's not the one we clicked on, remove the open attribute
            if (otherCollapsible.hasAttribute('open') && otherCollapsible != collapsible) {
              requestAnimationFrame(() => {
                this.close(otherCollapsible);
              });
            }
          });
        }

        if (collapsible.hasAttribute('open')) {
          this.close(collapsible);
        } else {
          this.open(collapsible);
        }

        collapsible.dispatchEvent(
          new CustomEvent('theme:form:sticky', {
            bubbles: true,
            detail: {
              element: 'accordion',
            },
          })
        );
        collapsible.dispatchEvent(
          new CustomEvent('theme:collapsible:toggle', {
            bubbles: true,
          })
        );
      }
    }

    if (!customElements.get('collapsible-elements')) {
      customElements.define('collapsible-elements', CollapsibleElements);
    }

    class DeferredMedia extends HTMLElement {
      constructor() {
        super();

        const poster = this.querySelector('[data-deferred-media-button]');
        poster?.addEventListener('click', this.loadContent.bind(this));
      }

      loadContent(focus = true) {
        window.theme.pauseAllMedia();

        if (!this.getAttribute('loaded')) {
          const content = document.createElement('div');
          content.appendChild(this.querySelector('template').content.firstElementChild.cloneNode(true));
          this.setAttribute('loaded', true);

          const mediaElement = this.appendChild(content.querySelector('video, model-viewer, iframe'));
          if (focus) mediaElement.focus();
          if (mediaElement.nodeName == 'VIDEO' && mediaElement.getAttribute('autoplay')) {
            // Force autoplay on Safari browsers
            mediaElement.play();
          }
        }
      }
    }

    if (!customElements.get('deferred-media')) {
      customElements.define('deferred-media', DeferredMedia);
    }

    window.theme.DeferredMedia = window.theme.DeferredMedia || DeferredMedia;

    /*
      Observe whether or not elements are visible in their container.
      Used for sections with horizontal sliders built by native scrolling
    */

    const classes$g = {
      visible: 'is-visible',
    };

    class IsInView {
      constructor(container, itemSelector) {
        if (!container || !itemSelector) return;

        this.observer = null;
        this.container = container;
        this.itemSelector = itemSelector;

        this.init();
      }

      init() {
        const options = {
          root: this.container,
          threshold: [0.01, 0.5, 0.75, 0.99],
        };

        this.observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.intersectionRatio >= 0.99) {
              entry.target.classList.add(classes$g.visible);
            } else {
              entry.target.classList.remove(classes$g.visible);
            }
          });
        }, options);

        this.container.querySelectorAll(this.itemSelector)?.forEach((item) => {
          this.observer.observe(item);
        });
      }

      destroy() {
        this.observer.disconnect();
      }
    }

    const classes$f = {
      dragging: 'is-dragging',
      enabled: 'is-enabled',
      scrolling: 'is-scrolling',
      visible: 'is-visible',
    };

    const selectors$j = {
      image: 'img, svg',
      productImage: '[data-product-image]',
      slide: '[data-grid-item]',
      slider: '[data-grid-slider]',
    };

    class DraggableSlider {
      constructor(sliderElement) {
        this.slider = sliderElement;
        this.isDown = false;
        this.startX = 0;
        this.scrollLeft = 0;
        this.velX = 0;
        this.scrollAnimation = null;
        this.isScrolling = false;
        this.duration = 800; // Change this value if you want to increase or decrease the velocity

        this.scrollStep = this.scrollStep.bind(this);
        this.scrollToSlide = this.scrollToSlide.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseLeave = this.handleMouseLeave.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseWheel = this.handleMouseWheel.bind(this);

        this.slider.addEventListener('mousedown', this.handleMouseDown);
        this.slider.addEventListener('mouseleave', this.handleMouseLeave);
        this.slider.addEventListener('mouseup', this.handleMouseUp);
        this.slider.addEventListener('mousemove', this.handleMouseMove);
        this.slider.addEventListener('wheel', this.handleMouseWheel, {passive: true});

        this.slider.classList.add(classes$f.enabled);
      }

      handleMouseDown(e) {
        e.preventDefault();
        this.isDown = true;
        this.startX = e.pageX - this.slider.offsetLeft;
        this.scrollLeft = this.slider.scrollLeft;
        this.cancelMomentumTracking();
      }

      handleMouseLeave() {
        if (!this.isDown) return;
        this.isDown = false;
        this.beginMomentumTracking();
      }

      handleMouseUp() {
        this.isDown = false;
        this.beginMomentumTracking();
      }

      handleMouseMove(e) {
        if (!this.isDown) return;
        e.preventDefault();

        const x = e.pageX - this.slider.offsetLeft;
        const ratio = 1; // Increase the number to make it scroll-fast
        const walk = (x - this.startX) * ratio;
        const prevScrollLeft = this.slider.scrollLeft;
        const direction = walk > 0 ? 1 : -1;

        this.slider.classList.add(classes$f.dragging, classes$f.scrolling);
        this.slider.scrollLeft = this.scrollLeft - walk;

        if (this.slider.scrollLeft !== prevScrollLeft) {
          this.velX = this.slider.scrollLeft - prevScrollLeft || direction;
        }
      }

      handleMouseWheel() {
        this.cancelMomentumTracking();
        this.slider.classList.remove(classes$f.scrolling);
      }

      beginMomentumTracking() {
        this.isScrolling = false;
        this.slider.classList.remove(classes$f.dragging);
        this.cancelMomentumTracking();
        this.scrollToSlide();
      }

      cancelMomentumTracking() {
        cancelAnimationFrame(this.scrollAnimation);
      }

      scrollToSlide() {
        if (!this.velX && !this.isScrolling) return;

        const slide = this.slider.querySelector(`${selectors$j.slide}.${classes$f.visible}`);
        if (!slide) return;

        const gap = parseInt(window.getComputedStyle(slide).marginRight) || 0;
        const slideWidth = slide.offsetWidth + gap;
        const targetPosition = slide.offsetLeft;
        const direction = this.velX > 0 ? 1 : -1;
        const slidesToScroll = Math.floor(Math.abs(this.velX) / 100) || 1;

        this.startPosition = this.slider.scrollLeft;
        this.distance = targetPosition - this.startPosition;
        this.startTime = performance.now();
        this.isScrolling = true;

        // Make sure it will move to the next slide if you don't drag far enough
        if (direction < 0 && this.velX < slideWidth) {
          this.distance -= slideWidth * slidesToScroll;
        }

        // Make sure it will move to the previous slide if you don't drag far enough
        if (direction > 0 && this.velX < slideWidth) {
          this.distance += slideWidth * slidesToScroll;
        }

        // Run scroll animation
        this.scrollAnimation = requestAnimationFrame(this.scrollStep);
      }

      scrollStep() {
        const currentTime = performance.now() - this.startTime;
        const scrollPosition = parseFloat(this.easeOutCubic(Math.min(currentTime, this.duration))).toFixed(1);

        this.slider.scrollLeft = scrollPosition;

        if (currentTime < this.duration) {
          this.scrollAnimation = requestAnimationFrame(this.scrollStep);
        } else {
          this.slider.classList.remove(classes$f.scrolling);

          // Reset velocity
          this.velX = 0;
          this.isScrolling = false;
        }
      }

      easeOutCubic(t) {
        t /= this.duration;
        t--;
        return this.distance * (t * t * t + 1) + this.startPosition;
      }

      destroy() {
        this.slider.classList.remove(classes$f.enabled);
        this.slider.removeEventListener('mousedown', this.handleMouseDown);
        this.slider.removeEventListener('mouseleave', this.handleMouseLeave);
        this.slider.removeEventListener('mouseup', this.handleMouseUp);
        this.slider.removeEventListener('mousemove', this.handleMouseMove);
        this.slider.removeEventListener('wheel', this.handleMouseWheel);
      }
    }

    if (!customElements.get('grid-slider')) {
      customElements.define(
        'grid-slider',

        class GridSlider extends HTMLElement {
          constructor() {
            super();

            this.isInitialized = false;
            this.draggableSlider = null;
            this.positionArrows = this.positionArrows.bind(this);
            this.onButtonArrowClick = (e) => this.buttonArrowClickEvent(e);
            this.slidesObserver = null;
            this.firstLastSlidesObserver = null;
            this.isDragging = false;
            this.toggleSlider = this.toggleSlider.bind(this);
          }

          connectedCallback() {
            this.init();
            this.addEventListener('theme:grid-slider:init', this.init);
          }

          init() {
            this.slider = this.querySelector('[data-grid-slider]');
            this.slides = this.querySelectorAll('[data-grid-item]');
            this.buttons = this.querySelectorAll('[data-button-arrow]');
            this.slider.classList.add('scroll-snap-disabled');
            this.toggleSlider();
            document.addEventListener('theme:resize:width', this.toggleSlider);

            window.theme
              .waitForAllAnimationsEnd(this)
              .then(() => {
                this.slider.classList.remove('scroll-snap-disabled');
              })
              .catch(() => {
                this.slider.classList.remove('scroll-snap-disabled');
              });
          }

          toggleSlider() {
            const sliderWidth = this.slider.clientWidth;
            const slidesWidth = this.getSlidesWidth();
            const isEnabled = sliderWidth < slidesWidth;

            if (isEnabled && (!window.theme.isMobile() || !window.theme.touch)) {
              if (this.isInitialized) return;

              this.slidesObserver = new IsInView(this.slider, '[data-grid-item]');

              this.initArrows();
              this.isInitialized = true;

              // Create an instance of DraggableSlider
              this.draggableSlider = new DraggableSlider(this.slider);
            } else {
              this.destroy();
            }
          }

          initArrows() {
            // Create arrow buttons if don't exist
            if (!this.buttons.length) {
              const buttonsWrap = document.createElement('div');
              buttonsWrap.classList.add('slider__arrows');
              buttonsWrap.innerHTML = theme.sliderArrows.prev + theme.sliderArrows.next;

              // Append buttons outside the slider element
              this.append(buttonsWrap);
              this.buttons = this.querySelectorAll('[data-button-arrow]');
              this.buttonPrev = this.querySelector('[data-button-prev]');
              this.buttonNext = this.querySelector('[data-button-next]');
            }

            this.toggleArrowsObserver();

            if (this.hasAttribute('align-arrows')) {
              this.positionArrows();
              this.arrowsResizeObserver();
            }

            this.buttons.forEach((buttonArrow) => {
              buttonArrow.addEventListener('click', this.onButtonArrowClick);
            });
          }

          buttonArrowClickEvent(e) {
            e.preventDefault();

            const firstVisibleSlide = this.slider.querySelector(`[data-grid-item].is-visible`);
            let slide = null;

            if (e.target.hasAttribute('data-button-prev')) {
              slide = firstVisibleSlide?.previousElementSibling;
            }

            if (e.target.hasAttribute('data-button-next')) {
              slide = firstVisibleSlide?.nextElementSibling;
            }

            this.goToSlide(slide);
          }

          removeArrows() {
            this.querySelector('.slider__arrows')?.remove();
          }

          // Go to prev/next slide on arrow click
          goToSlide(slide) {
            if (!slide) return;

            this.slider.scrollTo({
              top: 0,
              left: slide.offsetLeft,
              behavior: 'smooth',
            });
          }

          getSlidesWidth() {
            return this.slider.querySelector('[data-grid-item]')?.clientWidth * this.slider.querySelectorAll('[data-grid-item]').length;
          }

          toggleArrowsObserver() {
            // Add disable class/attribute on prev/next button

            if (this.buttonPrev && this.buttonNext) {
              const slidesCount = this.slides.length;
              const firstSlide = this.slides[0];
              const lastSlide = this.slides[slidesCount - 1];

              const config = {
                attributes: true,
                childList: false,
                subtree: false,
              };

              const callback = (mutationList) => {
                for (const mutation of mutationList) {
                  if (mutation.type === 'attributes') {
                    const slide = mutation.target;
                    const isDisabled = Boolean(slide.classList.contains('is-visible'));

                    if (slide == firstSlide) {
                      this.buttonPrev.disabled = isDisabled;
                    }

                    if (slide == lastSlide) {
                      this.buttonNext.disabled = isDisabled;
                    }
                  }
                }
              };

              if (firstSlide && lastSlide) {
                this.firstLastSlidesObserver = new MutationObserver(callback);
                this.firstLastSlidesObserver.observe(firstSlide, config);
                this.firstLastSlidesObserver.observe(lastSlide, config);
              }
            }
          }

          positionArrows() {
            if (this.hasAttribute('images-widths-different')) {
              const figureElements = this.slider.querySelectorAll('figure');

              const biggestHeight = Math.max(0, ...Array.from(figureElements).map((figure) => figure.clientHeight));

              this.style.setProperty('--button-position', `${biggestHeight / 2}px`);
              return;
            }

            const targetElement =
              this.slider.querySelector('[data-social-video-item]') ||
              this.slider.querySelector('[data-product-image]') ||
              this.slider.querySelector('[data-collection-image]') ||
              this.slider.querySelector('[data-column-image]') ||
              this.slider;

            if (!targetElement) return;

            this.style.setProperty('--button-position', `${targetElement.clientHeight / 2}px`);
          }

          arrowsResizeObserver() {
            document.addEventListener('theme:resize:width', this.positionArrows);
          }

          disconnectedCallback() {
            this.destroy();
            document.removeEventListener('theme:resize:width', this.toggleSlider);
          }

          destroy() {
            this.isInitialized = false;
            this.draggableSlider?.destroy();
            this.draggableSlider = null;
            this.slidesObserver?.destroy();
            this.slidesObserver = null;
            this.removeArrows();

            document.removeEventListener('theme:resize:width', this.positionArrows);
          }
        }
      );
    }

    /*
      Observe whether or not there are open modals that require scroll lock
    */

    window.theme.hasOpenModals = function () {
      const openModals = Boolean(document.querySelectorAll('dialog[open][data-scroll-lock-required]').length);
      const openDrawers = Boolean(document.querySelectorAll('.drawer.is-open').length);

      return openModals || openDrawers;
    };

    if (!customElements.get('header-component')) {
      customElements.define(
        'header-component',
        class HeaderComponent extends HTMLElement {
          constructor() {
            super();

            this.style = this.dataset.style;
            this.desktop = this.querySelector('[data-header-desktop]');
            this.deadLinks = document.querySelectorAll('.navlink[href="#"]');
            this.resizeObserver = null;
            this.checkWidth = this.checkWidth.bind(this);
            this.isSticky = this.hasAttribute('data-header-sticky');

            document.body.classList.toggle('has-header-sticky', this.isSticky);
          }

          connectedCallback() {
            this.killDeadLinks();
            this.drawerToggleEvent();
            this.cartToggleEvent();
            this.initSticky();

            if (this.style !== 'drawer' && this.desktop) {
              this.minWidth = this.getMinWidth();
              this.listenWidth();
            }
          }

          listenWidth() {
            if ('ResizeObserver' in window) {
              this.resizeObserver = new ResizeObserver(this.checkWidth);
              this.resizeObserver.observe(this);
            } else {
              document.addEventListener('theme:resize', this.checkWidth);
            }
          }

          drawerToggleEvent() {
            const button = this.querySelector('[data-drawer-toggle]');

            button.addEventListener('click', () => {
              const drawer = document.querySelector('[data-drawer]');

              drawer.dispatchEvent(
                new CustomEvent('theme:drawer:toggle', {
                  bubbles: false,
                  detail: {
                    button: button,
                  },
                })
              );
            });
          }

          killDeadLinks() {
            this.deadLinks.forEach((el) => {
              el.onclick = (e) => {
                e.preventDefault();
              };
            });
          }

          checkWidth() {
            if (document.body.clientWidth < this.minWidth) {
              this.classList.add('js__show__mobile');

              // Update --header-height CSS variable when switching to a mobile nav
              const {headerHeight} = window.theme.readHeights();
              document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
            } else {
              this.classList.remove('js__show__mobile');
            }
          }

          getMinWidth() {
            const comparitor = document.createElement('div');
            comparitor.classList.add('js__header__clone', 'header-wrapper');
            comparitor.appendChild(this.querySelector('header').cloneNode(true));
            document.body.appendChild(comparitor);
            const widthWrappers = comparitor.querySelectorAll('[data-takes-space-wrapper]');
            let minWidth = 0;
            let spaced = 0;

            widthWrappers.forEach((context) => {
              const wideElements = context.querySelectorAll('[data-child-takes-space]');
              let thisWidth = 0;
              if (wideElements.length === 3) {
                thisWidth = this._sumSplitWidths(wideElements);
              } else {
                thisWidth = this._sumWidths(wideElements);
              }
              if (thisWidth > minWidth) {
                minWidth = thisWidth;
                spaced = wideElements.length * 20;
              }
            });

            document.body.removeChild(comparitor);
            return minWidth + spaced;
          }

          cartToggleEvent() {
            if (theme.settings.cartType !== 'drawer') return;

            this.querySelectorAll('[data-cart-toggle]')?.forEach((button) => {
              button.addEventListener('click', (e) => {
                const cartDrawer = document.querySelector('cart-drawer');

                if (cartDrawer) {
                  e.preventDefault();
                  cartDrawer.dispatchEvent(new CustomEvent('theme:cart-drawer:show'));
                  window.a11y.lastElement = button;
                }
              });
            });
          }

          initSticky() {
            if (!this.isSticky) return;

            this.isStuck = false;
            this.cls = this.classList;
            this.headerOffset = document.querySelector('.page-header')?.offsetTop;
            this.updateHeaderOffset = this.updateHeaderOffset.bind(this);
            this.scrollEvent = (e) => this.onScroll(e);

            this.listen();
            this.stickOnLoad();
          }

          listen() {
            document.addEventListener('theme:scroll', this.scrollEvent);
            document.addEventListener('shopify:section:load', this.updateHeaderOffset);
            document.addEventListener('shopify:section:unload', this.updateHeaderOffset);
          }

          onScroll(e) {
            if (e.detail.down) {
              if (!this.isStuck && e.detail.position > this.headerOffset) {
                this.stickSimple();
              }
            } else if (e.detail.position <= this.headerOffset) {
              this.unstickSimple();
            }
          }

          updateHeaderOffset(event) {
            if (!event.target.classList.contains('shopify-section-group-header-group')) return;

            // Update header offset after any "Header group" section has been changed
            setTimeout(() => {
              this.headerOffset = document.querySelector('.page-header')?.offsetTop;
            });
          }

          stickOnLoad() {
            if (window.scrollY > this.headerOffset) {
              this.stickSimple();
            }
          }

          stickSimple() {
            this.cls.add('js__header__stuck');
            this.isStuck = true;
          }

          unstickSimple() {
            if (!document.documentElement.hasAttribute('data-scroll-locked')) {
              // check for scroll lock
              this.cls.remove('js__header__stuck');
              this.isStuck = false;
            }
          }

          _sumSplitWidths(nodes) {
            let arr = [];
            nodes.forEach((el) => {
              if (el.firstElementChild) {
                arr.push(el.firstElementChild.clientWidth);
              }
            });
            if (arr[0] > arr[2]) {
              arr[2] = arr[0];
            } else {
              arr[0] = arr[2];
            }
            const width = arr.reduce((a, b) => a + b);
            return width;
          }

          _sumWidths(nodes) {
            let width = 0;
            nodes.forEach((el) => {
              width += el.clientWidth;
            });
            return width;
          }

          disconnectedCallback() {
            if ('ResizeObserver' in window) {
              this.resizeObserver?.unobserve(this);
            } else {
              document.removeEventListener('theme:resize', this.checkWidth);
            }

            if (this.isSticky) {
              document.removeEventListener('theme:scroll', this.scrollEvent);
              document.removeEventListener('shopify:section:load', this.updateHeaderOffset);
              document.removeEventListener('shopify:section:unload', this.updateHeaderOffset);
            }
          }
        }
      );
    }

    const selectors$i = {
      link: '[data-top-link]',
      wrapper: '[data-header-wrapper]',
      stagger: '[data-stagger]',
      staggerPair: '[data-stagger-first]',
      staggerAfter: '[data-stagger-second]',
      focusable: 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    };

    const classes$e = {
      isVisible: 'is-visible',
      meganavVisible: 'meganav--visible',
      meganavIsTransitioning: 'meganav--is-transitioning',
    };

    if (!customElements.get('hover-disclosure')) {
      customElements.define(
        'hover-disclosure',

        class HoverDisclosure extends HTMLElement {
          constructor() {
            super();

            this.wrapper = this.closest(selectors$i.wrapper);
            this.key = this.getAttribute('aria-controls');
            this.link = this.querySelector(selectors$i.link);
            this.grandparent = this.classList.contains('grandparent');
            this.disclosure = document.getElementById(this.key);
            this.transitionTimeout = 0;
          }

          connectedCallback() {
            this.setAttribute('aria-haspopup', true);
            this.setAttribute('aria-expanded', false);
            this.setAttribute('aria-controls', this.key);

            this.connectHoverToggle();
            this.handleTablets();
            this.staggerChildAnimations();

            this.addEventListener('theme:disclosure:show', (evt) => {
              this.showDisclosure(evt);
            });
            this.addEventListener('theme:disclosure:hide', (evt) => {
              this.hideDisclosure(evt);
            });
          }

          showDisclosure(e) {
            if (e && e.type && e.type === 'mouseenter') {
              this.wrapper.classList.add(classes$e.meganavIsTransitioning);
            }

            if (this.grandparent) {
              this.wrapper.classList.add(classes$e.meganavVisible);
            } else {
              this.wrapper.classList.remove(classes$e.meganavVisible);
            }
            this.setAttribute('aria-expanded', true);
            this.classList.add(classes$e.isVisible);
            this.disclosure.classList.add(classes$e.isVisible);

            if (this.transitionTimeout) {
              clearTimeout(this.transitionTimeout);
            }

            this.transitionTimeout = setTimeout(() => {
              this.wrapper.classList.remove(classes$e.meganavIsTransitioning);
            }, 200);
          }

          hideDisclosure() {
            this.classList.remove(classes$e.isVisible);
            this.disclosure.classList.remove(classes$e.isVisible);
            this.setAttribute('aria-expanded', false);
            this.wrapper.classList.remove(classes$e.meganavVisible, classes$e.meganavIsTransitioning);
          }

          staggerChildAnimations() {
            const simple = this.querySelectorAll(selectors$i.stagger);
            let step = 50;
            simple.forEach((el, index) => {
              el.style.transitionDelay = `${index * step + 10}ms`;
              step *= 0.95;
            });

            const pairs = this.querySelectorAll(selectors$i.staggerPair);
            pairs.forEach((child, i) => {
              const d1 = i * 100;
              child.style.transitionDelay = `${d1}ms`;
              child.parentElement.querySelectorAll(selectors$i.staggerAfter).forEach((grandchild, i2) => {
                const di1 = i2 + 1;
                const d2 = di1 * 20;
                grandchild.style.transitionDelay = `${d1 + d2}ms`;
              });
            });
          }

          handleTablets() {
            // first click opens the popup, second click opens the link
            this.addEventListener(
              'touchstart',
              function (e) {
                const isOpen = this.classList.contains(classes$e.isVisible);
                if (!isOpen) {
                  e.preventDefault();
                  this.showDisclosure(e);
                }
              }.bind(this),
              {passive: true}
            );
          }

          connectHoverToggle() {
            this.addEventListener('mouseenter', (e) => this.showDisclosure(e));
            this.link.addEventListener('focus', (e) => this.showDisclosure(e));

            this.addEventListener('mouseleave', () => this.hideDisclosure());
            this.addEventListener('focusout', (e) => {
              const inMenu = this.contains(e.relatedTarget);
              if (!inMenu) {
                this.hideDisclosure();
              }
            });
            this.addEventListener('keyup', (evt) => {
              if (evt.code !== 'Escape') {
                return;
              }
              this.hideDisclosure();
            });
          }
        }
      );
    }

    const selectors$h = {
      drawerInner: '[data-drawer-inner]',
      drawerClose: '[data-drawer-close]',
      underlay: '[data-drawer-underlay]',
      stagger: '[data-stagger-animation]',
      wrapper: '[data-header-wrapper]',
      focusable: 'button, [href], select, textarea, [tabindex]:not([tabindex="-1"])',
    };

    const classes$d = {
      animated: 'drawer--animated',
      open: 'is-open',
      closing: 'is-closing',
      isFocused: 'is-focused',
      headerStuck: 'js__header__stuck',
    };

    if (!customElements.get('header-drawer')) {
      customElements.define(
        'header-drawer',
        class HeaderDrawer extends HTMLElement {
          constructor() {
            super();

            this.a11y = window.theme.a11y;
            this.isAnimating = false;
            this.drawer = this;
            this.drawerInner = this.querySelector(selectors$h.drawerInner);
            this.underlay = this.querySelector(selectors$h.underlay);
            this.triggerButton = null;

            this.staggers = this.querySelectorAll(selectors$h.stagger);
            this.showDrawer = this.showDrawer.bind(this);
            this.hideDrawer = this.hideDrawer.bind(this);

            this.connectDrawer();
            this.closers();
          }

          connectDrawer() {
            this.addEventListener('theme:drawer:toggle', (e) => {
              this.triggerButton = e.detail?.button;

              if (this.classList.contains(classes$d.open)) {
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
            this.querySelectorAll(selectors$h.drawerClose)?.forEach((button) => {
              button.addEventListener('click', () => {
                this.hideDrawer();
              });
            });

            document.addEventListener('keyup', (event) => {
              if (event.code !== 'Escape') {
                return;
              }

              this.hideDrawer();
            });

            this.underlay.addEventListener('click', () => {
              this.hideDrawer();
            });
          }

          showDrawer() {
            if (this.isAnimating) return;

            this.isAnimating = true;

            this.triggerButton?.setAttribute('aria-expanded', true);
            this.classList.add(classes$d.open, classes$d.animated);

            document.dispatchEvent(new CustomEvent('theme:scroll:lock', {bubbles: true}));

            if (this.drawerInner) {
              this.a11y.removeTrapFocus();

              window.theme.waitForAnimationEnd(this.drawerInner).then(() => {
                this.isAnimating = false;

                this.a11y.trapFocus(this.drawerInner, {
                  elementToFocus: this.querySelector(selectors$h.focusable),
                });
              });
            }
          }

          hideDrawer() {
            if (this.isAnimating || !this.classList.contains(classes$d.open)) return;

            this.isAnimating = true;

            this.classList.add(classes$d.closing);
            this.classList.remove(classes$d.open);

            this.a11y.removeTrapFocus();

            if (this.triggerButton) {
              this.triggerButton.setAttribute('aria-expanded', false);

              if (document.body.classList.contains(classes$d.isFocused)) {
                this.triggerButton.focus();
              }
            }

            document.dispatchEvent(new CustomEvent('theme:scroll:unlock', {bubbles: true}));

            window.theme.waitForAnimationEnd(this.drawerInner).then(() => {
              this.classList.remove(classes$d.closing, classes$d.animated);

              this.isAnimating = false;

              // Reset menu items state after drawer hiding animation completes
              document.dispatchEvent(new CustomEvent('theme:sliderule:close', {bubbles: false}));
            });
          }

          disconnectedCallback() {
            document.removeEventListener('theme:cart-drawer:open', this.hideDrawer);
          }
        }
      );
    }

    const selectors$g = {
      animates: 'data-animates',
      sliderule: '[data-sliderule]',
      slideruleOpen: 'data-sliderule-open',
      slideruleClose: 'data-sliderule-close',
      sliderulePane: 'data-sliderule-pane',
      drawerContent: '[data-drawer-content]',
      focusable: 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      children: `:scope > [data-animates],
             :scope > * > [data-animates],
             :scope > * > * > [data-animates],
             :scope > * > .sliderule-grid  > *`,
    };

    const classes$c = {
      isVisible: 'is-visible',
      isHiding: 'is-hiding',
      isHidden: 'is-hidden',
      focused: 'is-focused',
      scrolling: 'is-scrolling',
    };

    if (!customElements.get('mobile-sliderule')) {
      customElements.define(
        'mobile-sliderule',

        class HeaderMobileSliderule extends HTMLElement {
          constructor() {
            super();

            this.key = this.id;
            this.sliderule = this.querySelector(selectors$g.sliderule);
            const btnSelector = `[${selectors$g.slideruleOpen}='${this.key}']`;
            this.exitSelector = `[${selectors$g.slideruleClose}='${this.key}']`;
            this.trigger = this.querySelector(btnSelector);
            this.exit = document.querySelectorAll(this.exitSelector);
            this.pane = this.trigger.closest(`[${selectors$g.sliderulePane}]`);
            this.childrenElements = this.querySelectorAll(selectors$g.children);
            this.drawerContent = this.closest(selectors$g.drawerContent);
            this.cachedButton = null;
            this.a11y = window.theme.a11y;

            this.trigger.setAttribute('aria-haspopup', true);
            this.trigger.setAttribute('aria-expanded', false);
            this.trigger.setAttribute('aria-controls', this.key);
            this.closeSliderule = this.closeSliderule.bind(this);

            this.clickEvents();
            this.keyboardEvents();

            document.addEventListener('theme:sliderule:close', this.closeSliderule);
          }

          clickEvents() {
            this.trigger.addEventListener('click', () => {
              this.cachedButton = this.trigger;
              this.showSliderule();
            });
            this.exit.forEach((element) => {
              element.addEventListener('click', () => {
                this.hideSliderule();
              });
            });
          }

          keyboardEvents() {
            this.addEventListener('keyup', (evt) => {
              evt.stopPropagation();
              if (evt.code !== 'Escape') {
                return;
              }

              this.hideSliderule();
            });
          }

          trapFocusSliderule(showSliderule = true) {
            const trapFocusButton = showSliderule ? this.querySelector(this.exitSelector) : this.cachedButton;

            this.a11y.removeTrapFocus();

            if (trapFocusButton && this.drawerContent) {
              this.a11y.trapFocus(this.drawerContent, {
                elementToFocus: document.body.classList.contains(classes$c.focused) ? trapFocusButton : null,
              });
            }
          }

          hideSliderule(close = false) {
            const newPosition = parseInt(this.pane.dataset.sliderulePane, 10) - 1;
            this.pane.setAttribute(selectors$g.sliderulePane, newPosition);
            this.pane.classList.add(classes$c.isHiding);
            this.sliderule.classList.add(classes$c.isHiding);
            const hiddenSelector = close ? `[${selectors$g.animates}].${classes$c.isHidden}` : `[${selectors$g.animates}="${newPosition}"]`;
            const hiddenItems = this.pane.querySelectorAll(hiddenSelector);
            if (hiddenItems.length) {
              hiddenItems.forEach((element) => {
                element.classList.remove(classes$c.isHidden);
              });
            }

            const children = close ? this.pane.querySelectorAll(`.${classes$c.isVisible}, .${classes$c.isHiding}`) : this.childrenElements;
            children.forEach((element, index) => {
              const lastElement = children.length - 1 == index;
              element.classList.remove(classes$c.isVisible);
              if (close) {
                element.classList.remove(classes$c.isHiding);
                this.pane.classList.remove(classes$c.isHiding);
              }
              const removeHidingClass = () => {
                if (parseInt(this.pane.getAttribute(selectors$g.sliderulePane)) === newPosition) {
                  this.sliderule.classList.remove(classes$c.isVisible);
                }
                this.sliderule.classList.remove(classes$c.isHiding);
                this.pane.classList.remove(classes$c.isHiding);

                if (lastElement) {
                  this.a11y.removeTrapFocus();
                  if (!close) {
                    this.trapFocusSliderule(false);
                  }
                }

                element.removeEventListener('animationend', removeHidingClass);
              };

              if (window.theme.settings.enableAnimations) {
                element.addEventListener('animationend', removeHidingClass);
              } else {
                removeHidingClass();
              }
            });
          }

          showSliderule() {
            let lastScrollableFrame = null;
            const parent = this.closest(`.${classes$c.isVisible}`);
            let lastScrollableElement = this.pane;

            if (parent) {
              lastScrollableElement = parent;
            }

            lastScrollableElement.scrollTo({
              top: 0,
              left: 0,
              behavior: 'smooth',
            });

            lastScrollableElement.classList.add(classes$c.scrolling);

            const lastScrollableIsScrolling = () => {
              if (lastScrollableElement.scrollTop <= 0) {
                lastScrollableElement.classList.remove(classes$c.scrolling);
                if (lastScrollableFrame) {
                  cancelAnimationFrame(lastScrollableFrame);
                }
              } else {
                lastScrollableFrame = requestAnimationFrame(lastScrollableIsScrolling);
              }
            };

            lastScrollableFrame = requestAnimationFrame(lastScrollableIsScrolling);

            const oldPosition = parseInt(this.pane.dataset.sliderulePane, 10);
            const newPosition = oldPosition + 1;
            this.sliderule.classList.add(classes$c.isVisible);
            this.pane.setAttribute(selectors$g.sliderulePane, newPosition);

            const hiddenItems = this.pane.querySelectorAll(`[${selectors$g.animates}="${oldPosition}"]`);
            if (hiddenItems.length) {
              hiddenItems.forEach((element, index) => {
                const lastElement = hiddenItems.length - 1 == index;
                element.classList.add(classes$c.isHiding);
                const removeHidingClass = () => {
                  element.classList.remove(classes$c.isHiding);
                  if (parseInt(this.pane.getAttribute(selectors$g.sliderulePane)) !== oldPosition) {
                    element.classList.add(classes$c.isHidden);
                  }

                  if (lastElement) {
                    this.trapFocusSliderule();
                  }
                  element.removeEventListener('animationend', removeHidingClass);
                };

                if (window.theme.settings.enableAnimations) {
                  element.addEventListener('animationend', removeHidingClass);
                } else {
                  removeHidingClass();
                }
              });
            }
          }

          closeSliderule() {
            if (this.pane && this.pane.hasAttribute(selectors$g.sliderulePane) && parseInt(this.pane.getAttribute(selectors$g.sliderulePane)) > 0) {
              this.hideSliderule(true);
              if (parseInt(this.pane.getAttribute(selectors$g.sliderulePane)) > 0) {
                this.pane.setAttribute(selectors$g.sliderulePane, 0);
              }
            }
          }

          disconnectedCallback() {
            document.removeEventListener('theme:sliderule:close', this.closeSliderule);
          }
        }
      );
    }

    const selectors$f = {
      details: 'details',
      popdown: '[data-popdown]',
      popdownClose: '[data-popdown-close]',
      input: 'input:not([type="hidden"])',
      mobileMenu: 'mobile-menu',
    };

    const attributes$a = {
      popdownUnderlay: 'data-popdown-underlay',
      scrollLocked: 'data-scroll-locked',
    };

    const classes$b = {
      open: 'is-open',
    };
    class SearchPopdown extends HTMLElement {
      constructor() {
        super();
        this.popdown = this.querySelector(selectors$f.popdown);
        this.popdownContainer = this.querySelector(selectors$f.details);
        this.popdownClose = this.querySelector(selectors$f.popdownClose);
        this.popdownTransitionCallback = this.popdownTransitionCallback.bind(this);
        this.detailsToggleCallback = this.detailsToggleCallback.bind(this);
        this.mobileMenu = this.closest(selectors$f.mobileMenu);
        this.a11y = window.theme.a11y;
      }

      connectedCallback() {
        this.popdown.addEventListener('transitionend', this.popdownTransitionCallback);
        this.popdownContainer.addEventListener('keyup', (event) => event.code.toUpperCase() === 'ESCAPE' && this.close());
        this.popdownContainer.addEventListener('toggle', this.detailsToggleCallback);
        this.popdownClose.addEventListener('click', this.close.bind(this));
      }

      detailsToggleCallback(event) {
        if (event.target.hasAttribute('open')) {
          this.open();
        }
      }

      popdownTransitionCallback(event) {
        if (event.target !== this.popdown || event.propertyName !== 'opacity') return;

        if (!this.classList.contains('is-open')) {
          this.popdownContainer.removeAttribute('open');
          this.a11y.removeTrapFocus();
        } else {
          // Wait for the 'transform' transition to complete in order to prevent jumping content issues because of the trapFocus
          this.a11y.trapFocus(this.popdown, {
            elementToFocus: this.popdown.querySelector('input:not([type="hidden"])'),
          });
        }
      }

      onBodyClick(event) {
        if (!this.contains(event.target) || event.target.hasAttribute(attributes$a.popdownUnderlay)) this.close();
      }

      open() {
        this.onBodyClickEvent = this.onBodyClickEvent || this.onBodyClick.bind(this);

        document.body.addEventListener('click', this.onBodyClickEvent);

        if (!document.documentElement.hasAttribute(attributes$a.scrollLocked)) {
          document.dispatchEvent(new CustomEvent('theme:scroll:lock', {bubbles: true}));
        }

        requestAnimationFrame(() => {
          this.classList.add(classes$b.open);
        });
      }

      close() {
        this.classList.remove(classes$b.open);

        document.body.removeEventListener('click', this.onBodyClickEvent);

        if (!this.mobileMenu) {
          document.dispatchEvent(new CustomEvent('theme:scroll:unlock', {bubbles: true}));
        }
      }
    }

    if (!customElements.get('header-search-popdown')) {
      customElements.define('header-search-popdown', SearchPopdown);
    }

    const selectors$e = {
      inputSearch: 'input[type="search"]',
      focusedElements: '[aria-selected="true"] a',
      resetButton: 'button[type="reset"]',
    };

    const classes$a = {
      hidden: 'hidden',
    };

    class HeaderSearchForm extends HTMLElement {
      constructor() {
        super();

        this.input = this.querySelector(selectors$e.inputSearch);
        this.resetButton = this.querySelector(selectors$e.resetButton);

        if (this.input) {
          this.input.form.addEventListener('reset', this.onFormReset.bind(this));
          this.input.addEventListener(
            'input',
            window.theme
              .debounce((event) => {
                this.onChange(event);
              }, 300)
              .bind(this)
          );
        }
      }

      toggleResetButton() {
        const resetIsHidden = this.resetButton.classList.contains(classes$a.hidden);
        if (this.input.value.length > 0 && resetIsHidden) {
          this.resetButton.classList.remove(classes$a.hidden);
        } else if (this.input.value.length === 0 && !resetIsHidden) {
          this.resetButton.classList.add(classes$a.hidden);
        }
      }

      onChange() {
        this.toggleResetButton();
      }

      shouldResetForm() {
        return !document.querySelector(selectors$e.focusedElements);
      }

      onFormReset(event) {
        // Prevent default so the form reset doesn't set the value gotten from the url on page load
        event.preventDefault();
        // Don't reset if the user has selected an element on the predictive search dropdown
        if (this.shouldResetForm()) {
          this.input.value = '';
          this.toggleResetButton();
          event.target.querySelector(selectors$e.inputSearch).focus();
        }
      }
    }

    customElements.define('header-search-form', HeaderSearchForm);

    const selectors$d = {
      inputSearch: 'input[type="search"]',
    };

    class MainSearch extends HeaderSearchForm {
      constructor() {
        super();

        this.allSearchInputs = document.querySelectorAll(selectors$d.inputSearch);
        this.setupEventListeners();
      }

      setupEventListeners() {
        let allSearchForms = [];
        this.allSearchInputs.forEach((input) => allSearchForms.push(input.form));
        this.input.addEventListener('focus', this.onInputFocus.bind(this));
        if (allSearchForms.length < 2) return;
        allSearchForms.forEach((form) => form.addEventListener('reset', this.onFormReset.bind(this)));
        this.allSearchInputs.forEach((input) => input.addEventListener('input', this.onInput.bind(this)));
      }

      onFormReset(event) {
        super.onFormReset(event);
        if (super.shouldResetForm()) {
          this.keepInSync('', this.input);
        }
      }

      onInput(event) {
        const target = event.target;
        this.keepInSync(target.value, target);
      }

      onInputFocus() {
        if (window.theme.isMobile()) {
          this.scrollIntoView({behavior: 'smooth'});
        }
      }

      keepInSync(value, target) {
        this.allSearchInputs.forEach((input) => {
          if (input !== target) {
            input.value = value;
          }
        });
      }
    }

    if (!customElements.get('main-search')) {
      customElements.define('main-search', MainSearch);
    }

    const selectors$c = {
      scrollbar: '[data-scrollbar]',
      scrollbarArrowPrev: '[data-scrollbar-arrow-prev]',
      scrollbarArrowNext: '[data-scrollbar-arrow-next]',
    };

    const classes$9 = {
      hidden: 'is-hidden',
    };

    const attributes$9 = {
      scrollbarSlider: 'data-scrollbar-slider',
      scrollbarSlideFullWidth: 'data-scrollbar-slide-fullwidth',
    };

    if (!customElements.get('native-scrollbar')) {
      customElements.define(
        'native-scrollbar',
        class NativeScrollbar extends HTMLElement {
          constructor() {
            super();

            this.scrollbar = this.querySelector(selectors$c.scrollbar);
            this.arrowNext = this.querySelector(selectors$c.scrollbarArrowNext);
            this.arrowPrev = this.querySelector(selectors$c.scrollbarArrowPrev);
            this.toggleNextArrow = this.toggleNextArrow.bind(this);
            this.addEventListener('theme:swatches:loaded', this.toggleNextArrow);
          }

          connectedCallback() {
            document.addEventListener('theme:resize', this.toggleNextArrow);

            if (this.scrollbar.hasAttribute(attributes$9.scrollbarSlider)) {
              this.scrollToVisibleElement();
            }

            if (this.arrowNext && this.arrowPrev) {
              this.events();
              this.toggleNextArrow(); // Show arrow next on page load if there are items to scroll to
            }
          }

          disconnectedCallback() {
            document.removeEventListener('theme:resize', this.toggleNextArrow);
          }

          events() {
            this.arrowNext.addEventListener('click', (event) => {
              event.preventDefault();

              this.goToNext();
            });

            this.arrowPrev.addEventListener('click', (event) => {
              event.preventDefault();

              this.goToPrev();
            });

            this.scrollbar.addEventListener('scroll', () => {
              this.togglePrevArrow();
              this.toggleNextArrow();
            });
          }

          goToNext() {
            const moveWith = this.scrollbar.hasAttribute(attributes$9.scrollbarSlideFullWidth) ? this.scrollbar.getBoundingClientRect().width : this.scrollbar.getBoundingClientRect().width / 2;
            const position = moveWith + this.scrollbar.scrollLeft;

            this.move(position);

            this.arrowPrev.classList.remove(classes$9.hidden);

            this.toggleNextArrow();
          }

          goToPrev() {
            const moveWith = this.scrollbar.hasAttribute(attributes$9.scrollbarSlideFullWidth) ? this.scrollbar.getBoundingClientRect().width : this.scrollbar.getBoundingClientRect().width / 2;
            const position = this.scrollbar.scrollLeft - moveWith;

            this.move(position);

            this.arrowNext.classList.remove(classes$9.hidden);

            this.togglePrevArrow();
          }

          toggleNextArrow() {
            requestAnimationFrame(() => {
              this.arrowNext?.classList.toggle(classes$9.hidden, Math.round(this.scrollbar.scrollLeft + this.scrollbar.getBoundingClientRect().width + 1) >= this.scrollbar.scrollWidth);
            });
          }

          togglePrevArrow() {
            requestAnimationFrame(() => {
              this.arrowPrev.classList.toggle(classes$9.hidden, this.scrollbar.scrollLeft <= 0);
            });
          }

          scrollToVisibleElement() {
            [].forEach.call(this.scrollbar.children, (element) => {
              element.addEventListener('click', (event) => {
                event.preventDefault();

                this.move(element.offsetLeft - element.clientWidth);
              });
            });
          }

          move(offsetLeft, behavior = 'smooth') {
            this.scrollbar.scrollTo({
              top: 0,
              left: offsetLeft,
              behavior: behavior,
            });
          }
        }
      );
    }

    if (!customElements.get('popout-select')) {
      customElements.define(
        'popout-select',
        class Popout extends HTMLElement {
          constructor() {
            super();
          }

          connectedCallback() {
            this.popoutList = this.querySelector('[data-popout-list]');
            this.popoutToggle = this.querySelector('[data-popout-toggle]');
            this.popoutToggleText = this.querySelector('[data-popout-toggle-text]');
            this.popoutInput = this.querySelector('[data-popout-input]') || this.parentNode.querySelector('[data-popout-input]') || this.parentNode.parentNode.querySelector('[data-quantity-input]');

            this.popoutOptions = this.querySelectorAll('[data-popout-option]');
            this.productGridItem = this.popoutList.closest('[data-grid-item]');
            this.fireSubmitEvent = this.hasAttribute('submit');

            this.popupToggleFocusoutEvent = (evt) => this.onPopupToggleFocusout(evt);
            this.popupListFocusoutEvent = (evt) => this.onPopupListFocusout(evt);
            this.popupToggleClickEvent = (evt) => this.onPopupToggleClick(evt);
            this.keyUpEvent = (evt) => this.onKeyUp(evt);
            this.bodyClickEvent = (evt) => this.onBodyClick(evt);

            this._connectOptions();
            this._connectToggle();
            this._onFocusOut();
            this.popupListSetDimensions();
          }

          onPopupToggleClick(evt) {
            const button = evt.currentTarget;
            const ariaExpanded = button.getAttribute('aria-expanded') === 'true';

            if (this.productGridItem) {
              const productGridItemImage = this.productGridItem.querySelector('[data-product-image]');

              if (productGridItemImage) {
                productGridItemImage.classList.toggle('is-visible', !ariaExpanded);
              }

              this.popoutList.style.maxHeight = `${Math.abs(this.popoutToggle.getBoundingClientRect().bottom - this.productGridItem.getBoundingClientRect().bottom)}px`;
            }

            evt.currentTarget.setAttribute('aria-expanded', !ariaExpanded);
            this.popoutList.classList.toggle('popout-list--visible');
            this.popupListSetDimensions();
            this.toggleListPosition();

            document.body.addEventListener('click', this.bodyClickEvent);
          }

          onPopupToggleFocusout(evt) {
            const popoutLostFocus = this.contains(evt.relatedTarget);

            if (!popoutLostFocus) {
              this._hideList();
            }
          }

          onPopupListFocusout(evt) {
            const childInFocus = evt.currentTarget.contains(evt.relatedTarget);
            const isVisible = this.popoutList.classList.contains('popout-list--visible');

            if (isVisible && !childInFocus) {
              this._hideList();
            }
          }

          toggleListPosition() {
            const button = this.querySelector('[data-popout-toggle]');
            const popoutTop = this.getBoundingClientRect().top + this.clientHeight;

            const removeTopClass = () => {
              if (button.getAttribute('aria-expanded') !== 'true') {
                this.popoutList.classList.remove('popout-list--top');
              }

              this.popoutList.removeEventListener('transitionend', removeTopClass);
            };

            if (button.getAttribute('aria-expanded') === 'true') {
              if (window.innerHeight / 2 < popoutTop) {
                this.popoutList.classList.add('popout-list--top');
              }
            } else {
              this.popoutList.addEventListener('transitionend', removeTopClass);
            }
          }

          popupListSetDimensions() {
            this.popoutList.style.setProperty('--max-width', '100vw');
            this.popoutList.style.setProperty('--max-height', '100vh');

            requestAnimationFrame(() => {
              this.popoutList.style.setProperty('--max-width', `${parseInt(document.body.clientWidth - this.popoutList.getBoundingClientRect().left)}px`);
              this.popoutList.style.setProperty('--max-height', `${parseInt(document.body.clientHeight - this.popoutList.getBoundingClientRect().top)}px`);
            });
          }

          popupOptionsClick(evt) {
            const link = evt.target.closest('[data-popout-option]');

            if (link.attributes.href.value === '#') {
              evt.preventDefault();

              const attrValue = evt.currentTarget.hasAttribute('data-value') ? evt.currentTarget.getAttribute('data-value') : '';

              this.popoutInput.value = attrValue;

              // Sync option metadata onto the hidden input so downstream logic can read it
              const listItem = evt.currentTarget.closest('li');
              if (listItem) {
                const optionValueId = listItem.getAttribute('data-option-value-id');
                const productUrl = listItem.getAttribute('data-product-url');
                if (optionValueId) this.popoutInput.setAttribute('data-option-value-id', optionValueId);
                if (productUrl) this.popoutInput.setAttribute('data-product-url', productUrl);
              }

              if (this.popoutInput.disabled) {
                this.popoutInput.removeAttribute('disabled');
              }

              if (this.fireSubmitEvent) {
                this._submitForm(attrValue);
              } else {
                const currentTarget = evt.currentTarget.parentElement;
                const listTargetElement = this.popoutList.querySelector('.is-active');
                const targetAttribute = this.popoutList.querySelector('[aria-current]');

                // Fire a bubbling change event so parent controllers can react
                this.popoutInput.dispatchEvent(new Event('change', {bubbles: true}));

                if (listTargetElement) {
                  listTargetElement.classList.remove('is-active');
                  currentTarget.classList.add('is-active');
                }

                if (this.popoutInput.name == 'quantity' && !currentTarget.nextSibling) {
                  this.classList.add('is-active');
                }

                if (targetAttribute && targetAttribute.hasAttribute('aria-current')) {
                  targetAttribute.removeAttribute('aria-current');
                  evt.currentTarget.setAttribute('aria-current', 'true');
                }

                if (attrValue !== '') {
                  this.popoutToggleText.innerHTML = attrValue;

                  if (this.popoutToggleText.hasAttribute('data-popout-toggle-text') && this.popoutToggleText.getAttribute('data-popout-toggle-text') !== '') {
                    this.popoutToggleText.setAttribute('data-popout-toggle-text', attrValue);
                  }
                }
                this.onPopupToggleFocusout(evt);
                this.onPopupListFocusout(evt);
              }
            }
          }

          onKeyUp(evt) {
            if (evt.code !== 'Escape') {
              return;
            }
            this._hideList();
            this.popoutToggle.focus();
          }

          onBodyClick(evt) {
            const isOption = this.contains(evt.target);
            const isVisible = this.popoutList.classList.contains('popout-list--visible');

            if (isVisible && !isOption) {
              this._hideList();
            }
          }

          _connectToggle() {
            this.popoutToggle.addEventListener('click', this.popupToggleClickEvent);
          }

          _connectOptions() {
            if (this.popoutOptions.length) {
              this.popoutOptions.forEach((element) => {
                element.addEventListener('click', (evt) => this.popupOptionsClick(evt));
              });
            }
          }

          _onFocusOut() {
            this.addEventListener('keyup', this.keyUpEvent);
            this.popoutToggle.addEventListener('focusout', this.popupToggleFocusoutEvent);
            this.popoutList.addEventListener('focusout', this.popupListFocusoutEvent);
          }

          _submitForm() {
            const form = this.closest('form');
            if (form) {
              form.submit();
            }
          }

          _hideList() {
            this.popoutList.classList.remove('popout-list--visible');
            this.popoutToggle.setAttribute('aria-expanded', false);
            this.toggleListPosition();
            document.body.removeEventListener('click', this.bodyClickEvent);
          }
        }
      );
    }

    class PopupCookie {
      constructor(name, value, daysToExpire = 7) {
        const today = new Date();
        const expiresDate = new Date();
        expiresDate.setTime(today.getTime() + 3600000 * 24 * daysToExpire);

        this.config = {
          expires: expiresDate.toGMTString(), // session cookie
          path: '/',
          domain: window.location.hostname,
          sameSite: 'none',
          secure: true,
        };
        this.name = name;
        this.value = value;
      }

      write() {
        const hasCookie = document.cookie.indexOf('; ') !== -1 && !document.cookie.split('; ').find((row) => row.startsWith(this.name));

        if (hasCookie || document.cookie.indexOf('; ') === -1) {
          document.cookie = `${this.name}=${this.value}; expires=${this.config.expires}; path=${this.config.path}; domain=${this.config.domain}; sameSite=${this.config.sameSite}; secure=${this.config.secure}`;
        }
      }

      read() {
        if (document.cookie.indexOf('; ') !== -1 && document.cookie.split('; ').find((row) => row.startsWith(this.name))) {
          const returnCookie = document.cookie
            .split('; ')
            .find((row) => row.startsWith(this.name))
            .split('=')[1];

          return returnCookie;
        } else {
          return false;
        }
      }

      destroy() {
        if (document.cookie.split('; ').find((row) => row.startsWith(this.name))) {
          document.cookie = `${this.name}=null; expires=${this.config.expires}; path=${this.config.path}; domain=${this.config.domain}`;
        }
      }
    }

    const selectors$b = {
      open: '[data-popup-open]',
      close: '[data-popup-close]',
      dialog: 'dialog',
      focusable: 'button, [href], select, textarea, [tabindex]:not([tabindex="-1"])',
      newsletterForm: '[data-newsletter-form]',
      newsletterHeading: '[data-newsletter-heading]',
      newsletterField: '[data-newsletter-field]',
    };

    const attributes$8 = {
      closing: 'closing',
      delay: 'data-popup-delay',
      scrollLock: 'data-scroll-lock-required',
      cookieName: 'data-cookie-name',
      cookieValue: 'data-cookie-value',
      preventTopLayer: 'data-prevent-top-layer',
    };

    const classes$8 = {
      hidden: 'hidden',
      hasValue: 'has-value',
      cartBarVisible: 'cart-bar-visible',
      isVisible: 'is-visible',
      success: 'has-success',
      mobile: 'mobile',
      desktop: 'desktop',
      bottom: 'bottom',
    };

    class PopupComponent extends HTMLElement {
      constructor() {
        super();
        this.popup = this.querySelector(selectors$b.dialog);
        this.preventTopLayer = this.popup.hasAttribute(attributes$8.preventTopLayer);
        this.enableScrollLock = this.popup.hasAttribute(attributes$8.scrollLock);
        this.buttonPopupOpen = this.querySelector(selectors$b.open);
        this.a11y = window.theme.a11y;
        this.isAnimating = false;
        this.cookie = new PopupCookie(this.popup.getAttribute(attributes$8.cookieName), this.popup.getAttribute(attributes$8.cookieValue));

        this.checkTargetReferrer();
        this.checkCookie();
        this.bindListeners();
      }

      checkTargetReferrer() {
        if (!this.popup.hasAttribute(attributes$8.referrer)) return;

        if (location.href.indexOf(this.popup.getAttribute(attributes$8.referrer)) === -1 && !window.Shopify.designMode) {
          this.popup.parentNode.removeChild(this.popup);
        }
      }

      checkCookie() {
        const cookieExists = this.cookie && this.cookie.read() !== false;

        if (!cookieExists) {
          this.showPopupEvents();

          this.popup.addEventListener('theme:popup:onclose', () => this.cookie.write());
        }
      }

      bindListeners() {
        // Open button click event
        this.buttonPopupOpen?.addEventListener('click', (e) => {
          e.preventDefault();
          this.popupOpen();
          window.theme.a11y.lastElement = this.buttonPopupOpen;
        });

        // Close button click event
        this.popup.querySelectorAll(selectors$b.close)?.forEach((closeButton) => {
          closeButton.addEventListener('click', (e) => {
            e.preventDefault();
            this.popupClose();
          });
        });

        // Close dialog on click outside content
        this.popup.addEventListener('click', (event) => {
          if (event.target.nodeName === 'DIALOG' && event.type === 'click') {
            this.popupClose();
          }
        });

        // Close dialog on click ESC key pressed
        this.popup.addEventListener('keydown', (event) => {
          if (event.code === 'Escape') {
            event.preventDefault();
            this.popupClose();
          }
        });

        this.popup.addEventListener('close', () => this.popupCloseActions());
      }

      popupOpen() {
        this.isAnimating = true;

        // Check if browser supports Dialog tags
        if (typeof this.popup.showModal === 'function' && !this.preventTopLayer) {
          this.popup.showModal();
        } else if (typeof this.popup.show === 'function') {
          this.popup.show();
        } else {
          this.popup.setAttribute('open', '');
        }

        this.popup.removeAttribute('inert');
        this.popup.setAttribute('aria-hidden', false);
        this.popup.focus(); // Focus <dialog> tag element to prevent immediate closing on Escape keypress

        if (this.enableScrollLock) {
          document.dispatchEvent(new CustomEvent('theme:scroll:lock', {bubbles: true}));
        }

        window.theme.waitForAnimationEnd(this.popup).then(() => {
          this.isAnimating = false;

          if (this.enableScrollLock) {
            this.a11y.trapFocus(this.popup);
          }

          const focusTarget = this.popup.querySelector('[autofocus]') || this.popup.querySelector(selectors$b.focusable);
          focusTarget?.focus();
        });
      }

      popupClose() {
        if (this.isAnimating || this.popup.hasAttribute('inert')) {
          return;
        }

        if (!this.popup.hasAttribute(attributes$8.closing)) {
          this.popup.setAttribute(attributes$8.closing, '');
          this.isAnimating = true;

          window.theme.waitForAnimationEnd(this.popup).then(() => {
            this.isAnimating = false;
            this.popupClose();
          });

          return;
        }

        // Check if browser supports Dialog tags
        if (typeof this.popup.close === 'function') {
          this.popup.close();
        } else {
          this.popup.removeAttribute('open');
          this.popup.setAttribute('aria-hidden', true);
        }

        this.popupCloseActions();
      }

      popupCloseActions() {
        if (this.popup.hasAttribute('inert')) return;

        this.popup.setAttribute('inert', '');
        this.popup.setAttribute('aria-hidden', true);
        this.popup.removeAttribute(attributes$8.closing);

        // Unlock scroll if no other popups & modals are open
        if (!window.theme.hasOpenModals() && this.enableScrollLock) {
          document.dispatchEvent(new CustomEvent('theme:scroll:unlock', {bubbles: true}));
        }

        this.popup.dispatchEvent(new CustomEvent('theme:popup:onclose', {bubbles: false}));

        if (this.enableScrollLock) {
          this.a11y.removeTrapFocus();
          this.a11y.autoFocusLastElement();
        }
      }

      showPopupEvents() {
        // Auto show popup if it has open attribute
        if (this.popup.hasAttribute('open') && this.popup.getAttribute('open') == true) {
          this.popupOpen();
        }

        this.delay = this.popup.hasAttribute(attributes$8.delay) ? this.popup.getAttribute(attributes$8.delay) : null;
        this.isSubmitted = window.location.href.indexOf('accepts_marketing') !== -1 || window.location.href.indexOf('customer_posted=true') !== -1;
        this.showOnScrollEvent = window.theme.throttle(this.showOnScroll.bind(this), 200);

        if (this.delay === 'always' || this.isSubmitted) {
          this.popupOpen();
        }

        if (this.delay && this.delay.includes('delayed') && !this.isSubmitted) {
          this.showDelayed();
        }

        if (this.delay === 'bottom' && !this.isSubmitted) {
          this.showOnBottomReached();
        }

        if (this.delay === 'idle' && !this.isSubmitted) {
          this.showOnIdle();
        }
      }

      showDelayed() {
        const seconds = this.delay.includes('_') ? parseInt(this.delay.split('_')[1]) : 10;

        // Show popup after specific seconds
        setTimeout(() => {
          this.popupOpen();
        }, seconds * 1000);
      }

      showOnIdle() {
        let timer = 0;
        let idleTime = 60000;
        const documentEvents = ['mousemove', 'mousedown', 'click', 'touchmove', 'touchstart', 'touchend', 'keydown', 'keypress'];
        const windowEvents = ['load', 'resize', 'scroll'];

        const startTimer = () => {
          timer = setTimeout(() => {
            timer = 0;
            this.popupOpen();
          }, idleTime);

          documentEvents.forEach((eventType) => {
            document.addEventListener(eventType, resetTimer);
          });

          windowEvents.forEach((eventType) => {
            window.addEventListener(eventType, resetTimer);
          });
        };

        const resetTimer = () => {
          if (timer) {
            clearTimeout(timer);
          }

          documentEvents.forEach((eventType) => {
            document.removeEventListener(eventType, resetTimer);
          });

          windowEvents.forEach((eventType) => {
            window.removeEventListener(eventType, resetTimer);
          });

          startTimer();
        };

        startTimer();
      }

      showOnBottomReached() {
        document.addEventListener('theme:scroll', this.showOnScrollEvent);
      }

      showOnScroll() {
        if (window.scrollY + window.innerHeight >= document.body.clientHeight) {
          this.popupOpen();
          document.removeEventListener('theme:scroll', this.showOnScrollEvent);
        }
      }

      disconnectedCallback() {
        document.removeEventListener('theme:scroll', this.showOnScrollEvent);
      }
    }

    class PopupNewsletter extends PopupComponent {
      constructor() {
        super();
        this.form = this.popup.querySelector(selectors$b.newsletterForm);
        this.heading = this.popup.querySelector(selectors$b.newsletterHeading);
        this.newsletterField = this.popup.querySelector(selectors$b.newsletterField);
      }

      connectedCallback() {
        const cookieExists = this.cookie?.read() !== false;
        const submissionSuccess = window.location.search.indexOf('?customer_posted=true') !== -1;
        const classesString = [...this.classList].toString();
        const isPositionBottom = classesString.includes(classes$8.bottom);
        const targetMobile = this.popup.classList.contains(classes$8.mobile);
        const targetDesktop = this.popup.classList.contains(classes$8.desktop);
        const isMobileView = window.theme.isMobile();

        let targetMatches = true;

        if ((targetMobile && !isMobileView) || (targetDesktop && isMobileView)) {
          targetMatches = false;
        }

        if (!targetMatches) {
          super.a11y.removeTrapFocus();
          document.dispatchEvent(new CustomEvent('theme:scroll:unlock', {bubbles: true}));
          return;
        }

        if (!cookieExists || window.Shopify.designMode) {
          if (!window.Shopify.designMode && !window.location.pathname.endsWith('/challenge')) {
            super.showPopupEvents();
          }

          if (this.form && this.form.classList.contains(classes$8.success)) {
            super.popupOpen();
            this.cookie.write();
          }

          this.popup.addEventListener('theme:popup:onclose', () => this.cookie.write());
        }

        if (submissionSuccess) {
          this.delay = 0;
        }

        if (!cookieExists || window.Shopify.designMode) {
          this.show();

          if (this.form.classList.contains(classes$8.success)) {
            this.popupOpen();
            this.cookie.write();
          }
        }

        if (isPositionBottom) {
          this.observeCartBar();
        }
      }

      show() {
        if (!window.location.pathname.endsWith('/challenge')) {
          if (!window.Shopify.designMode) {
            super.showPopupEvents();
          } else {
            super.popupOpen();
          }
        }

        this.showForm();
        this.inputField();

        this.popup.addEventListener('theme:popup:onclose', () => this.cookie.write());
      }

      observeCartBar() {
        this.cartBar = document.getElementById(selectors$b.cartBar);

        if (!this.cartBar) return;

        const config = {attributes: true, childList: false, subtree: false};
        let isVisible = this.cartBar.classList.contains(classes$8.isVisible);
        document.body.classList.toggle(classes$8.cartBarVisible, isVisible);

        // Callback function to execute when mutations are observed
        const callback = (mutationList) => {
          for (const mutation of mutationList) {
            if (mutation.type === 'attributes') {
              isVisible = mutation.target.classList.contains(classes$8.isVisible);
              document.body.classList.toggle(classes$8.cartBarVisible, isVisible);
            }
          }
        };

        this.observer = new MutationObserver(callback);
        this.observer.observe(this.cartBar, config);
      }

      showForm() {
        this.heading?.addEventListener('click', (event) => {
          event.preventDefault();

          this.heading.classList.add(classes$8.hidden);
          this.form.classList.remove(classes$8.hidden);
          this.newsletterField.focus();
        });

        this.heading?.addEventListener('keyup', (event) => {
          if (event.code === 'Enter') {
            this.heading.dispatchEvent(new Event('click'));
          }
        });
      }

      inputField() {
        const setClass = () => {
          // Reset timer if exists and is active
          if (this.resetClassTimer) {
            clearTimeout(this.resetClassTimer);
          }

          if (this.newsletterField.value !== '') {
            this.popup.classList.add(classes$8.hasValue);
          }
        };

        const unsetClass = () => {
          // Reset timer if exists and is active
          if (this.resetClassTimer) {
            clearTimeout(this.resetClassTimer);
          }

          // Reset class
          this.resetClassTimer = setTimeout(() => {
            this.popup.classList.remove(classes$8.hasValue);
          }, 2000);
        };

        this.newsletterField.addEventListener('input', setClass);
        this.newsletterField.addEventListener('focus', setClass);
        this.newsletterField.addEventListener('focusout', unsetClass);
      }

      disconnectedCallback() {
        if (this.observer) {
          this.observer.disconnect();
        }
      }
    }

    if (!customElements.get('popup-component')) {
      customElements.define('popup-component', PopupComponent);
    }

    if (!customElements.get('popup-newsletter')) {
      customElements.define('popup-newsletter', PopupNewsletter);
    }

    const selectors$a = {
      allVisibleElements: '[role="option"]',
      ariaSelected: '[aria-selected="true"]',
      popularSearches: '[data-popular-searches]',
      predictiveSearch: 'predictive-search',
      predictiveSearchResults: '[data-predictive-search-results]',
      predictiveSearchStatus: '[data-predictive-search-status]',
      searchInput: 'input[type="search"]',
      searchPopdown: '[data-popdown]',
      searchResultsLiveRegion: '[data-predictive-search-live-region-count-value]',
      searchResultsGroupsWrapper: '[data-search-results-groups-wrapper]',
      searchForText: '[data-predictive-search-search-for-text]',
      sectionPredictiveSearch: '#shopify-section-predictive-search',
      selectedLink: '[aria-selected="true"] a',
      selectedOption: '[aria-selected="true"] a, button[aria-selected="true"]',
    };

    if (!customElements.get('predictive-search')) {
      customElements.define(
        'predictive-search',

        class PredictiveSearch extends HeaderSearchForm {
          constructor() {
            super();

            this.a11y = window.theme.a11y;
            this.abortController = new AbortController();
            this.allPredictiveSearchInstances = document.querySelectorAll(selectors$a.predictiveSearch);
            this.cachedResults = {};
            this.input = this.querySelector(selectors$a.searchInput);
            this.isOpen = false;
            this.predictiveSearchResults = this.querySelector(selectors$a.predictiveSearchResults);
            this.searchPopdown = this.closest(selectors$a.searchPopdown);
            this.popularSearches = this.searchPopdown?.querySelector(selectors$a.popularSearches);
            this.searchTerm = '';
          }

          connectedCallback() {
            this.input.addEventListener('focus', this.onFocus.bind(this));
            this.input.form.addEventListener('submit', this.onFormSubmit.bind(this));

            this.addEventListener('focusout', this.onFocusOut.bind(this));
            this.addEventListener('keyup', this.onKeyup.bind(this));
            this.addEventListener('keydown', this.onKeydown.bind(this));
          }

          getQuery() {
            return this.input.value.trim();
          }

          onChange() {
            super.onChange();
            const newSearchTerm = this.getQuery();

            if (!this.searchTerm || !newSearchTerm.startsWith(this.searchTerm)) {
              // Remove the results when they are no longer relevant for the new search term
              // so they don't show up when the dropdown opens again
              this.querySelector(selectors$a.searchResultsGroupsWrapper)?.remove();
            }

            // Update the term asap, don't wait for the predictive search query to finish loading
            this.updateSearchForTerm(this.searchTerm, newSearchTerm);

            this.searchTerm = newSearchTerm;

            if (!this.searchTerm.length) {
              this.reset();
              return;
            }

            this.getSearchResults(this.searchTerm);
          }

          onFormSubmit(event) {
            if (!this.getQuery().length || this.querySelector(selectors$a.selectedLink)) event.preventDefault();
          }

          onFormReset(event) {
            super.onFormReset(event);
            if (super.shouldResetForm()) {
              this.searchTerm = '';
              this.abortController.abort();
              this.abortController = new AbortController();
              this.closeResults(true);
            }
          }

          shouldResetForm() {
            return !document.querySelector(selectors$a.selectedLink);
          }

          onFocus() {
            const currentSearchTerm = this.getQuery();

            if (!currentSearchTerm.length) return;

            if (this.searchTerm !== currentSearchTerm) {
              // Search term was changed from other search input, treat it as a user change
              this.onChange();
            } else if (this.getAttribute('results') === 'true') {
              this.open();
            } else {
              this.getSearchResults(this.searchTerm);
            }
          }

          onFocusOut() {
            setTimeout(() => {
              if (!this.contains(document.activeElement)) this.close();
            });
          }

          onKeyup(event) {
            if (!this.getQuery().length) this.close(true);
            event.preventDefault();

            switch (event.code) {
              case 'ArrowUp':
                this.switchOption('up');
                break;
              case 'ArrowDown':
                this.switchOption('down');
                break;
              case 'Enter':
                this.selectOption();
                break;
            }
          }

          onKeydown(event) {
            // Prevent the cursor from moving in the input when using the up and down arrow keys
            if (event.code === 'ArrowUp' || event.code === 'ArrowDown') {
              event.preventDefault();
            }
          }

          updateSearchForTerm(previousTerm, newTerm) {
            const searchForTextElement = this.querySelector(selectors$a.searchForText);
            const currentButtonText = searchForTextElement?.innerText;

            if (currentButtonText) {
              if (currentButtonText.match(new RegExp(previousTerm, 'g'))?.length > 1) {
                // The new term matches part of the button text and not just the search term, do not replace to avoid mistakes
                return;
              }
              const newButtonText = currentButtonText.replace(previousTerm, newTerm);
              searchForTextElement.innerText = newButtonText;
            }
          }

          switchOption(direction) {
            if (!this.getAttribute('open')) return;

            const moveUp = direction === 'up';
            const selectedElement = this.querySelector(selectors$a.ariaSelected);

            // Filter out hidden elements (duplicated page and article resources) thanks
            // to this https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/offsetParent
            const allVisibleElements = Array.from(this.querySelectorAll(selectors$a.allVisibleElements)).filter((element) => element.offsetParent !== null);

            let activeElementIndex = 0;

            if (moveUp && !selectedElement) return;

            let selectedElementIndex = -1;
            let i = 0;

            while (selectedElementIndex === -1 && i <= allVisibleElements.length) {
              if (allVisibleElements[i] === selectedElement) {
                selectedElementIndex = i;
              }
              i++;
            }

            this.statusElement.textContent = '';

            if (!moveUp && selectedElement) {
              activeElementIndex = selectedElementIndex === allVisibleElements.length - 1 ? 0 : selectedElementIndex + 1;
            } else if (moveUp) {
              activeElementIndex = selectedElementIndex === 0 ? allVisibleElements.length - 1 : selectedElementIndex - 1;
            }

            if (activeElementIndex === selectedElementIndex) return;

            const activeElement = allVisibleElements[activeElementIndex];

            activeElement.setAttribute('aria-selected', true);
            if (selectedElement) selectedElement.setAttribute('aria-selected', false);

            this.input.setAttribute('aria-activedescendant', activeElement.id);
          }

          selectOption() {
            const selectedOption = this.querySelector(selectors$a.selectedOption);

            if (selectedOption) selectedOption.click();
          }

          getSearchResults(searchTerm) {
            const queryKey = searchTerm.replace(' ', '-').toLowerCase();
            this.setLiveRegionLoadingState();

            if (this.cachedResults[queryKey]) {
              this.renderSearchResults(this.cachedResults[queryKey]);
              return;
            }

            fetch(`${theme.routes.predictive_search_url}?q=${encodeURIComponent(searchTerm)}&section_id=predictive-search`, {signal: this.abortController.signal})
              .then((response) => {
                if (!response.ok) {
                  var error = new Error(response.status);
                  this.close();
                  throw error;
                }

                return response.text();
              })
              .then((text) => {
                const resultsMarkup = new DOMParser().parseFromString(text, 'text/html').querySelector(selectors$a.sectionPredictiveSearch).innerHTML;
                // Save bandwidth keeping the cache in all instances synced
                this.allPredictiveSearchInstances.forEach((predictiveSearchInstance) => {
                  predictiveSearchInstance.cachedResults[queryKey] = resultsMarkup;
                });
                this.renderSearchResults(resultsMarkup);
              })
              .catch((error) => {
                if (error?.code === 20) {
                  // Code 20 means the call was aborted
                  return;
                }
                this.close();
                throw error;
              });
          }

          setLiveRegionLoadingState() {
            this.statusElement = this.statusElement || this.querySelector(selectors$a.predictiveSearchStatus);
            this.loadingText = this.loadingText || this.getAttribute('data-loading-text');

            this.setLiveRegionText(this.loadingText);
            this.setAttribute('loading', true);
          }

          setLiveRegionText(statusText) {
            this.statusElement.setAttribute('aria-hidden', 'false');
            this.statusElement.textContent = statusText;

            setTimeout(() => {
              this.statusElement.setAttribute('aria-hidden', 'true');
            }, 1000);
          }

          renderSearchResults(resultsMarkup) {
            this.predictiveSearchResults.innerHTML = resultsMarkup;

            this.setAttribute('results', true);

            this.setLiveRegionResults();
            this.open();
          }

          setLiveRegionResults() {
            this.removeAttribute('loading');
            this.setLiveRegionText(this.querySelector(selectors$a.searchResultsLiveRegion).textContent);
          }

          open() {
            this.setAttribute('open', true);
            this.input.setAttribute('aria-expanded', true);
            this.isOpen = true;
            this.predictiveSearchResults.style.setProperty('--results-height', `${window.visualViewport.height - this.predictiveSearchResults.getBoundingClientRect().top}px`);
          }

          close(clearSearchTerm = false) {
            this.closeResults(clearSearchTerm);
            this.isOpen = false;
            this.predictiveSearchResults.style.removeProperty('--results-height');
          }

          closeResults(clearSearchTerm = false) {
            if (clearSearchTerm) {
              this.input.value = '';
              this.removeAttribute('results');
            }
            const selected = this.querySelector(selectors$a.ariaSelected);

            if (selected) selected.setAttribute('aria-selected', false);

            this.input.setAttribute('aria-activedescendant', '');
            this.removeAttribute('loading');
            this.removeAttribute('open');
            this.input.setAttribute('aria-expanded', false);
            this.predictiveSearchResults?.removeAttribute('style');
          }

          reset() {
            this.predictiveSearchResults.innerHTML = '';

            this.input.val = '';
            this.a11y.removeTrapFocus();

            if (this.popularSearches) {
              this.input.dispatchEvent(new Event('blur', {bubbles: false}));
              this.a11y.trapFocus(this.searchPopdown, {
                elementToFocus: this.input,
              });
            }
          }
        }
      );
    }

    if (!customElements.get('product-form')) {
      customElements.define(
        'product-form',
        class ProductForm extends HTMLElement {
          constructor() {
            super();

            this.form = this.querySelector('form');
            this.variantIdInput.disabled = false;
            this.form.addEventListener('submit', this.onSubmitHandler.bind(this));
            this.cart = document.querySelector('cart-drawer');
            this.submitButton = this.querySelector('[type="submit"]');
            this.submitButtonText = this.submitButton.querySelector('[data-add-to-cart-text]');

            if (document.querySelector('cart-drawer')) this.submitButton.setAttribute('aria-haspopup', 'dialog');

            this.hideErrors = this.dataset.hideErrors === 'true';
          }

          onSubmitHandler(evt) {
            evt.preventDefault();

            document.dispatchEvent(
              new CustomEvent('theme:cart:add', {
                detail: {
                  button: this.submitButton,
                },
                bubbles: false,
              })
            );

            const quickAddModal = this.closest('quick-add-modal');
            if (!quickAddModal) {
              window.a11y.lastElement = this.submitButton;
            }
          }

          toggleSubmitButton(disable = true, text = window.theme.strings.addToCart) {
            this.submitButton.toggleAttribute('disabled', disable);
            // Preserve existing price markup inside the add-to-cart text
            const existingPriceElement = this.submitButtonText.querySelector('[data-product-price]');
            if (existingPriceElement) {
              const priceHTML = existingPriceElement.outerHTML;
              this.submitButtonText.textContent = text;
              this.submitButtonText.insertAdjacentHTML('beforeend', ` ${priceHTML}`);
            } else {
              this.submitButtonText.textContent = text;
            }
          }

          get variantIdInput() {
            return this.form.querySelector('[name=id]');
          }
        }
      );
    }

    function fetchProduct(handle) {
      const requestRoute = `${window.theme.routes.root}products/${handle}.js`;

      return window
        .fetch(requestRoute)
        .then((response) => {
          return response.json();
        })
        .catch((e) => {
          console.error(e);
        });
    }

    const selectors$9 = {
      gridSwatchFieldset: '[data-grid-swatch-fieldset]',
      productItem: '[data-grid-item]',
      productInfo: '[data-product-information]',
      productImage: '[data-product-image]',
      swatchButton: '[data-swatch-button]',
    };

    const classes$7 = {
      visible: 'is-visible',
      stopEvents: 'no-events',
    };

    const attributes$7 = {
      handle: 'data-swatch-handle',
      label: 'data-swatch-label',
      swatchCount: 'data-swatch-count',
      variantName: 'data-swatch-variant-name',
      variantTitle: 'data-variant-title',
    };

    class GridSwatch extends HTMLElement {
      constructor() {
        super();

        this.productItemMouseLeaveEvent = () => this.hideVariantImages();
        this.showVariantImageEvent = (swatchButton) => this.showVariantImage(swatchButton);
        this.resizeEvent = () => this.init();
      }

      connectedCallback() {
        this.handle = this.getAttribute(attributes$7.handle);
        this.productItem = this.closest(selectors$9.productItem);
        this.productInfo = this.closest(selectors$9.productInfo);
        this.productImage = this.productItem.querySelector(selectors$9.productImage);
        this.swatchesStyle = theme.settings.collectionSwatchStyle;
        document.addEventListener('theme:resize:width', this.resizeEvent);

        const label = this.getAttribute(attributes$7.label).trim().toLowerCase();

        fetchProduct(this.handle).then((product) => {
          this.product = product;
          this.colorOption = product.options.find(function (element) {
            return element.name.toLowerCase() === label || null;
          });

          if (this.colorOption) {
            this.init();
          }
        });
      }

      init() {
        this.swatchCount = this.productInfo.querySelector(`[${attributes$7.swatchCount}]`);
        this.swatchFieldset = this.productInfo.querySelector(selectors$9.gridSwatchFieldset);
        this.hideSwatchesTimer = 0;

        if (this.swatchCount.hasAttribute(attributes$7.swatchCount)) {

          if (this.swatchesStyle == 'text' || this.swatchesStyle == 'text-slider') {
            if (this.swatchesStyle == 'text') return;

            this.swatchCount.addEventListener('mouseenter', () => {
              if (this.hideSwatchesTimer) clearTimeout(this.hideSwatchesTimer);

              this.productInfo.classList.add(classes$7.stopEvents);
              this.swatchFieldset.classList.add(classes$7.visible);
            });

            // Prevent color swatches blinking on mouse move
            this.productInfo.addEventListener('mouseleave', () => {
              this.hideSwatchesTimer = setTimeout(() => {
                this.productInfo.classList.remove(classes$7.stopEvents);
                this.swatchFieldset.classList.remove(classes$7.visible);
              }, 100);
            });
          }

          if (this.collectionSwatchesStyle == 'slider' || this.collectionSwatchesStyle == 'grid') {
            this.swatchFieldset.classList.add(classes$7.visible);
          }

          if (this.swatchesStyle == 'limited') {
            this.swatchFieldset.classList.add(classes$7.visible);
          }
        }

        this.bindSwatchButtonEvents();
      }

      bindSwatchButtonEvents() {
        this.querySelectorAll(selectors$9.swatchButton)?.forEach((swatchButton) => {
          // Show variant image when hover on color swatch
          swatchButton.addEventListener('mouseenter', this.showVariantImageEvent);
        });

        this.productItem.addEventListener('mouseleave', this.productItemMouseLeaveEvent);
      }

      showVariantImage(event) {
        const swatchButton = event.target;
        const variantName = swatchButton.getAttribute(attributes$7.variantName)?.replaceAll('"', "'");
        const variantImages = this.productImage.querySelectorAll(`[${attributes$7.variantTitle}]`);
        const variantImageSelected = this.productImage.querySelector(`[${attributes$7.variantTitle}="${variantName}"]`);

        // Hide all variant images
        variantImages?.forEach((image) => {
          image.classList.remove(classes$7.visible);
        });

        // Show selected variant image
        variantImageSelected?.classList.add(classes$7.visible);
      }

      hideVariantImages() {
        // Hide all variant images
        this.productImage.querySelectorAll(`[${attributes$7.variantTitle}].${classes$7.visible}`)?.forEach((image) => {
          image.classList.remove(classes$7.visible);
        });
      }

      disconnectedCallback() {
        document.removeEventListener('theme:resize:width', this.resizeEvent);
      }
    }

    const selectors$8 = {
      flickityButton: '.flickity-prev-next-button',
      productLink: '[data-product-link]',
      slide: '[data-hover-slide]',
      slideTouch: '[data-hover-slide-touch]',
      slider: '[data-hover-slider]',
      recentlyViewed: 'recently-viewed',
      video: 'video',
      vimeo: '[data-host="vimeo"]',
      youtube: '[data-host="youtube"]',
    };

    class HoverImages extends HTMLElement {
      constructor() {
        super();

        this.flkty = null;
        this.slider = this.querySelector(selectors$8.slider);
        this.handleScroll = this.handleScroll.bind(this);
        this.recentlyViewed = this.closest(selectors$8.recentlyViewed);
        this.hovered = false;

        this.mouseEnterEvent = () => this.mouseEnterActions();
        this.mouseLeaveEvent = () => this.mouseLeaveActions();

        this.addEventListener('mouseenter', this.mouseEnterEvent);
        this.addEventListener('mouseleave', this.mouseLeaveEvent);
      }

      connectedCallback() {
        this.addArrowClickHandler();

        if (this.recentlyViewed) {
          this.recentlyViewed.addEventListener('theme:recently-viewed:loaded', () => {
            this.initBasedOnDevice();
          });
        } else {
          this.initBasedOnDevice();
        }
      }

      disconnectedCallback() {
        if (this.flkty) {
          this.flkty.options.watchCSS = false;
          this.flkty.destroy();
          this.flkty = null;
        }

        this.removeEventListener('mouseenter', this.mouseEnterEvent);
        this.removeEventListener('mouseleave', this.mouseLeaveEvent);
      }

      initBasedOnDevice() {
        if (window.theme.touch) {
          this.initTouch();
        } else {
          this.initFlickity();
        }
      }

      addArrowClickHandler() {
        const productLink = this.closest(selectors$8.productLink);
        if (productLink) {
          productLink.addEventListener('click', (e) => {
            if (e.target.matches(selectors$8.flickityButton)) {
              e.preventDefault();
            }
          });
        }
      }

      initTouch() {
        this.style.setProperty('--slides-count', this.querySelectorAll(selectors$8.slideTouch).length);
        this.slider.addEventListener('scroll', this.handleScroll);
      }

      handleScroll() {
        const slideIndex = this.slider.scrollLeft / this.slider.clientWidth;
        this.style.setProperty('--slider-index', slideIndex);
      }

      initFlickity() {
        if (this.flkty || !this.slider || this.slider.classList.contains('flickity-enabled') || this.querySelectorAll(selectors$8.slide).length < 2) return;

        this.flkty = new window.theme.Flickity(this.slider, {
          cellSelector: selectors$8.slide,
          contain: true,
          wrapAround: true,
          watchCSS: true,
          autoPlay: false,
          draggable: false,
          pageDots: false,
          prevNextButtons: true,
        });

        this.flkty.pausePlayer();

        this.addEventListener('mouseenter', () => {
          this.flkty.unpausePlayer();
        });

        this.addEventListener('mouseleave', () => {
          this.flkty.pausePlayer();
        });
      }

      mouseEnterActions() {
        this.hovered = true;

        this.videoActions();
      }

      mouseLeaveActions() {
        this.hovered = false;

        this.videoActions();
      }

      videoActions() {
        const youtube = this.querySelector(selectors$8.youtube);
        const vimeo = this.querySelector(selectors$8.vimeo);
        const mediaExternal = youtube || vimeo;
        const mediaNative = this.querySelector(selectors$8.video);

        if (mediaExternal) {
          let action = this.hovered ? 'playVideo' : 'pauseVideo';
          let string = `{"event":"command","func":"${action}","args":""}`;

          if (vimeo) {
            action = this.hovered ? 'play' : 'pause';
            string = `{"method":"${action}"}`;
          }

          mediaExternal.contentWindow.postMessage(string, '*');

          mediaExternal.addEventListener('load', (e) => {
            // Call videoActions() again when iframe is loaded to prevent autoplay being triggered if it loads after the "mouseleave" event
            this.videoActions();
          });
        } else if (mediaNative) {
          if (this.hovered) {
            mediaNative.play();
          } else {
            mediaNative.pause();
          }
        }
      }
    }

    const classes$6 = {
      added: 'is-added',
      animated: 'is-animated',
      disabled: 'is-disabled',
      error: 'has-error',
      loading: 'is-loading',
      open: 'is-open',
      overlayText: 'product-item--overlay-text',
      visible: 'is-visible',
      siblingLinkCurrent: 'sibling__link--current',
    };

    const selectors$7 = {
      animation: '[data-animation]',
      apiContent: '[data-api-content]',
      buttonQuickAdd: '[data-quick-add-btn]',
      buttonAddToCart: '[data-add-to-cart]',
      cartDrawer: 'cart-drawer',
      cartPage: '[data-cart-page]',
      cartLineItems: '[data-line-items]',
      dialog: 'dialog',
      focusable: 'button, [href], select, textarea, [tabindex]:not([tabindex="-1"])',
      messageError: '[data-message-error]',
      modalButton: '[data-quick-add-modal-handle]',
      modalContent: '[data-product-upsell-ajax]',
      modalClose: '[data-quick-add-modal-close]',
      productGridItem: 'data-grid-item',
      productInformationHolder: '[data-product-information]',
      quickAddHolder: '[data-quick-add-holder]',
      quickAddModal: '[data-quick-add-modal]',
      quickAddModalTemplate: '[data-quick-add-modal-template]',
      tooltip: '[data-tooltip]',
    };

    const attributes$6 = {
      closing: 'closing',
      productId: 'data-product-id',
      modalHandle: 'data-quick-add-modal-handle',
      siblingSwapper: 'data-sibling-swapper',
      quickAddHolder: 'data-quick-add-holder',
    };

    class QuickAddProduct extends HTMLElement {
      constructor() {
        super();

        this.quickAddHolder = this.querySelector(selectors$7.quickAddHolder);

        if (this.quickAddHolder) {
          this.modal = null;
          this.currentModal = null;
          this.productId = this.quickAddHolder.getAttribute(attributes$6.quickAddHolder);
          this.modalButton = this.quickAddHolder.querySelector(selectors$7.modalButton);
          this.handle = this.modalButton?.getAttribute(attributes$6.modalHandle);
          this.buttonQuickAdd = this.quickAddHolder.querySelector(selectors$7.buttonQuickAdd);
          this.buttonATC = this.quickAddHolder.querySelector(selectors$7.buttonAddToCart);
          this.button = this.modalButton || this.buttonATC;
          this.modalClose = this.modalClose.bind(this);
          this.modalCloseOnProductAdded = this.modalCloseOnProductAdded.bind(this);
          this.a11y = window.theme.a11y;
          this.isAnimating = false;

          this.modalButtonClickEvent = this.modalButtonClickEvent.bind(this);
          this.quickAddLoadingToggle = this.quickAddLoadingToggle.bind(this);
        }
      }

      connectedCallback() {
        /**
         * Modal button works for multiple variants products
         */
        if (this.modalButton) {
          this.modalButton.addEventListener('click', this.modalButtonClickEvent);
        }

        /**
         * Quick add button works for single variant products
         */
        if (this.buttonATC) {
          this.buttonATC.addEventListener('click', (e) => {
            e.preventDefault();

            window.a11y.lastElement = this.buttonATC;

            document.dispatchEvent(
              new CustomEvent('theme:cart:add', {
                detail: {
                  button: this.buttonATC,
                },
              })
            );
          });
        }

        if (this.quickAddHolder) {
          this.quickAddHolder.addEventListener('animationend', this.quickAddLoadingToggle);
          this.errorHandler();
        }
      }

      modalButtonClickEvent(e) {
        e.preventDefault();

        const isSiblingSwapper = this.modalButton.hasAttribute(attributes$6.siblingSwapper);
        const isSiblingLinkCurrent = this.modalButton.classList.contains(classes$6.siblingLinkCurrent);

        if (isSiblingLinkCurrent) return;

        this.modalButton.classList.add(classes$6.loading);
        this.modalButton.disabled = true;

        // Siblings product modal swapper
        if (isSiblingSwapper && !isSiblingLinkCurrent) {
          this.currentModal = e.target.closest(selectors$7.quickAddModal);
          this.currentModal.classList.add(classes$6.loading);
        }

        this.renderModal();
      }

      modalCreate(response) {
        const modalTemplate = this.quickAddHolder.querySelector(selectors$7.quickAddModalTemplate);
        if (!modalTemplate) return;

        const htmlObject = document.createElement('div');
        htmlObject.innerHTML = modalTemplate.innerHTML;

        // Add dialog to the body
        document.body.appendChild(htmlObject.querySelector(selectors$7.quickAddModal));

        this.modal = document.querySelector(`${selectors$7.quickAddModal}[${attributes$6.productId}="${this.productId}"]`);
        this.modal.querySelector(selectors$7.modalContent).innerHTML = new DOMParser().parseFromString(response, 'text/html').querySelector(selectors$7.apiContent).innerHTML;

        this.modalCreatedCallback();
      }

      modalOpen() {
        if (this.currentModal) {
          this.currentModal.dispatchEvent(new CustomEvent('theme:modal:close', {bubbles: false}));
        }

        // Check if browser supports Dialog tags
        if (typeof this.modal.show === 'function') {
          this.modal.show();
        }

        this.modal.setAttribute('open', true);
        this.modal.removeAttribute('inert');

        this.quickAddHolder.classList.add(classes$6.disabled);

        if (this.modalButton) {
          this.modalButton.classList.remove(classes$6.loading);
          this.modalButton.disabled = false;
          window.a11y.lastElement = this.modalButton;
        }

        // Animate items
        requestAnimationFrame(() => {
          this.modal.querySelectorAll(selectors$7.animation).forEach((item) => {
            item.classList.add(classes$6.animated);
          });
        });

        document.dispatchEvent(new CustomEvent('theme:quick-add:open', {bubbles: true}));
        document.dispatchEvent(new CustomEvent('theme:scroll:lock', {bubbles: true}));
        document.addEventListener('theme:product:added', this.modalCloseOnProductAdded, {once: true});
      }

      modalClose() {
        if (this.isAnimating) {
          return;
        }

        if (!this.modal.hasAttribute(attributes$6.closing)) {
          this.modal.setAttribute(attributes$6.closing, '');
          this.isAnimating = true;
          return;
        }

        // Check if browser supports Dialog tags
        if (typeof this.modal.close === 'function') {
          this.modal.close();
        } else {
          this.modal.removeAttribute('open');
        }

        this.modal.removeAttribute(attributes$6.closing);
        this.modal.setAttribute('inert', '');
        this.modal.classList.remove(classes$6.loading);

        if (this.modalButton) {
          this.modalButton.disabled = false;
        }

        if (this.quickAddHolder && this.quickAddHolder.classList.contains(classes$6.disabled)) {
          this.quickAddHolder.classList.remove(classes$6.disabled);
        }

        this.resetAnimatedItems();

        // Dispatch event to close all tooltips when modal closes
        document.dispatchEvent(
          new CustomEvent('theme:tooltip:close', {
            bubbles: true,
            detail: {
              hideTransition: true,
              immediate: true,
            },
          })
        );

        // Unlock scroll if no other drawers & modals are open
        if (!window.theme.hasOpenModals()) {
          document.dispatchEvent(new CustomEvent('theme:scroll:unlock', {bubbles: true}));
        }

        document.removeEventListener('theme:product:added', this.modalCloseOnProductAdded);

        this.a11y.removeTrapFocus();
        this.a11y.autoFocusLastElement();
        this.modalRemove();
      }

      modalRemove() {
        window.theme
          .waitForAllAnimationsEnd(this.modal)
          .then(() => {
            this.modal?.remove();
          })
          .catch(() => {
            this.modal?.remove();
          });
      }

      modalEvents() {
        // Close button click event
        this.modal.querySelector(selectors$7.modalClose)?.addEventListener('click', (e) => {
          e.preventDefault();
          this.modalClose();
        });

        // Close dialog on click outside content
        this.modal.addEventListener('click', (event) => {
          if (event.target.nodeName === 'DIALOG' && event.type === 'click') {
            this.modalClose();
          }
        });

        // Close dialog on click ESC key pressed
        this.modal.addEventListener('keydown', (event) => {
          if (event.code == 'Escape') {
            event.preventDefault();
            this.modalClose();
          }
        });

        this.modal.addEventListener('theme:modal:close', () => {
          this.modalClose();
        });

        // Close dialog after animation completes
        this.modal.addEventListener('animationend', (event) => {
          if (event.target !== this.modal) return;
          this.isAnimating = false;

          if (this.modal.hasAttribute(attributes$6.closing)) {
            this.modalClose();
          } else {
            setTimeout(() => {
              this.a11y.trapFocus(this.modal);
              const focusTarget = this.modal.querySelector('[autofocus]') || this.modal.querySelector(selectors$7.focusable);
              focusTarget?.focus();
            }, 50);
          }
        });
      }

      modalCloseOnProductAdded() {
        this.resetQuickAddButtons();
        if (this.modal && this.modal.hasAttribute('open')) {
          this.modalClose();
        }
      }

      quickAddLoadingToggle(e) {
        if (e.target != this.quickAddHolder) return;

        this.quickAddHolder.classList.remove(classes$6.disabled);
      }

      /**
       * Handle error cart response
       */
      errorHandler() {
        this.quickAddHolder.addEventListener('theme:cart:error', (event) => {
          const holder = event.detail.holder;
          const parentProduct = holder.closest(`[${selectors$7.productGridItem}]`);
          if (!parentProduct) return;

          const errorMessageHolder = holder.querySelector(selectors$7.messageError);
          const hasOverlayText = parentProduct.classList.contains(classes$6.overlayText);
          const productInfo = parentProduct.querySelector(selectors$7.productInformationHolder);
          const button = holder.querySelector(selectors$7.buttonAddToCart);

          if (button) {
            button.classList.remove(classes$6.added, classes$6.loading);
            holder.classList.add(classes$6.error);

            const removeErrorClass = () => {
              this.resetQuickAddButtons();

              if (hasOverlayText) {
                productInfo.classList.remove(classes$6.hidden);
              }

              holder.removeEventListener('animationend', removeErrorClass);
            };

            holder.addEventListener('animationend', removeErrorClass);
          }

          if (errorMessageHolder) {
            errorMessageHolder.innerText = event.detail.description;
          }

          if (hasOverlayText) {
            productInfo.classList.add(classes$6.hidden);
          }
        });
      }

      /**
       * Reset buttons to default states
       */
      resetQuickAddButtons() {
        if (this.quickAddHolder) {
          this.quickAddHolder.classList.remove(classes$6.visible, classes$6.error);
        }

        if (this.buttonQuickAdd) {
          this.buttonQuickAdd.classList.remove(classes$6.added);
          this.buttonQuickAdd.disabled = false;
        }
      }

      renderModal() {
        window
          .fetch(`${window.theme.routes.root}products/${this.handle}?section_id=api-product-upsell`)
          .then(this.upsellErrorsHandler)
          .then((response) => {
            return response.text();
          })
          .then((response) => {
            this.modalCreate(response);
          });
      }

      modalCreatedCallback() {
        this.modalEvents();
        this.modalOpen();

        wrapElements(this.modal);
      }

      upsellErrorsHandler(response) {
        if (!response.ok) {
          return response.json().then(function (json) {
            const e = new FetchError({
              status: response.statusText,
              headers: response.headers,
              json: json,
            });
            throw e;
          });
        }
        return response;
      }

      resetAnimatedItems() {
        this.modal?.querySelectorAll(selectors$7.animation).forEach((item) => {
          item.classList.remove(classes$6.animated);
        });
      }
    }

    if (!customElements.get('quick-add-product')) {
      customElements.define('quick-add-product', QuickAddProduct);
    }

    if (!customElements.get('grid-swatch')) {
      customElements.define('grid-swatch', GridSwatch);
    }

    if (!customElements.get('hover-images')) {
      customElements.define('hover-images', HoverImages);
    }

    const selectors$6 = {
      buttonArrow: '[data-button-arrow]',
      deferredMediaButton: '[data-deferred-media-button]',
      focusedElement: 'model-viewer, video, iframe, button, [href], input, [tabindex]',
      productMedia: '[data-image-id]',
      productMediaList: '[data-product-media-list]',
      section: '[data-section-id]',
    };

    const classes$5 = {
      arrows: 'slider__arrows',
      dragging: 'is-dragging',
      hidden: 'hidden',
      isFocused: 'is-focused',
      mediaActive: 'media--active',
      mediaHidden: 'media--hidden',
      mediaHiding: 'media--hiding',
    };

    const attributes$5 = {
      activeMedia: 'data-active-media',
      buttonPrev: 'data-button-prev',
      buttonNext: 'data-button-next',
      imageId: 'data-image-id',
      mediaId: 'data-media-id',
      type: 'data-type',
      faderDesktop: 'data-fader-desktop',
      faderMobile: 'data-fader-mobile',
    };

    if (!customElements.get('product-images')) {
      customElements.define(
        'product-images',
        class ProductImages extends HTMLElement {
          constructor() {
            super();

            this.initialized = false;
            this.buttons = false;
            this.isDown = false;
            this.startX = 0;
            this.startY = 0;
            this.scrollLeft = 0;
            this.onButtonArrowClick = (e) => this.buttonArrowClickEvent(e);
            this.container = this.closest(selectors$6.section);
            this.handleMouseDown = this.handleMouseDown.bind(this);
            this.handleMouseLeave = this.handleMouseLeave.bind(this);
            this.handleMouseUp = this.handleMouseUp.bind(this);
            this.handleMouseMove = this.handleMouseMove.bind(this);
            this.handleKeyUp = this.handleKeyUp.bind(this);
            this.productMediaItems = this.querySelectorAll(selectors$6.productMedia);
            this.productMediaList = this.querySelector(selectors$6.productMediaList);
            this.setHeight = this.setHeight.bind(this);
            this.toggleEvents = this.toggleEvents.bind(this);
            this.selectMediaEvent = (e) => this.showMediaOnVariantSelect(e);
          }

          connectedCallback() {
            if (Object.keys(this.productMediaItems).length < 2) return;

            this.productMediaObserver();
            this.toggleEvents();
            this.listen();
            this.setHeight();
          }

          disconnectedCallback() {
            this.unlisten();
          }

          listen() {
            document.addEventListener('theme:resize:width', this.toggleEvents);
            document.addEventListener('theme:resize:width', this.setHeight);
            this.addEventListener('theme:media:select', this.selectMediaEvent);
          }

          unlisten() {
            document.removeEventListener('theme:resize:width', this.toggleEvents);
            document.removeEventListener('theme:resize:width', this.setHeight);
            this.removeEventListener('theme:media:select', this.selectMediaEvent);
          }

          toggleEvents() {
            const isMobileView = window.theme.isMobile();

            if ((isMobileView && this.hasAttribute(attributes$5.faderMobile)) || (!isMobileView && this.hasAttribute(attributes$5.faderDesktop))) {
              this.bindEventListeners();
            } else {
              this.unbindEventListeners();
            }
          }

          bindEventListeners() {
            if (this.initialized) return;

            this.productMediaList.addEventListener('mousedown', this.handleMouseDown);
            this.productMediaList.addEventListener('mouseleave', this.handleMouseLeave);
            this.productMediaList.addEventListener('mouseup', this.handleMouseUp);
            this.productMediaList.addEventListener('mousemove', this.handleMouseMove);
            this.productMediaList.addEventListener('touchstart', this.handleMouseDown, {passive: true});
            this.productMediaList.addEventListener('touchend', this.handleMouseUp, {passive: true});
            this.productMediaList.addEventListener('touchmove', this.handleMouseMove, {passive: true});
            this.productMediaList.addEventListener('keyup', this.handleKeyUp);
            this.initArrows();
            this.resetScrollPosition();

            this.initialized = true;
          }

          unbindEventListeners() {
            if (!this.initialized) return;

            this.productMediaList.removeEventListener('mousedown', this.handleMouseDown);
            this.productMediaList.removeEventListener('mouseleave', this.handleMouseLeave);
            this.productMediaList.removeEventListener('mouseup', this.handleMouseUp);
            this.productMediaList.removeEventListener('mousemove', this.handleMouseMove);
            this.productMediaList.removeEventListener('touchstart', this.handleMouseDown);
            this.productMediaList.removeEventListener('touchend', this.handleMouseUp);
            this.productMediaList.removeEventListener('touchmove', this.handleMouseMove);
            this.productMediaList.removeEventListener('keyup', this.handleKeyUp);
            this.removeArrows();

            this.initialized = false;
          }

          handleMouseDown(e) {
            this.isDown = true;
            this.startX = (e.pageX || e.changedTouches[0].screenX) - this.offsetLeft;
            this.startY = (e.pageY || e.changedTouches[0].screenY) - this.offsetTop;
          }

          handleMouseLeave() {
            if (!this.isDown) return;
            this.isDown = false;
          }

          handleMouseUp(e) {
            const x = (e.pageX || e.changedTouches[0].screenX) - this.offsetLeft;
            const y = (e.pageY || e.changedTouches[0].screenY) - this.offsetTop;
            const distanceX = x - this.startX;
            const distanceY = y - this.startY;
            const direction = distanceX > 0 ? 1 : -1;
            const isImage = this.getCurrentMedia().hasAttribute(attributes$5.type) && this.getCurrentMedia().getAttribute(attributes$5.type) === 'image';

            if (Math.abs(distanceX) > 10 && Math.abs(distanceX) > Math.abs(distanceY) && isImage) {
              direction < 0 ? this.showNextImage() : this.showPreviousImage();
            }

            this.isDown = false;

            requestAnimationFrame(() => {
              this.classList.remove(classes$5.dragging);
            });
          }

          handleMouseMove() {
            if (!this.isDown) return;

            this.classList.add(classes$5.dragging);
          }

          handleKeyUp(e) {
            if (e.code === 'ArrowLeft') {
              this.showPreviousImage();
            }

            if (e.code === 'ArrowRight') {
              this.showNextImage();
            }
          }

          handleArrowsClickEvent() {
            this.querySelectorAll(selectors$6.buttonArrow)?.forEach((button) => {
              button.addEventListener('click', (e) => {
                e.preventDefault();

                if (e.target.hasAttribute(attributes$5.buttonPrev)) {
                  this.showPreviousImage();
                }

                if (e.target.hasAttribute(attributes$5.buttonNext)) {
                  this.showNextImage();
                }
              });
            });
          }

          // When changing from Mobile do Desktop view
          resetScrollPosition() {
            if (this.productMediaList.scrollLeft !== 0) {
              this.productMediaList.scrollLeft = 0;
            }
          }

          initArrows() {
            // Create arrow buttons if don't exist
            if (!this.buttons.length) {
              const buttonsWrap = document.createElement('div');
              buttonsWrap.classList.add(classes$5.arrows);
              buttonsWrap.innerHTML = theme.sliderArrows.prev + theme.sliderArrows.next;

              // Append buttons outside the slider element
              this.productMediaList.append(buttonsWrap);
              this.buttons = this.querySelectorAll(selectors$6.buttonArrow);
              this.buttonPrev = this.querySelector(`[${attributes$5.buttonPrev}]`);
              this.buttonNext = this.querySelector(`[${attributes$5.buttonNext}]`);
            }

            this.handleArrowsClickEvent();
            this.preloadImageOnArrowHover();
          }

          removeArrows() {
            this.querySelector(`.${classes$5.arrows}`)?.remove();
          }

          preloadImageOnArrowHover() {
            this.buttonPrev?.addEventListener('mouseover', () => {
              const id = this.getPreviousMediaId();
              this.preloadImage(id);
            });

            this.buttonNext?.addEventListener('mouseover', () => {
              const id = this.getNextMediaId();
              this.preloadImage(id);
            });
          }

          preloadImage(id) {
            this.querySelector(`[${attributes$5.mediaId}="${id}"] img`)?.setAttribute('loading', 'eager');
          }

          showMediaOnVariantSelect(e) {
            const id = e.detail.id;
            this.setActiveMedia(id);
          }

          getCurrentMedia() {
            return this.querySelector(`${selectors$6.productMedia}.${classes$5.mediaActive}`);
          }

          getNextMediaId() {
            const currentMedia = this.getCurrentMedia();
            const nextMedia = currentMedia?.nextElementSibling.hasAttribute(attributes$5.imageId) ? currentMedia?.nextElementSibling : this.querySelector(selectors$6.productMedia);
            return nextMedia?.getAttribute(attributes$5.mediaId);
          }

          getPreviousMediaId() {
            const currentMedia = this.getCurrentMedia();
            const lastIndex = this.productMediaItems.length - 1;
            const previousMedia = currentMedia?.previousElementSibling || this.productMediaItems[lastIndex];

            return previousMedia?.getAttribute(attributes$5.mediaId);
          }

          showNextImage() {
            const id = this.getNextMediaId();
            this.selectMedia(id);
          }

          showPreviousImage() {
            const id = this.getPreviousMediaId();
            this.selectMedia(id);
          }

          selectMedia(id) {
            this.dispatchEvent(
              new CustomEvent('theme:media:select', {
                detail: {
                  id: id,
                },
              })
            );
          }

          setActiveMedia(id) {
            if (!id) return;

            this.setAttribute(attributes$5.activeMedia, id);

            const activeImage = this.querySelector(`${selectors$6.productMedia}.${classes$5.mediaActive}`);
            const selectedImage = this.querySelector(`[${attributes$5.mediaId}="${id}"]`);
            const selectedImageFocus = selectedImage?.querySelector(selectors$6.focusedElement);
            const deferredMedia = selectedImage.querySelector('deferred-media');

            activeImage?.classList.add(classes$5.mediaHiding);
            activeImage?.classList.remove(classes$5.mediaActive);

            selectedImage?.classList.remove(classes$5.mediaHiding, classes$5.mediaHidden);
            selectedImage?.classList.add(classes$5.mediaActive);

            // Force media loading if slide becomes visible
            if (deferredMedia && deferredMedia.getAttribute('loaded') !== true) {
              selectedImage.querySelector(selectors$6.deferredMediaButton)?.dispatchEvent(new Event('click', {bubbles: false}));
            }

            requestAnimationFrame(() => {
              this.setHeight();

              // Move focus to the selected media
              if (document.body.classList.contains(classes$5.isFocused)) {
                selectedImageFocus?.focus();
              }
            });
          }

          // Set current product image height variable to product images container
          setHeight() {
            const mediaHeight = this.querySelector(`${selectors$6.productMedia}.${classes$5.mediaActive}`)?.offsetHeight || this.productMediaItems[0]?.offsetHeight;
            this.style.setProperty('--height', `${mediaHeight}px`);
          }

          productMediaObserver() {
            this.productMediaItems.forEach((media) => {
              media.addEventListener('transitionend', (e) => {
                if (e.target == media && media.classList.contains(classes$5.mediaHiding)) {
                  media.classList.remove(classes$5.mediaHiding);
                  media.classList.add(classes$5.mediaHidden);
                }
              });
              media.addEventListener('transitioncancel', (e) => {
                if (e.target == media && media.classList.contains(classes$5.mediaHiding)) {
                  media.classList.remove(classes$5.mediaHiding);
                  media.classList.add(classes$5.mediaHidden);
                }
              });
            });
          }
        }
      );
    }

    const selectors$5 = {
      swapHandle: '[data-swap-handle]',
      nativeScrollbar: 'native-scrollbar',
      activeSibling: '.sibling__link--current',
    };

    const attributes$4 = {
      swapHandle: 'data-swap-handle',
      swapUrl: 'data-swap-url',
    };

    if (!customElements.get('product-item')) {
      customElements.define(
        'product-item',
        class ProductItem extends HTMLElement {
          abortController = undefined;
          pendingSwapHandle = null;
          postProcessHtmlCallbacks = [];

          handleClick = (event) => this.handleChange(event);
          handleKeyup = (event) => {
            if (event.code === theme.keyboardKeys.ENTER || event.code === theme.keyboardKeys.NUMPADENTER) {
              this.handleChange(event);
            }
          };
          onHtmlChange = (event) => this.handleHtmlChange(event);

          constructor() {
            super();
            this.swapHandles = this.querySelectorAll(selectors$5.swapHandle);
            this.activeSibling = [...this.swapHandles].find((el) => el.querySelector(selectors$5.activeSibling));
          }

          connectedCallback() {
            this.scrollIntoView();

            this.swapHandles?.forEach((element) => {
              element.addEventListener('click', this.handleClick);
              element.addEventListener('keyup', this.handleKeyup);
            });

            this.initProductSwapUtility();
          }

          disconnectedCallback() {
            // Abort any pending fetch requests
            this.abortController?.abort();

            // Remove event listeners
            this.swapHandles?.forEach((element) => {
              element.removeEventListener('click', this.handleClick);
              element.removeEventListener('keyup', this.handleKeyup);
            });
          }

          initProductSwapUtility() {
            this.postProcessHtmlCallbacks.push(() => {
              document.addEventListener('theme:html:change', this.onHtmlChange);
            });
          }

          handleChange(event) {
            if (!this.contains(event.target)) return;

            const element = event.target.closest(selectors$5.swapHandle);
            const targetUrl = element.dataset.swapUrl;
            const productUrl = `${window.Shopify.routes.root}products/${element.dataset.swapHandle}`;
            // Store the clicked element's handle to refocus it after swap
            this.pendingSwapHandle = element.dataset.swapHandle;

            const shouldSwapProduct = this.dataset.url !== targetUrl;
            if (!shouldSwapProduct) return;

            this.renderProductItem({
              // Fetch the new product's HTML with section rendering API
              requestUrl: `${productUrl}?section_id=api-product-grid-item`,
              // Returns a function that will process and swap the HTML after fetch completes
              callback: this.handleSwapProduct(),
            });
          }

          handleSwapProduct() {
            return (html) => {
              // Set up animation parameters with the new product-item element's ID
              const aosDelay = 0;
              const productItem = html.querySelector('product-item');
              const aosAnchor = productItem.id ? `#${productItem.id}` : '';

              // Get the raw HTML and replace animation placeholder strings
              let productHTML = productItem.outerHTML;
              productHTML = productHTML.includes('||itemAnimationDelay||') ? productHTML.replaceAll('||itemAnimationDelay||', aosDelay) : productHTML;
              productHTML = productHTML.includes('||itemAnimationAnchor||') ? productHTML.replaceAll('||itemAnimationAnchor||', aosAnchor) : productHTML;

              // Parse the processed HTML back into a DOM element
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = productHTML;
              const processedProductItem = tempDiv.querySelector('product-item');

              window.theme.htmlUpdate.viewTransition(
                this, // Current product-item element to be replaced
                processedProductItem, // New product-item element with updated content
                this.postProcessHtmlCallbacks // Run any post-processing after swap (focus, init components)
              );
            };
          }

          renderProductItem({requestUrl, callback}) {
            this.abortController?.abort();
            this.abortController = new AbortController();

            fetch(requestUrl, {signal: this.abortController.signal})
              .then((response) => response.text())
              .then((responseText) => {
                const html = new DOMParser().parseFromString(responseText, 'text/html');
                callback(html);
              })
              .catch((error) => {
                if (error.name === 'AbortError') {
                  console.log('Fetch aborted by user');
                } else {
                  console.error(error);
                }

                document.removeEventListener('theme:html:change', this.onHtmlChange);
              });
          }

          handleHtmlChange(event) {
            if (!event?.detail?.element) return;
            if (!this.pendingSwapHandle) return;

            const product = event.detail.element;
            const swatch = product.querySelector(`[${attributes$4.swapHandle}="${this.pendingSwapHandle}"]`);

            // Set focus and scroll into view of the last clicked sibling swatch element
            swatch.focus();
            this.scrollIntoView({product, swatch});

            this.pendingSwapHandle = null;
            document.removeEventListener('theme:html:change', this.onHtmlChange);
          }

          scrollIntoView(elements = false) {
            if (!this.activeSibling) return;

            const swatch = elements ? elements.swatch : this.activeSibling;
            const product = elements ? elements.product : this;

            const nativeScrollbar = product.querySelector(selectors$5.nativeScrollbar);
            if (!nativeScrollbar || typeof nativeScrollbar.move !== 'function') return;

            const computedStyle = getComputedStyle(swatch);
            const swatchOffset = swatch.offsetLeft + parseFloat(computedStyle.marginLeft) + parseFloat(computedStyle.marginRight);
            requestAnimationFrame(() => nativeScrollbar.move(swatchOffset - swatch.clientWidth, 'instant'));
          }
        }
      );
    }

    /**
     * Adds a Shopify size attribute to a URL
     *
     * @param src
     * @param size
     * @returns {*}
     */
    function getSizedImageUrl(src, size) {
      if (size === null) {
        return src;
      }

      if (size === 'master') {
        return removeProtocol(src);
      }

      const match = src.match(/\.(jpg|jpeg|gif|png|bmp|bitmap|tiff|tif)(\?v=\d+)?$/i);

      if (match) {
        const prefix = src.split(match[0]);
        const suffix = match[0];

        return removeProtocol(`${prefix[0]}_${size}${suffix}`);
      } else {
        return null;
      }
    }

    function removeProtocol(path) {
      return path.replace(/http(s)?:/, '');
    }

    const selectors$4 = {
      productCutline: '[data-product-cutline]',
      productLink: '[data-product-link]',
      productGridItem: '[data-grid-item]',
      productInfo: '[data-product-information]',
      productImage: '[data-product-image-default]',
      productImageSibling: '[data-product-image-sibling]',
      productPrice: '[data-product-price]',
      siblingsInnerHolder: '[data-sibling-inner]',
      siblingCount: '[data-sibling-count]',
      siblingFieldset: '[data-sibling-fieldset]',
      siblingLink: '[data-sibling-link]',
      siblingLinkCurrent: '.sibling__link--current',
    };

    const classes$4 = {
      visible: 'is-visible',
      fade: 'is-fade',
      stopEvents: 'no-events',
      active: 'is-active',
      isFocused: 'is-focused',
    };

    const attributes$3 = {
      siblingAddedImage: 'data-sibling-added-image',
      siblingCutline: 'data-sibling-cutline',
      siblingImage: 'data-sibling-image',
      siblingPrice: 'data-sibling-price',
      siblingCompareAtPrice: 'data-sibling-compare-at-price',
      productLink: 'data-product-link',
      siblingLink: 'data-sibling-link',
      mobileColumnsSmall: 'data-mobile-columns-small',
    };

    class SiblingSwatches {
      constructor(swatches, product) {
        this.swatches = swatches;
        this.product = product;
        this.productLinks = this.product.querySelectorAll(selectors$4.productLink);
        this.productCutline = this.product.querySelector(selectors$4.productCutline);
        this.productPrice = this.product.querySelector(selectors$4.productPrice);
        this.productImage = this.product.querySelector(selectors$4.productImage);
        this.productImageSibling = this.product.querySelector(selectors$4.productImageSibling);
        this.siblingsInnerHolder = this.product.querySelector(selectors$4.siblingsInnerHolder);

        this.init();
      }

      init() {
        this.cacheDefaultValues();

        this.siblingsInnerHolder.addEventListener('mouseleave', () => this.resetProductValues());
        this.siblingsInnerHolder.addEventListener('focusout', () => {
          if (document.body.classList.contains(classes$4.isFocused)) this.resetProductValues();
        });

        this.swatches.forEach((swatch) => {
          swatch.addEventListener('mouseenter', (event) => this.showSibling(event));
          swatch.addEventListener('focusin', (event) => {
            if (document.body.classList.contains(classes$4.isFocused)) this.showSibling(event);
          });
        });

        if (this.productLinks.length) {
          this.swatches.forEach((swatch) => {
            swatch.addEventListener('click', () => {
              this.productLinks[0].click();
            });
          });
        }
      }

      cacheDefaultValues() {
        this.activeSibling = this.siblingsInnerHolder.querySelector(selectors$4.siblingLinkCurrent)?.closest(selectors$4.siblingLink);
        if (this.activeSibling) {
          this.productImageSibling.setAttribute(attributes$3.siblingImage, this.activeSibling.dataset.siblingImage);
        }

        this.productLinkValue = this.productLinks[0].hasAttribute(attributes$3.productLink) ? this.productLinks[0].getAttribute(attributes$3.productLink) : '';
        this.productPriceValue = this.productPrice.innerHTML;

        if (this.productCutline) {
          this.productCutlineValue = this.productCutline.innerHTML;
        }
      }

      resetProductValues() {
        this.product.classList.remove(classes$4.active);

        if (this.productLinkValue) {
          this.productLinks.forEach((productLink) => {
            productLink.href = this.productLinkValue;
          });
        }

        if (this.productPrice) {
          this.productPrice.innerHTML = this.productPriceValue;
        }

        if (this.productCutline && this.productCutline) {
          this.productCutline.innerHTML = this.productCutlineValue;
          this.productCutline.title = this.productCutlineValue;
        }

        this.hideSiblingImage();
      }

      showSibling(event) {
        const swatch = event.target;
        const siblingLink = swatch.hasAttribute(attributes$3.siblingLink) ? swatch.getAttribute(attributes$3.siblingLink) : '';
        const siblingPrice = swatch.hasAttribute(attributes$3.siblingPrice) ? swatch.getAttribute(attributes$3.siblingPrice) : '';
        const siblingCompareAtPrice = swatch.hasAttribute(attributes$3.siblingCompareAtPrice) ? swatch.getAttribute(attributes$3.siblingCompareAtPrice) : '';
        const siblingCutline = swatch.hasAttribute(attributes$3.siblingCutline) ? swatch.getAttribute(attributes$3.siblingCutline) : '';
        const siblingImage = swatch.hasAttribute(attributes$3.siblingImage) ? swatch.getAttribute(attributes$3.siblingImage) : '';

        if (siblingLink) {
          this.productLinks.forEach((productLink) => {
            productLink.href = siblingLink;
          });
        }

        if (siblingCompareAtPrice) {
          this.productPrice.innerHTML = `<span class="price sale"><span class="new-price">${siblingPrice}</span> <span class="old-price">${siblingCompareAtPrice}</span></span>`;
        } else {
          this.productPrice.innerHTML = `<span class="price">${siblingPrice}</span>`;
        }

        if (this.productCutline) {
          if (siblingCutline) {
            this.productCutline.innerHTML = siblingCutline;
            this.productCutline.title = siblingCutline;
          } else {
            this.productCutline.innerHTML = '';
            this.productCutline.title = '';
          }
        }

        if (siblingImage) {
          this.showSiblingImage(siblingImage);
        }
      }

      showSiblingImage(siblingImage) {
        if (!this.productImageSibling) return;

        // Add current sibling swatch image to PGI image
        const ratio = window.devicePixelRatio || 1;
        const pixels = this.productImage.offsetWidth * ratio;
        const widthRounded = Math.ceil(pixels / 180) * 180;
        const imageSrc = getSizedImageUrl(siblingImage, `${widthRounded}x`);
        const imageExists = this.productImageSibling.querySelector(`[src="${imageSrc}"]`);
        const showCurrentImage = () => {
          this.productImageSibling.classList.add(classes$4.visible);
          this.productImageSibling.querySelector(`[src="${imageSrc}"]`).classList.add(classes$4.fade);
        };
        const swapImages = () => {
          const activeSiblingImage = this.productImageSibling.getAttribute(attributes$3.siblingImage);
          const swapNewImageOnHover = siblingImage !== activeSiblingImage;
          const swapActiveSiblingImage = siblingImage === activeSiblingImage && this.productImageSibling.classList.contains(classes$4.visible);

          // Avoid changing the image when hovering over the currently active sibling link, if the featured image remains unchanged.
          const shouldSwap = Boolean(swapActiveSiblingImage || swapNewImageOnHover);

          if (!shouldSwap) return;

          this.productImageSibling.querySelectorAll('img').forEach((image) => {
            image.classList.remove(classes$4.fade);
          });
          requestAnimationFrame(showCurrentImage);
        };

        if (imageExists) {
          swapImages();
        } else {
          const imageTag = document.createElement('img');

          imageTag.src = imageSrc;

          if (this.productCutline) {
            imageTag.alt = this.productCutline.innerText;
          }

          imageTag.addEventListener('load', () => {
            this.productImageSibling.append(imageTag);

            swapImages();
          });
        }
      }

      hideSiblingImage() {
        if (!this.productImageSibling) return;

        this.productImageSibling.classList.remove(classes$4.visible);
        this.productImageSibling.querySelectorAll('img').forEach((image) => {
          image.classList.remove(classes$4.fade);
        });
      }
    }

    if (!customElements.get('product-item-siblings')) {
      customElements.define(
        'product-item-siblings',
        class ProductSiblings extends HTMLElement {
          constructor() {
            super();

            this.resizeEvent = () => this.handleResize();
          }

          connectedCallback() {
            this.product = this.closest(selectors$4.productGridItem);
            this.siblingCount = this.querySelector(selectors$4.siblingCount);
            this.siblingFieldset = this.querySelector(selectors$4.siblingFieldset);
            this.siblingLinks = this.querySelectorAll(selectors$4.siblingLink);
            this.productInfo = this.closest(selectors$4.productInfo);
            this.productLink = this.closest(selectors$4.link);
            this.hideSwatchesTimer = 0;
            this.swatchesStyle = theme.settings.collectionSwatchStyle;

            if (this.siblingFieldset && this.productInfo) {
              if (this.swatchesStyle == 'grid' || this.swatchesStyle == 'slider' || this.swatchesStyle == 'limited') {
                this.siblingFieldset.classList.add(classes$4.visible);
              }

              if (this.siblingCount) {
                this.siblingCount.addEventListener('mouseenter', () => this.showSiblings());

                // Prevent color swatches blinking on mouse move
                this.productInfo.addEventListener('mouseleave', () => this.hideSiblings());
              }
            }

            if (this.siblingLinks.length) {
              new SiblingSwatches(this.siblingLinks, this.product);
            }

            document.addEventListener('theme:resize:width', this.resizeEvent);
          }

          disconnectedCallback() {
            document.removeEventListener('theme:resize:width', this.resizeEvent);
          }

          handleResize() {
            if (this.siblingFieldset && this.productInfo) {
              if (this.swatchesStyle == 'grid' || this.swatchesStyle == 'slider' || this.swatchesStyle == 'limited') {
                this.siblingFieldset.classList.add(classes$4.visible);
                this.limitVisibleSwatches();
              }
            }
          }

          showSiblings() {
            if (this.hideSwatchesTimer) clearTimeout(this.hideSwatchesTimer);

            if (this.productLink) {
              this.productLink.classList.add(classes$4.stopEvents);
            }

            if (this.swatchesStyle == 'text') return;

            this.siblingFieldset.classList.add(classes$4.visible);
          }

          hideSiblings() {
            this.hideSwatchesTimer = setTimeout(() => {
              if (this.productLink) {
                this.productLink.classList.remove(classes$4.stopEvents);
              }

              this.siblingFieldset.classList.remove(classes$4.visible);
            }, 100);
          }

          limitVisibleSwatches() {
            const isMobile = window.theme.isMobile();
            const mobileColumnsElement = this.querySelector(`[${attributes$3.mobileColumnsSmall}]`);
            const isMobileSwatches = mobileColumnsElement?.getAttribute(attributes$3.mobileColumnsSmall) === 'true';

            // Early return if no swatches or mobile conditions not met
            if (!this.siblingLinks?.length || (isMobile && !isMobileSwatches)) {
              return;
            }

            // For desktop, only proceed if style is 'limited'
            if (!isMobile && this.swatchesStyle !== 'limited') {
              // Reset display for all swatches on desktop for other styles
              this.siblingLinks.forEach((swatch) => {
                swatch.style.display = '';
              });
              // Remove the limited count element if it exists
              const limitedCountElement = this.querySelector('.swatch-limited');
              if (limitedCountElement) {
                limitedCountElement.remove();
              }
              return;
            }

            const maxVisible = isMobile ? 3 : 5;
            const totalSwatches = this.siblingLinks.length;
            const visibleSwatches = Math.min(maxVisible, totalSwatches);
            const remainingSwatches = totalSwatches - visibleSwatches;

            // Update swatch visibility in a single pass
            this.siblingLinks.forEach((swatch, index) => {
              swatch.style.display = index < visibleSwatches ? '' : 'none';
            });

            // Handle remaining count display
            const limitedCountElement = this.querySelector('.swatch-limited');
            if (remainingSwatches > 0) {
              if (!limitedCountElement) {
                const newCountElement = document.createElement('div');
                newCountElement.className = 'swatch-limited';
                newCountElement.textContent = `+${remainingSwatches}`;
                mobileColumnsElement?.appendChild(newCountElement);
              } else {
                limitedCountElement.textContent = `+${remainingSwatches}`;
              }
            } else if (limitedCountElement) {
              limitedCountElement.remove();
            }
          }
        }
      );
    }

    /**
     * Module to show Recently Viewed Products
     *
     * Copyright (c) 2014 Caroline Schnapp (11heavens.com)
     * Dual licensed under the MIT and GPL licenses:
     * http://www.opensource.org/licenses/mit-license.php
     * http://www.gnu.org/licenses/gpl.html
     *
     */

    Shopify.Products = (function () {
      const config = {
        howManyToShow: 4,
        howManyToStoreInMemory: 10,
        wrapperId: 'recently-viewed-products',
        section: null,
        target: 'api-product-grid-item',
        onComplete: null,
      };

      let productHandleQueue = [];
      let wrapper = null;
      let howManyToShowItems = null;

      const today = new Date();
      const expiresDate = new Date();
      const daysToExpire = 90;
      expiresDate.setTime(today.getTime() + 3600000 * 24 * daysToExpire);

      const cookie = {
        configuration: {
          expires: expiresDate.toGMTString(),
          path: '/',
          domain: window.location.hostname,
          sameSite: 'none',
          secure: true,
        },
        name: 'shopify_recently_viewed',
        write: function (recentlyViewed) {
          const recentlyViewedString = encodeURIComponent(recentlyViewed.join(' '));
          document.cookie = `${this.name}=${recentlyViewedString}; expires=${this.configuration.expires}; path=${this.configuration.path}; domain=${this.configuration.domain}; sameSite=${this.configuration.sameSite}; secure=${this.configuration.secure}`;
        },
        read: function () {
          let recentlyViewed = [];
          let cookieValue = null;

          if (document.cookie.indexOf('; ') !== -1 && document.cookie.split('; ').find((row) => row.startsWith(this.name))) {
            cookieValue = document.cookie
              .split('; ')
              .find((row) => row.startsWith(this.name))
              .split('=')[1];
          }

          if (cookieValue !== null) {
            recentlyViewed = decodeURIComponent(cookieValue).split(' ');
          }

          return recentlyViewed;
        },
        destroy: function () {
          const cookieVal = null;
          document.cookie = `${this.name}=${cookieVal}; expires=${this.configuration.expires}; path=${this.configuration.path}; domain=${this.configuration.domain}`;
        },
        remove: function (productHandle) {
          const recentlyViewed = this.read();
          const position = recentlyViewed.indexOf(productHandle);
          if (position !== -1) {
            recentlyViewed.splice(position, 1);
            this.write(recentlyViewed);
          }
        },
      };

      const finalize = (wrapper, section) => {
        wrapper.classList.remove('hidden');
        const cookieItemsLength = cookie.read().length;

        if (Shopify.recentlyViewed && howManyToShowItems && cookieItemsLength && cookieItemsLength < howManyToShowItems && wrapper.children.length) {
          let allClassesArr = [];
          let addClassesArr = [];
          let objCounter = 0;
          for (const property in Shopify.recentlyViewed) {
            objCounter += 1;
            const objString = Shopify.recentlyViewed[property];
            const objArr = objString.split(' ');
            const propertyIdx = parseInt(property.split('_')[1]);
            allClassesArr = [...allClassesArr, ...objArr];

            if (cookie.read().length === propertyIdx || (objCounter === Object.keys(Shopify.recentlyViewed).length && !addClassesArr.length)) {
              addClassesArr = [...addClassesArr, ...objArr];
            }
          }

          for (let i = 0; i < wrapper.children.length; i++) {
            const element = wrapper.children[i];
            if (allClassesArr.length) {
              element.classList.remove(...allClassesArr);
            }

            if (addClassesArr.length) {
              element.classList.add(...addClassesArr);
            }
          }
        }

        // If we have a callback.
        if (config.onComplete) {
          try {
            config.onComplete(wrapper, section);
          } catch (error) {
            console.log(error);
          }
        }
      };

      const moveAlong = (shown, productHandleQueue, wrapper, section, target, howManyToShow) => {
        if (productHandleQueue.length && shown < howManyToShow) {
          fetch(`${window.theme.routes.root}products/${productHandleQueue[0]}?section_id=${target}`)
            .then((response) => response.text())
            .then((product) => {
              const aosDelay = shown * 100;
              const aosAnchor = wrapper.id ? `#${wrapper.id}` : '';
              const fresh = document.createElement('div');
              let productReplaced = product;
              productReplaced = productReplaced.includes('||itemAnimationDelay||') ? productReplaced.replaceAll('||itemAnimationDelay||', aosDelay) : productReplaced;
              productReplaced = productReplaced.includes('||itemAnimationAnchor||') ? productReplaced.replaceAll('||itemAnimationAnchor||', aosAnchor) : productReplaced;
              fresh.innerHTML = productReplaced;

              wrapper.innerHTML += fresh.querySelector('[data-api-content]').innerHTML;

              productHandleQueue.shift();
              shown++;
              moveAlong(shown, productHandleQueue, wrapper, section, target, howManyToShow);
            })
            .catch(() => {
              cookie.remove(productHandleQueue[0]);
              productHandleQueue.shift();
              moveAlong(shown, productHandleQueue, wrapper, section, target, howManyToShow);
            });
        } else {
          finalize(wrapper, section);
        }
      };

      return {
        showRecentlyViewed: function (params) {
          if (Shopify.visualPreviewMode) return;

          const paramsNew = params || {};
          const shown = 0;

          // Update defaults.
          Object.assign(config, paramsNew);

          // Read cookie.
          productHandleQueue = cookie.read();

          // Element where to insert.
          wrapper = document.querySelector(`#${config.wrapperId}`);

          // How many products to show.
          howManyToShowItems = config.howManyToShow;
          config.howManyToShow = Math.min(productHandleQueue.length, config.howManyToShow);

          // If we have any to show.
          if (config.howManyToShow && wrapper) {
            // Getting each product with an Ajax call and rendering it on the page.
            moveAlong(shown, productHandleQueue, wrapper, config.section, config.target, howManyToShowItems);
          }
        },

        getConfig: function () {
          return config;
        },

        clearList: function () {
          cookie.destroy();
        },

        recordRecentlyViewed: function (params) {
          const paramsNew = params || {};

          // Update defaults.
          Object.assign(config, paramsNew);

          // Read cookie.
          let recentlyViewed = cookie.read();

          // If we are on a product page.
          if (window.location.pathname.indexOf('/products/') !== -1) {
            // What is the product handle on this page.
            let productHandle = decodeURIComponent(window.location.pathname)
              .match(
                /\/products\/([a-z0-9\-]|[\u3000-\u303F]|[\u3040-\u309F]|[\u30A0-\u30FF]|[\uFF00-\uFFEF]|[\u4E00-\u9FAF]|[\u2605-\u2606]|[\u2190-\u2195]|[\u203B]|[\w\u0430-\u044f]|[\u0400-\u04FF]|[\u0900-\u097F]|[\u0590-\u05FF\u200f\u200e]|[\u0621-\u064A\u0660-\u0669 ])+/
              )[0]
              .split('/products/')[1];

            if (config.handle) {
              productHandle = config.handle;
            }

            // In what position is that product in memory.
            const position = recentlyViewed.indexOf(productHandle);

            // If not in memory.
            if (position === -1) {
              // Add product at the start of the list.
              recentlyViewed.unshift(productHandle);
              // Only keep what we need.
              recentlyViewed = recentlyViewed.splice(0, config.howManyToStoreInMemory);
            } else {
              // Remove the product and place it at start of list.
              recentlyViewed.splice(position, 1);
              recentlyViewed.unshift(productHandle);
            }

            // Update cookie.
            cookie.write(recentlyViewed);
          }
        },

        hasProducts: cookie.read().length > 0,
      };
    })();

    const selectors$3 = {
      aos: '[data-aos]',
      collectionImage: '.collection-item__image',
      columnImage: '[data-column-image]',
      flickityNextArrow: '.flickity-button.next',
      flickityPrevArrow: '.flickity-button.previous',
      link: 'a:not(.btn)',
      productItemImage: '.product-item__image',
      section: '[data-section-id]',
      slide: '[data-slide]',
      slideValue: 'data-slide',
      sliderThumb: '[data-slider-thumb]',
    };

    const attributes$2 = {
      arrowPositionMiddle: 'data-arrow-position-middle',
      slideIndex: 'data-slide-index',
      sliderOptions: 'data-options',
      slideTextColor: 'data-slide-text-color',
    };

    const classes$3 = {
      aosAnimate: 'aos-animate',
      desktop: 'desktop',
      focused: 'is-focused',
      flickityEnabled: 'flickity-enabled',
      heroContentTransparent: 'hero__content--transparent',
      hidden: 'hidden',
      initialized: 'is-initialized',
      isLoading: 'is-loading',
      isSelected: 'is-selected',
      mobile: 'mobile',
      singleSlide: 'single-slide',
    };

    if (!customElements.get('slider-component')) {
      customElements.define(
        'slider-component',
        class SliderComponent extends HTMLElement {
          constructor() {
            super();

            this.flkty = null;
            this.slides = this.querySelectorAll(selectors$3.slide);
            this.thumbs = this.querySelectorAll(selectors$3.sliderThumb);
            this.section = this.closest(selectors$3.section);
            this.bindEvents();
          }

          connectedCallback() {
            this.initSlider();
          }

          initSlider() {
            if (this.slides.length <= 1) return;

            if (this.hasAttribute(attributes$2.sliderOptions)) {
              this.customOptions = JSON.parse(decodeURIComponent(this.getAttribute(attributes$2.sliderOptions)));
            }

            this.classList.add(classes$3.isLoading);

            let slideSelector = selectors$3.slide;
            const isDesktopView = !window.theme.isMobile();
            const slideDesktop = `${selectors$3.slide}:not(.${classes$3.mobile})`;
            const slideMobile = `${selectors$3.slide}:not(.${classes$3.desktop})`;
            const hasDeviceSpecificSelectors = this.querySelectorAll(slideDesktop).length || this.querySelectorAll(slideMobile).length;

            if (hasDeviceSpecificSelectors) {
              if (isDesktopView) {
                slideSelector = slideDesktop;
              } else {
                slideSelector = slideMobile;
              }

              this.flkty?.destroy();
            }

            if (this.querySelectorAll(slideSelector).length <= 1) {
              this.classList.add(classes$3.singleSlide);
              this.classList.remove(classes$3.isLoading);
              return;
            }

            this.sliderOptions = {
              cellSelector: slideSelector,
              contain: true,
              wrapAround: true,
              adaptiveHeight: true,
              ...this.customOptions,
              on: {
                ready: () => {
                  requestAnimationFrame(() => {
                    this.classList.add(classes$3.initialized);
                    this.classList.remove(classes$3.isLoading);
                    this.parentNode.dispatchEvent(
                      new CustomEvent('theme:slider:loaded', {
                        bubbles: true,
                        detail: {
                          slider: this,
                        },
                      })
                    );
                  });

                  this.slideActions();

                  if (this.sliderOptions.prevNextButtons) {
                    this.positionArrows();
                  }
                },
                change: (index) => {
                  const slide = this.slides[index];
                  if (!slide || this.sliderOptions.groupCells) return;

                  const elementsToAnimate = slide.querySelectorAll(selectors$3.aos);
                  if (elementsToAnimate.length) {
                    elementsToAnimate.forEach((el) => {
                      el.classList.remove(classes$3.aosAnimate);
                      requestAnimationFrame(() => {
                        // setTimeout with `0` delay fixes functionality on Mobile and Firefox
                        setTimeout(() => {
                          el.classList.add(classes$3.aosAnimate);
                        }, 0);
                      });
                    });
                  }
                },
                resize: () => {
                  if (this.sliderOptions.prevNextButtons) {
                    this.positionArrows();
                  }
                },
              },
            };

            this.initFlickity();

            this.flkty.on('change', () => this.slideActions(true));

            this.thumbs?.forEach((thumb) => {
              thumb.addEventListener('click', (e) => {
                e.preventDefault();
                const slideIndex = [...thumb.parentElement.children].indexOf(thumb);
                this.flkty.select(slideIndex);
              });
            });

            if (!this.flkty || !this.flkty.isActive) {
              this.classList.remove(classes$3.isLoading);
            }
          }

          initFlickity() {
            if (this.sliderOptions.fade) {
              this.flkty = new window.theme.FlickityFade(this, this.sliderOptions);
            } else {
              this.flkty = new window.theme.Flickity(this, this.sliderOptions);
            }
          }

          bindEvents() {
            this.addEventListener('theme:slider:init', () => {
              this.initSlider();
            });

            this.addEventListener('theme:slider:select', (e) => {
              this.flkty.selectCell(e.detail.index);
              this.flkty.stopPlayer();
            });

            this.addEventListener('theme:slider:deselect', () => {
              if (this.flkty && this.sliderOptions.hasOwnProperty('autoPlay') && this.sliderOptions.autoPlay) {
                this.flkty.playPlayer();
              }
            });

            this.addEventListener('theme:slider:reposition', () => {
              this.flkty?.reposition();
            });

            this.addEventListener('theme:slider:destroy', () => {
              this.flkty?.destroy();
            });

            this.addEventListener('theme:slider:remove-slide', (e) => {
              if (!e.detail.slide) return;

              this.flkty?.remove(e.detail.slide);

              if (this.flkty?.cells.length === 0) {
                this.section.classList.add(classes$3.hidden);
              }
            });
          }

          slideActions(changeEvent = false) {
            const currentSlide = this.querySelector(`.${classes$3.isSelected}`);
            if (!currentSlide) return;

            const currentSlideTextColor = currentSlide.hasAttribute(attributes$2.slideTextColor) ? currentSlide.getAttribute(attributes$2.slideTextColor) : '';
            const currentSlideLink = currentSlide.querySelector(selectors$3.link);
            const buttons = this.querySelectorAll(`${selectors$3.slide} a, ${selectors$3.slide} button`);

            if (document.body.classList.contains(classes$3.focused) && currentSlideLink && this.sliderOptions.groupCells && changeEvent) {
              currentSlideLink.focus();
            }

            if (buttons.length) {
              buttons.forEach((button) => {
                const slide = button.closest(selectors$3.slide);
                if (slide) {
                  const tabIndex = slide.classList.contains(classes$3.isSelected) ? 0 : -1;
                  button.setAttribute('tabindex', tabIndex);
                }
              });
            }

            this.style.setProperty('--text', currentSlideTextColor);

            if (this.thumbs.length && this.thumbs.length === this.slides.length && currentSlide.hasAttribute(attributes$2.slideIndex)) {
              const slideIndex = parseInt(currentSlide.getAttribute(attributes$2.slideIndex));
              const currentThumb = this.querySelector(`${selectors$3.sliderThumb}.${classes$3.isSelected}`);
              if (currentThumb) {
                currentThumb.classList.remove(classes$3.isSelected);
              }
              this.thumbs[slideIndex].classList.add(classes$3.isSelected);
            }
          }

          positionArrows() {
            if (!this.hasAttribute(attributes$2.arrowPositionMiddle) || !this.sliderOptions.prevNextButtons) return;

            const itemImage = this.querySelector(selectors$3.collectionImage) || this.querySelector(selectors$3.productItemImage) || this.querySelector(selectors$3.columnImage);

            // Prevent 'clientHeight' of null error if no image
            if (!itemImage) return;

            this.querySelector(selectors$3.flickityPrevArrow).style.top = itemImage.clientHeight / 2 + 'px';
            this.querySelector(selectors$3.flickityNextArrow).style.top = itemImage.clientHeight / 2 + 'px';
          }

          disconnectedCallback() {
            if (this.flkty) {
              this.flkty.options.watchCSS = false;
              this.flkty.destroy();
            }
          }
        }
      );
    }

    const selectors$2 = {
      relatedSection: '[data-related-section]',
      aos: '[data-aos]',
      tabsLi: '[data-tab]',
      tabLink: '.tab-link',
      tabLinkRecent: '.tab-link__recent',
      tabContent: '.tab-content',
    };

    const classes$2 = {
      current: 'current',
      hidden: 'hidden',
      aosAnimate: 'aos-animate',
      aosNoTransition: 'aos-no-transition',
      focused: 'is-focused',
    };

    const attributes$1 = {
      dataTab: 'data-tab',
      dataTabIndex: 'data-tab-index',
    };

    if (!customElements.get('tabs-component')) {
      customElements.define(
        'tabs-component',
        class GlobalTabs extends HTMLElement {
          constructor() {
            super();

            this.a11y = window.a11y;
          }

          connectedCallback() {
            const tabsNavList = this.querySelectorAll(selectors$2.tabsLi);

            this.addEventListener('theme:tab:check', () => this.checkRecentTab());
            this.addEventListener('theme:tab:hide', () => this.hideRelatedTab());

            tabsNavList?.forEach((element) => {
              const tabId = parseInt(element.getAttribute(attributes$1.dataTab));
              const tab = this.querySelector(`${selectors$2.tabContent}-${tabId}`);

              element.addEventListener('click', () => {
                this.tabChange(element, tab);
              });

              element.addEventListener('keyup', (event) => {
                if ((event.code === 'Space' || event.code === 'Enter') && document.body.classList.contains(classes$2.focused)) {
                  this.tabChange(element, tab);
                }
              });
            });
          }

          tabChange(element, tab) {
            if (element.classList.contains(classes$2.current)) {
              return;
            }

            const currentTab = this.querySelector(`${selectors$2.tabsLi}.${classes$2.current}`);
            const currentTabContent = this.querySelector(`${selectors$2.tabContent}.${classes$2.current}`);

            currentTab?.classList.remove(classes$2.current);
            currentTabContent?.classList.remove(classes$2.current);

            element.classList.add(classes$2.current);
            tab.classList.add(classes$2.current);

            if (element.classList.contains(classes$2.hidden)) {
              tab.classList.add(classes$2.hidden);
            }

            this.a11y.a11y.removeTrapFocus();

            this.dispatchEvent(new CustomEvent('theme:tab:change', {bubbles: true}));

            element.dispatchEvent(
              new CustomEvent('theme:form:sticky', {
                bubbles: true,
                detail: {
                  element: 'tab',
                },
              })
            );

            this.animateItems(tab);
          }

          animateItems(tab, animated = true) {
            const animatedItems = tab.querySelectorAll(selectors$2.aos);

            if (animatedItems.length) {
              animatedItems.forEach((animatedItem) => {
                animatedItem.classList.remove(classes$2.aosAnimate);

                if (animated) {
                  animatedItem.classList.add(classes$2.aosNoTransition);

                  requestAnimationFrame(() => {
                    animatedItem.classList.remove(classes$2.aosNoTransition);
                    animatedItem.classList.add(classes$2.aosAnimate);
                  });
                }
              });
            }
          }

          checkRecentTab() {
            const tabLink = this.querySelector(selectors$2.tabLinkRecent);

            if (tabLink) {
              tabLink.classList.remove(classes$2.hidden);
              const tabLinkIdx = parseInt(tabLink.getAttribute(attributes$1.dataTab));
              const tabContent = this.querySelector(`${selectors$2.tabContent}[${attributes$1.dataTabIndex}="${tabLinkIdx}"]`);

              if (tabContent) {
                tabContent.classList.remove(classes$2.hidden);

                this.animateItems(tabContent, false);
              }
            }
          }

          hideRelatedTab() {
            const relatedSection = this.querySelector(selectors$2.relatedSection);
            if (!relatedSection) {
              return;
            }

            const parentTabContent = relatedSection.closest(`${selectors$2.tabContent}.${classes$2.current}`);
            if (!parentTabContent) {
              return;
            }
            const parentTabContentIdx = parseInt(parentTabContent.getAttribute(attributes$1.dataTabIndex));
            const tabsNavList = this.querySelectorAll(selectors$2.tabsLi);

            if (tabsNavList.length > parentTabContentIdx) {
              const nextTabsNavLink = tabsNavList[parentTabContentIdx].nextSibling;

              if (nextTabsNavLink) {
                tabsNavList[parentTabContentIdx].classList.add(classes$2.hidden);
                nextTabsNavLink.dispatchEvent(new Event('click'));
              }
            }
          }
        }
      );
    }

    const selectors$1 = {
      actions: '[data-actions]',
      content: '[data-content]',
      trigger: '[data-button]',
    };

    const attributes = {
      height: 'data-height',
    };

    const classes$1 = {
      open: 'is-open',
      enabled: 'is-enabled',
    };

    class ToggleEllipsis extends HTMLElement {
      constructor() {
        super();

        this.initialHeight = this.getAttribute(attributes.height);
        this.content = this.querySelector(selectors$1.content);
        this.trigger = this.querySelector(selectors$1.trigger);
        this.actions = this.querySelector(selectors$1.actions);
        this.toggleActions = this.toggleActions.bind(this);
      }

      connectedCallback() {
        // Make sure the data attribute height value matches the CSS value
        this.setHeight(this.initialHeight);

        this.trigger.addEventListener('click', () => {
          this.setHeight(this.content.offsetHeight);
          this.classList.add(classes$1.open);
        });

        this.setHeight(this.initialHeight);
        this.toggleActions();

        document.addEventListener('theme:resize', this.toggleActions);
        document.addEventListener('theme:collapsible:toggle', this.toggleActions);
      }

      disconnectedCallback() {
        document.removeEventListener('theme:resize', this.toggleActions);
        document.removeEventListener('theme:collapsible:toggle', this.toggleActions);
      }

      setHeight(contentHeight) {
        this.style.setProperty('--height', `${contentHeight}px`);
      }

      toggleActions() {
        this.classList.toggle(classes$1.enabled, this.content.offsetHeight + this.actions.offsetHeight > this.initialHeight);
      }
    }

    if (!customElements.get('toggle-ellipsis')) {
      customElements.define('toggle-ellipsis', ToggleEllipsis);
    }

    const selectors = {
      sectionId: '[data-section-id]',
      tooltip: 'data-tooltip',
      tooltipStopMouseEnter: 'data-tooltip-stop-mouseenter',
    };

    const classes = {
      tooltipDefault: 'tooltip-default',
      visible: 'is-visible',
      hiding: 'is-hiding',
    };

    if (!customElements.get('tooltip-component')) {
      customElements.define(
        'tooltip-component',
        class Tooltip extends HTMLElement {
          constructor() {
            super();

            this.label = this.hasAttribute(selectors.tooltip) ? this.getAttribute(selectors.tooltip) : '';
            this.transitionSpeed = 200;
            this.hideTransitionTimeout = 0;
            this.addPinEvent = () => this.addPin();
            this.addPinMouseEvent = () => this.addPin(true);
            this.removePinEvent = (event) => window.theme.throttle(this.removePin(event), 50);
            this.removePinMouseEvent = (event) => this.removePin(event, true, true);
          }

          connectedCallback() {
            if (!document.querySelector(`.${classes.tooltipDefault}`)) {
              const tooltipTemplate = `<div class="${classes.tooltipDefault}__arrow"></div><div class="${classes.tooltipDefault}__inner"><div class="${classes.tooltipDefault}__text"></div></div>`;
              const tooltipElement = document.createElement('div');
              tooltipElement.className = classes.tooltipDefault;
              tooltipElement.innerHTML = tooltipTemplate;
              document.body.appendChild(tooltipElement);
            }

            this.addEventListener('mouseenter', this.addPinMouseEvent);
            this.addEventListener('mouseleave', this.removePinMouseEvent);
            this.addEventListener('theme:tooltip:init', this.addPinEvent);
            document.addEventListener('theme:tooltip:close', this.removePinEvent);
          }

          addPin(stopMouseEnter = false) {
            const tooltipTarget = document.querySelector(`.${classes.tooltipDefault}`);

            const section = this.closest(selectors.sectionId);
            const colorSchemeClass = Array.from(section.classList).find((cls) => cls.startsWith('color-scheme-'));

            if (colorSchemeClass) {
              tooltipTarget?.classList.add(colorSchemeClass); // add the section's color scheme class to the tooltip
            }

            if (this.label && tooltipTarget && ((stopMouseEnter && !this.hasAttribute(selectors.tooltipStopMouseEnter)) || !stopMouseEnter)) {
              const tooltipTargetArrow = tooltipTarget.querySelector(`.${classes.tooltipDefault}__arrow`);
              const tooltipTargetInner = tooltipTarget.querySelector(`.${classes.tooltipDefault}__inner`);
              const tooltipTargetText = tooltipTarget.querySelector(`.${classes.tooltipDefault}__text`);
              tooltipTargetText.innerHTML = this.label;

              const tooltipTargetWidth = tooltipTargetInner.offsetWidth;
              const tooltipRect = this.getBoundingClientRect();
              const tooltipTop = tooltipRect.top;
              const tooltipWidth = tooltipRect.width;
              const tooltipHeight = tooltipRect.height;
              const tooltipTargetPositionTop = tooltipTop + tooltipHeight + window.scrollY;
              let tooltipTargetPositionLeft = tooltipRect.left - tooltipTargetWidth / 2 + tooltipWidth / 2;
              const tooltipLeftWithWidth = tooltipTargetPositionLeft + tooltipTargetWidth;
              const sideOffset = 24;
              const tooltipTargetWindowDifference = tooltipLeftWithWidth - window.theme.getWindowWidth() + sideOffset;

              if (tooltipTargetWindowDifference > 0) {
                tooltipTargetPositionLeft -= tooltipTargetWindowDifference;
              }

              if (tooltipTargetPositionLeft < 0) {
                tooltipTargetPositionLeft = 0;
              }

              tooltipTargetArrow.style.left = `${tooltipRect.left + tooltipWidth / 2}px`;
              tooltipTarget.style.setProperty('--tooltip-top', `${tooltipTargetPositionTop}px`);

              tooltipTargetInner.style.transform = `translateX(${tooltipTargetPositionLeft}px)`;
              tooltipTarget.classList.remove(classes.hiding);
              tooltipTarget.classList.add(classes.visible);

              document.addEventListener('theme:scroll', this.removePinEvent);
            }
          }

          removePin(event, stopMouseEnter = false, hideTransition = false) {
            const tooltipTarget = document.querySelector(`.${classes.tooltipDefault}`);
            const tooltipVisible = tooltipTarget.classList.contains(classes.visible);

            if (tooltipTarget && ((stopMouseEnter && !this.hasAttribute(selectors.tooltipStopMouseEnter)) || !stopMouseEnter)) {
              if (tooltipVisible && (hideTransition || event.detail.hideTransition)) {
                tooltipTarget.classList.add(classes.hiding);

                if (this.hideTransitionTimeout) {
                  clearTimeout(this.hideTransitionTimeout);
                }

                this.hideTransitionTimeout = setTimeout(() => {
                  tooltipTarget.classList.remove(classes.hiding);
                }, this.transitionSpeed);
              }

              tooltipTarget.classList.remove(classes.visible);

              document.removeEventListener('theme:scroll', this.removePinEvent);
            }
          }

          disconnectedCallback() {
            this.removeEventListener('mouseenter', this.addPinMouseEvent);
            this.removeEventListener('mouseleave', this.removePinMouseEvent);
            this.removeEventListener('theme:tooltip:init', this.addPinEvent);
            document.removeEventListener('theme:tooltip:close', this.removePinEvent);
            document.removeEventListener('theme:scroll', this.removePinEvent);
          }
        }
      );
    }

    class VariantSelects extends HTMLElement {
      constructor() {
        super();
      }

      connectedCallback() {
        this.addEventListener('change', (event) => {
          const target = this.getInputForEventTarget(event.target);

          publish(theme.PUB_SUB_EVENTS.optionValueSelectionChange, {
            data: {
              event,
              target,
              selectedOptionValues: this.selectedOptionValues,
            },
          });
        });
      }

      getInputForEventTarget(target) {
        return target.tagName === 'SELECT' ? target.selectedOptions[0] : target;
      }

      get selectedOptionValues() {
        const selectedNativeDropdowns = Array.from(this.querySelectorAll('select option[selected]'));
        const selectedRadios = Array.from(this.querySelectorAll('fieldset input:checked'));
        const selectedPopouts = Array.from(this.querySelectorAll('[data-popout-input]'));

        return [...selectedNativeDropdowns, ...selectedRadios, ...selectedPopouts].map(({dataset}) => dataset.optionValueId).filter((id) => Boolean(id));
      }
    }

    customElements.define('variant-selects', VariantSelects);

    function getScript(url, callback, callbackError) {
      let head = document.getElementsByTagName('head')[0];
      let done = false;
      let script = document.createElement('script');
      script.src = url;

      // Attach handlers for all browsers
      script.onload = script.onreadystatechange = function () {
        if (!done && (!this.readyState || this.readyState == 'loaded' || this.readyState == 'complete')) {
          done = true;
          callback();
        } else {
          callbackError();
        }
      };

      head.appendChild(script);
    }

    const loaders = {};

    function loadScript(options = {}) {
      if (!options.type) {
        options.type = 'json';
      }

      if (options.url) {
        if (loaders[options.url]) {
          return loaders[options.url];
        } else {
          return getScriptWithPromise(options.url, options.type);
        }
      } else if (options.json) {
        if (loaders[options.json]) {
          return Promise.resolve(loaders[options.json]);
        } else {
          return window
            .fetch(options.json)
            .then((response) => {
              return response.json();
            })
            .then((response) => {
              loaders[options.json] = response;
              return response;
            });
        }
      } else if (options.name) {
        const key = ''.concat(options.name, options.version);
        if (loaders[key]) {
          return loaders[key];
        } else {
          return loadShopifyWithPromise(options);
        }
      } else {
        return Promise.reject();
      }
    }

    function getScriptWithPromise(url, type) {
      const loader = new Promise((resolve, reject) => {
        if (type === 'text') {
          fetch(url)
            .then((response) => response.text())
            .then((data) => {
              resolve(data);
            })
            .catch((error) => {
              reject(error);
            });
        } else {
          getScript(
            url,
            function () {
              resolve();
            },
            function () {
              reject();
            }
          );
        }
      });

      loaders[url] = loader;
      return loader;
    }

    function loadShopifyWithPromise(options) {
      const key = ''.concat(options.name, options.version);
      const loader = new Promise((resolve, reject) => {
        try {
          window.Shopify.loadFeatures([
            {
              name: options.name,
              version: options.version,
              onLoad: (err) => {
                onLoadFromShopify(resolve, reject, err);
              },
            },
          ]);
        } catch (err) {
          reject(err);
        }
      });
      loaders[key] = loader;
      return loader;
    }

    function onLoadFromShopify(resolve, reject, err) {
      if (err) {
        return reject(err);
      } else {
        return resolve();
      }
    }

    document.addEventListener('DOMContentLoaded', function () {
      // Scroll to top button
      const scrollTopButton = document.querySelector('[data-scroll-top-button]');
      if (scrollTopButton) {
        scrollTopButton.addEventListener('click', () => {
          window.scrollTo({
            top: 0,
            left: 0,
            behavior: 'smooth',
          });
        });
        document.addEventListener('theme:scroll', () => {
          scrollTopButton.classList.toggle('is-visible', window.scrollY > window.innerHeight);
        });
      }

      if (window.self !== window.top) {
        document.querySelector('html').classList.add('iframe');
      }

      // Safari smoothscroll polyfill
      let hasNativeSmoothScroll = 'scrollBehavior' in document.documentElement.style;
      if (!hasNativeSmoothScroll) {
        loadScript({url: window.theme.assets.smoothscroll});
      }
    });

    // Apply a specific class to the html element for browser support of cookies.
    if (window.navigator.cookieEnabled) {
      document.documentElement.className = document.documentElement.className.replace('supports-no-cookies', 'supports-cookies');
    }

})(themeVendor.ScrollLock);
