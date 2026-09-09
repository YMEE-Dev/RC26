(() => {
  const COUNTRY_REDIRECT_OPEN_ATTRIBUTE = "data-country-redirect-open";
  const COUNTRY_REDIRECT_SHOWN_ATTRIBUTE = "data-country-redirect-shown";
  const COUNTRY_REDIRECT_OPEN_EVENT = "theme:country-redirect:opened";
  const STORE_INFO_POPUP_COOKIE_HOURS = 90 * 24;
  // Popup hierarchy: cookie banner at once, geolocation popups at 5s, newsletter float at 15s.
  const STORE_INFO_POPUP_OPEN_DELAY_MS = 5000;

  class StoreInfoPopupCookie {
    constructor(name, hoursToExpire = STORE_INFO_POPUP_COOKIE_HOURS) {
      this.name = String(name || "").trim();
      this.maxAge = Math.max(0, Number(hoursToExpire) * 60 * 60);
    }

    read() {
      if (!this.name) return false;

      const cookiePrefix = `${this.name}=`;
      const cookieValue = document.cookie.split("; ").find((row) => row.startsWith(cookiePrefix));

      if (!cookieValue) return false;

      return cookieValue.slice(cookiePrefix.length);
    }

    write(value = "seen") {
      if (!this.name || !this.maxAge) return;

      let cookieString = `${this.name}=${value}; path=/; max-age=${this.maxAge}; SameSite=Lax`;

      if (window.location.protocol === "https:") {
        cookieString += "; Secure";
      }

      document.cookie = cookieString;
    }
  }

  const log = (message) => console.log(`[store-info-popup] ${message}`);

  // Empty cookie name: remember the dismissal for the browsing session only.
  class StoreInfoPopupSessionFlag {
    constructor(sectionId) {
      this.key = `store-info-popup-session:${sectionId || "default"}`;
    }

    read() {
      try {
        return window.sessionStorage.getItem(this.key) || false;
      } catch (error) {
        return false;
      }
    }

    write(value = "seen") {
      try {
        window.sessionStorage.setItem(this.key, value);
      } catch (error) {}
    }
  }

  class StoreInfoPopup extends HTMLElement {
    connectedCallback() {
      if (this.initialized) return;
      this.initialized = true;

      const init = () => {
        this.dialog = this.querySelector(".store-info-popup__dialog");
        this.scrollableEl = this.querySelector("[data-scroll-lock-scrollable]");
        this.closeButtons = Array.from(this.querySelectorAll("[data-store-info-popup-close]"));
        this.closeButton = this.closeButtons.find((button) => !button.hasAttribute("hidden")) || this.closeButtons[0];
        this.copy = this.querySelector("[data-store-info-popup-copy]");
        this.copyTemplate = this.copy ? this.copy.innerHTML : "";
        this.config = this.getConfig();

        if (!this.dialog || !this.config?.enabled) return;

        const cookieName = (this.dialog.dataset.cookieName || "").trim();
        this.cookie = cookieName
          ? new StoreInfoPopupCookie(cookieName)
          : new StoreInfoPopupSessionFlag(this.dataset.sectionId);

        this.bindEvents();

        const dismissed = this.cookie.read() !== false;
        if (dismissed && !window.Shopify?.designMode) {
          log(`skip: already dismissed (${cookieName ? `cookie ${cookieName}` : "this session"})`);
          return;
        }

        this.resolveAudience().then((countryCode) => {
          if (countryCode === false) return;

          this.updateDynamicContent(countryCode);

          // Timed from the load event, not DOM-ready: the homepage hero is still white until
          // its video and poster arrive, and the popup should not sit over an unpainted page.
          const start = () => window.setTimeout(() => this.maybeOpen(), STORE_INFO_POPUP_OPEN_DELAY_MS);
          if (document.readyState === "complete") start();
          else window.addEventListener("load", start, { once: true });
        });
      };

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
      } else {
        init();
      }
    }

    disconnectedCallback() {
      if (this.handleEscape) {
        document.removeEventListener("keydown", this.handleEscape, true);
      }

      if (this.handleCloseClick) {
        this.closeButtons?.forEach((button) => {
          button.removeEventListener("click", this.handleCloseClick);
        });
      }

      if (this.handleBackdropClose) {
        this.removeEventListener("click", this.handleBackdropClose);
      }

      if (this.handleCancel) {
        this.dialog?.removeEventListener("cancel", this.handleCancel);
      }

      if (this.handleCountryRedirectOpen) {
        document.removeEventListener(COUNTRY_REDIRECT_OPEN_EVENT, this.handleCountryRedirectOpen);
      }
    }

    isDialogOpen() {
      return Boolean(this.dialog?.open || this.dataset.fallbackOpen === "true");
    }

    getConfig() {
      const configNode = this.querySelector("[data-store-info-popup-config]");

      if (!configNode) return null;

      try {
        return JSON.parse(configNode.textContent);
      } catch (error) {
        return null;
      }
    }

    // Resolves to the visitor's country code when the popup should show, or false to skip it.
    async resolveAudience() {
      const audience = this.config.audience || "all";
      const needsCountry = audience !== "all" || /\[country\]/i.test(this.copyTemplate);
      const countryCode = needsCountry ? (await window.theme?.geo?.detectCountry?.()) || "" : "";

      if (audience === "all" || window.Shopify?.designMode) return countryCode;

      const listed = String(this.config.countryCodes || "")
        .split(",")
        .map((code) => code.trim().toUpperCase())
        .includes(countryCode);
      const show = Boolean(countryCode) && listed === (audience === "inside");

      log(`country: ${countryCode || "(none)"}, audience: ${audience}, listed: ${listed} → ${show ? "eligible" : "skip"}`);

      return show ? countryCode : false;
    }

    updateDynamicContent(countryCode) {
      if (!this.copy || !this.copyTemplate) return;

      const label = document.createElement("strong");
      label.textContent = window.theme?.geo?.countryName?.(countryCode) || "your country";

      this.copy.innerHTML = this.copyTemplate.replace(/\[country\]/gi, label.outerHTML);
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
          this.close({ skipScrollUnlock: true });
        }
      };

      this.handleCancel = (event) => {
        event.preventDefault();
        this.close();
      };

      this.handleEscape = (event) => {
        if (event.key !== "Escape") return;
        if (!this.isDialogOpen()) return;
        event.preventDefault();
        event.stopPropagation();
        this.close();
      };

      this.handleCloseClick = () => {
        this.close();
      };

      this.handleBackdropClose = (event) => {
        if (event.target !== this && event.target !== this.dialog) return;
        this.close();
      };

      document.addEventListener(COUNTRY_REDIRECT_OPEN_EVENT, this.handleCountryRedirectOpen);
      this.dialog.addEventListener("cancel", this.handleCancel);
      document.addEventListener("keydown", this.handleEscape, true);
      this.closeButtons.forEach((button) => {
        button.addEventListener("click", this.handleCloseClick);
      });
      this.addEventListener("click", this.handleBackdropClose);
    }

    maybeOpen() {
      if (this.hasAttemptedOpen) return;
      this.hasAttemptedOpen = true;

      if (this.blockedByCountryRedirect || this.hasCountryRedirectPriority()) {
        log("skip: country redirect has priority");
        return;
      }

      this.open();
    }

    open() {
      if (!this.dialog || this.isDialogOpen()) return;

      document.dispatchEvent(
        new CustomEvent("theme:scroll:lock", {
          bubbles: true,
          detail: this.scrollableEl,
        })
      );

      this.dialog.removeAttribute("inert");
      this.dialog.setAttribute("aria-hidden", "false");

      // Not showModal(): a modal lives in the browser's top layer, above every z-index, so the
      // cookie banner could never sit over it. Opened in-page instead; theme a11y trap and the
      // keydown handler cover focus and Escape.
      this.dataset.fallbackOpen = "true";
      this.dialog.setAttribute("open", "");
      log("open");

      this.cookie.write();

      if (window.theme?.a11y?.trapFocus) {
        window.theme.a11y.lastElement = document.activeElement;
        window.theme.a11y.trapFocus(this.dialog, {
          elementToFocus: this.closeButton || this.scrollableEl || this.dialog,
        });
      } else {
        (this.closeButton || this.scrollableEl || this.dialog).focus?.();
      }
    }

    close({ skipScrollUnlock = false } = {}) {
      if (!this.dialog || !this.isDialogOpen() || this.isClosing) return;

      this.isClosing = true;

      if (window.theme?.a11y?.removeTrapFocus) {
        window.theme.a11y.removeTrapFocus();
      }

      this.dialog.setAttribute("aria-hidden", "true");
      this.dialog.setAttribute("inert", "");

      // theme.css animates dialog[closing] with fadeOut; close for real once it has played.
      this.dialog.setAttribute("closing", "");

      let finished = false;
      const finishClose = () => {
        if (finished) return;
        finished = true;

        this.dialog.removeEventListener("animationend", onAnimationEnd);
        this.dialog.removeAttribute("closing");
        this.finishClose({ skipScrollUnlock });
      };
      const onAnimationEnd = (event) => {
        if (event.target === this.dialog) finishClose();
      };

      this.dialog.addEventListener("animationend", onAnimationEnd);
      window.setTimeout(finishClose, 600);
    }

    finishClose({ skipScrollUnlock = false } = {}) {
      if (typeof this.dialog.close === "function" && this.dialog.open) {
        this.dialog.close();
      } else {
        this.dialog.removeAttribute("open");
      }

      delete this.dataset.fallbackOpen;
      this.isClosing = false;

      if (!skipScrollUnlock && (!window.theme?.hasOpenModals || !window.theme.hasOpenModals())) {
        document.dispatchEvent(
          new CustomEvent("theme:scroll:unlock", {
            bubbles: true,
          })
        );
      }

      if (window.theme?.a11y?.autoFocusLastElement) {
        window.theme.a11y.autoFocusLastElement();
      }
    }
  }

  if (!customElements.get("store-info-popup")) {
    customElements.define("store-info-popup", StoreInfoPopup);
  }
})();
