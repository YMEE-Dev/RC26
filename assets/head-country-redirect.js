(() => {
  class HeadCountryRedirect extends HTMLElement {
    connectedCallback() {
      if (this.initialized) return;
      this.initialized = true;

      const init = () => {
        this.dialog = this.querySelector('.head-country-redirect__dialog');
        this.scrollableEl = this.querySelector('[data-scroll-lock-scrollable]');
        this.ctaButton = this.querySelector('[data-country-redirect-cta]');
        this.copy = this.querySelector('[data-country-redirect-copy]');
        this.copyTemplate = this.copy ? this.copy.innerHTML : '';
        this.config = this.getConfig();

        if (!this.dialog || !this.config?.enabled) return;

        const detectedCountry = String(window.Shopify?.country || '')
          .trim()
          .toUpperCase();
        const devMode = this.isDevMode();
        const matchedRule = devMode
          ? this.getFirstValidRule()
          : detectedCountry
            ? this.getMatchingRule(detectedCountry)
            : null;

        if (!matchedRule) return;

        this.detectedCountry = matchedRule.countryCode || detectedCountry || '';
        this.matchedRule = matchedRule;
        this.siteLabel = matchedRule.siteName || matchedRule.url.hostname;

        this.bindEvents();
        this.updateDynamicContent();
        this.open();
      };

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, {once: true});
      } else {
        init();
      }
    }

    disconnectedCallback() {
      if (this.handleCancel) {
        this.dialog?.removeEventListener('cancel', this.handleCancel);
      }

      if (this.handleEscape) {
        document.removeEventListener('keydown', this.handleEscape, true);
      }

      if (this.handleImmediateRedirect) {
        this.ctaButton?.removeEventListener('click', this.handleImmediateRedirect);
      }
    }

    isDevMode() {
      return (
        window.Shopify?.designMode ||
        window.Shopify?.visualPreviewMode ||
        window.theme?.info?.role === 'development'
      );
    }

    getConfig() {
      const configNode = this.querySelector('[data-country-redirect-config]');

      if (!configNode) return null;

      try {
        return JSON.parse(configNode.textContent);
      } catch (error) {
        return null;
      }
    }

    getMatchingRule(countryCode) {
      const rules = Array.isArray(this.config?.rules) ? this.config.rules : [];
      const currentHost = window.location.hostname.toLowerCase();

      for (const rule of rules) {
        if (!rule?.enabled) continue;

        const countryCodes = String(rule.countryCodes || '')
          .split(',')
          .map((code) => code.trim().toUpperCase())
          .filter(Boolean);

        if (!countryCodes.includes(countryCode)) continue;

        const destinationUrl = String(rule.destinationUrl || '').trim();

        if (!destinationUrl) continue;

        try {
          const parsedUrl = new URL(destinationUrl, window.location.href);

          if (!parsedUrl.hostname || parsedUrl.hostname.toLowerCase() === currentHost) {
            continue;
          }

          return {
            siteName: String(rule.siteName || '').trim(),
            url: parsedUrl,
            countryCode,
          };
        } catch (error) {
          continue;
        }
      }

      return null;
    }

    getFirstValidRule() {
      const rules = Array.isArray(this.config?.rules) ? this.config.rules : [];
      const currentHost = window.location.hostname.toLowerCase();

      for (const rule of rules) {
        if (!rule?.enabled) continue;

        const destinationUrl = String(rule.destinationUrl || '').trim();

        if (!destinationUrl) continue;

        try {
          const parsedUrl = new URL(destinationUrl, window.location.href);

          if (!parsedUrl.hostname || parsedUrl.hostname.toLowerCase() === currentHost) {
            continue;
          }

          return {
            siteName: String(rule.siteName || '').trim(),
            url: parsedUrl,
            countryCode: this.getPrimaryCountryCode(rule),
          };
        } catch (error) {
          continue;
        }
      }

      return null;
    }

    getPrimaryCountryCode(rule) {
      return String(rule?.countryCodes || '')
        .split(',')
        .map((code) => code.trim().toUpperCase())
        .find(Boolean) || '';
    }

    getCountryLabel(countryCode) {
      if (!countryCode) {
        return 'your region';
      }

      if (typeof Intl === 'undefined' || typeof Intl.DisplayNames !== 'function') {
        return countryCode;
      }

      try {
        const displayNames = new Intl.DisplayNames([document.documentElement.lang || 'en'], {
          type: 'region',
        });

        return displayNames.of(countryCode) || countryCode;
      } catch (error) {
        return countryCode;
      }
    }

    bindEvents() {
      if (this.eventsBound) return;
      this.eventsBound = true;

      this.handleCancel = (event) => {
        event.preventDefault();
      };

      this.handleEscape = (event) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
      };

      this.handleImmediateRedirect = () => {
        this.redirectNow();
      };

      this.dialog.addEventListener('cancel', this.handleCancel);
      document.addEventListener('keydown', this.handleEscape, true);
      this.ctaButton?.addEventListener('click', this.handleImmediateRedirect);
    }

    escapeHtml(value) {
      const span = document.createElement('span');
      span.textContent = value;
      return span.innerHTML;
    }

    updateDynamicContent() {
      if (this.copy && this.copyTemplate) {
        const countryLabel = this.getCountryLabel(this.detectedCountry);
        this.copy.innerHTML = this.copyTemplate.replace(/\[country\]/gi, this.escapeHtml(countryLabel));
      }
    }

    open() {
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

      if (window.theme?.a11y?.trapFocus) {
        window.theme.a11y.trapFocus(this.dialog, {
          elementToFocus: this.ctaButton || this.scrollableEl || this.dialog,
        });
      } else {
        (this.ctaButton || this.scrollableEl || this.dialog).focus?.();
      }
    }

    redirectNow() {
      if (this.hasRedirected || !this.matchedRule?.url) return;

      this.hasRedirected = true;
      window.location.assign(this.matchedRule.url.toString());
    }
  }

  if (!customElements.get('head-country-redirect')) {
    customElements.define('head-country-redirect', HeadCountryRedirect);
  }
})();
