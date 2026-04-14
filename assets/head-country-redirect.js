(() => {
  const COUNTRY_REDIRECT_OPEN_ATTRIBUTE = "data-country-redirect-open";
  const COUNTRY_REDIRECT_SHOWN_ATTRIBUTE = "data-country-redirect-shown";
  const COUNTRY_REDIRECT_OPEN_EVENT = "theme:country-redirect:opened";
  const COUNTRY_REDIRECT_CLOSE_EVENT = "theme:country-redirect:closed";

  class HeadCountryRedirect extends HTMLElement {
    connectedCallback() {
      if (this.initialized) return;
      this.initialized = true;

      const init = async () => {
        this.dialog = this.querySelector(".head-country-redirect__dialog");
        this.scrollableEl = this.querySelector("[data-scroll-lock-scrollable]");
        this.ctaButton = this.querySelector("[data-country-redirect-cta]");
        this.flagIcon = this.querySelector("[data-country-redirect-flag]");
        this.closeButton = this.querySelector("[data-country-redirect-close]");
        this.copy = this.querySelector("[data-country-redirect-copy]");
        this.copyTemplate = this.copy ? this.copy.innerHTML : "";
        this.config = this.getConfig();

        if (!this.dialog || !this.config?.enabled) return;

        const previewMode = this.isPreviewMode();
        const detectedCountry = previewMode
          ? String(this.getPrimaryCountryCode(this.config?.rules?.[0]) || this.config?.fallbackCountryCode || "")
          : await this.getDetectedCountry();

        console.log("[head-country-redirect] detected country:", detectedCountry || "(none)");

        const matchedRule = previewMode
          ? this.getFirstValidRule()
          : detectedCountry
            ? this.getMatchingRule(detectedCountry)
            : null;

        if (!matchedRule) return;

        this.detectedCountry = matchedRule.countryCode || detectedCountry || "";
        this.matchedRule = matchedRule;
        this.siteLabel = matchedRule.siteName || matchedRule.url.hostname;
        this.allowClose = previewMode;

        if (this.closeButton) {
          this.closeButton.hidden = !this.allowClose;
        }

        this.bindEvents();
        this.updateDynamicContent();
        this.updateFlagIcon();
        this.open();
      };

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
      } else {
        init();
      }
    }

    disconnectedCallback() {
      if (this.isDialogOpen()) {
        this.clearPriorityState();
      }

      if (this.handleCancel) {
        this.dialog?.removeEventListener("cancel", this.handleCancel);
      }

      if (this.handleEscape) {
        document.removeEventListener("keydown", this.handleEscape, true);
      }

      if (this.handleImmediateRedirect) {
        this.ctaButton?.removeEventListener("click", this.handleImmediateRedirect);
      }

      if (this.handleCloseClick) {
        this.closeButton?.removeEventListener("click", this.handleCloseClick);
      }

      if (this.handleBackdropClose) {
        this.dialog?.removeEventListener("click", this.handleBackdropClose);
      }
    }

    normalizeCountry(value) {
      if (!value) return "";
      return String(value)
        .toUpperCase()
        .replace(/[^A-Z]/g, "")
        .slice(0, 2);
    }

    async getDetectedCountry() {
      try {
        const response = await fetch("/browsing_context_suggestions.json", {
          credentials: "same-origin",
        });
        const data = await response.json();
        const detectedCountry = this.normalizeCountry(data?.detected_values?.country?.handle);

        if (detectedCountry) {
          return detectedCountry;
        }
      } catch (error) {}

      return this.normalizeCountry(this.config?.fallbackCountryCode || window.Shopify?.country);
    }

    isPreviewMode() {
      const searchParams = new URLSearchParams(window.location.search);

      return Boolean(
        window.Shopify?.designMode || window.Shopify?.visualPreviewMode || searchParams.has("preview_theme_id")
      );
    }

    getConfig() {
      const configNode = this.querySelector("[data-country-redirect-config]");

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

        const countryCodes = String(rule.countryCodes || "")
          .split(",")
          .map((code) => code.trim().toUpperCase())
          .filter(Boolean);

        if (!countryCodes.includes(countryCode)) continue;

        const destinationUrl = String(rule.destinationUrl || "").trim();

        if (!destinationUrl) continue;

        try {
          const parsedUrl = new URL(destinationUrl, window.location.href);

          if (!parsedUrl.hostname || parsedUrl.hostname.toLowerCase() === currentHost) {
            continue;
          }

          return {
            siteName: String(rule.siteName || "").trim(),
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

        const destinationUrl = String(rule.destinationUrl || "").trim();

        if (!destinationUrl) continue;

        try {
          const parsedUrl = new URL(destinationUrl, window.location.href);

          if (!parsedUrl.hostname || parsedUrl.hostname.toLowerCase() === currentHost) {
            continue;
          }

          return {
            siteName: String(rule.siteName || "").trim(),
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
      return (
        String(rule?.countryCodes || "")
          .split(",")
          .map((code) => code.trim().toUpperCase())
          .find(Boolean) || ""
      );
    }

    getCountryLabel(countryCode) {
      if (!countryCode) {
        return "your region";
      }

      if (typeof Intl === "undefined" || typeof Intl.DisplayNames !== "function") {
        return countryCode;
      }

      try {
        const displayNames = new Intl.DisplayNames([document.documentElement.lang || "en"], {
          type: "region",
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
        if (!this.allowClose) {
          event.preventDefault();
        }
      };

      this.handleEscape = (event) => {
        if (event.key !== "Escape") return;
        if (!this.allowClose) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        this.close();
      };

      this.handleImmediateRedirect = () => {
        this.redirectNow();
      };

      this.handleCloseClick = () => {
        this.close();
      };

      this.handleBackdropClose = (event) => {
        if (!this.allowClose) return;
        if (event.target !== this.dialog) return;
        this.close();
      };

      this.dialog.addEventListener("cancel", this.handleCancel);
      document.addEventListener("keydown", this.handleEscape, true);
      this.ctaButton?.addEventListener("click", this.handleImmediateRedirect);
      this.closeButton?.addEventListener("click", this.handleCloseClick);
      this.dialog.addEventListener("click", this.handleBackdropClose);
    }

    escapeHtml(value) {
      const span = document.createElement("span");
      span.textContent = value;
      return span.innerHTML;
    }

    updateDynamicContent() {
      if (this.copy && this.copyTemplate) {
        const countryLabel = this.getCountryLabel(this.detectedCountry);
        this.copy.innerHTML = this.copyTemplate.replace(/\[country\]/gi, this.escapeHtml(countryLabel));
      }
    }

    getFlagUrl(countryCode) {
      const normalizedCountryCode = String(countryCode || "")
        .trim()
        .toLowerCase();

      if (!/^[a-z]{2}$/.test(normalizedCountryCode)) {
        return "";
      }

      return `https://flagcdn.com/${normalizedCountryCode}.svg`;
    }

    updateFlagIcon() {
      if (!this.flagIcon) return;

      const flagUrl = this.getFlagUrl(this.detectedCountry);

      if (!flagUrl) return;

      const countryLabel = this.getCountryLabel(this.detectedCountry);
      const flagImage = document.createElement("img");

      flagImage.className = "head-country-redirect__button-flag";
      flagImage.src = flagUrl;
      flagImage.alt = "";
      flagImage.loading = "eager";
      flagImage.decoding = "async";
      flagImage.setAttribute("aria-hidden", "true");

      flagImage.addEventListener(
        "error",
        () => {
          flagImage.remove();
        },
        { once: true }
      );

      this.flagIcon.innerHTML = "";
      this.flagIcon.appendChild(flagImage);
      this.flagIcon.setAttribute("title", countryLabel);
    }

    announceOpened() {
      document.documentElement.setAttribute(COUNTRY_REDIRECT_OPEN_ATTRIBUTE, "true");
      document.documentElement.setAttribute(COUNTRY_REDIRECT_SHOWN_ATTRIBUTE, "true");

      document.dispatchEvent(
        new CustomEvent(COUNTRY_REDIRECT_OPEN_EVENT, {
          detail: {
            sectionId: this.dataset.sectionId || "",
          },
        })
      );
    }

    clearPriorityState() {
      document.documentElement.removeAttribute(COUNTRY_REDIRECT_OPEN_ATTRIBUTE);

      document.dispatchEvent(
        new CustomEvent(COUNTRY_REDIRECT_CLOSE_EVENT, {
          detail: {
            sectionId: this.dataset.sectionId || "",
          },
        })
      );
    }

    open() {
      document.dispatchEvent(
        new CustomEvent("theme:scroll:lock", {
          bubbles: true,
          detail: this.scrollableEl,
        })
      );

      this.dialog.removeAttribute("inert");
      this.dialog.setAttribute("aria-hidden", "false");

      if (typeof this.dialog.showModal === "function") {
        try {
          this.dialog.showModal();
        } catch (error) {
          this.dataset.fallbackOpen = "true";
          this.dialog.setAttribute("open", "");
        }
      } else {
        this.dataset.fallbackOpen = "true";
        this.dialog.setAttribute("open", "");
      }

      if (window.theme?.a11y?.trapFocus) {
        window.theme.a11y.trapFocus(this.dialog, {
          elementToFocus: this.ctaButton || this.scrollableEl || this.dialog,
        });
      } else {
        (this.ctaButton || this.scrollableEl || this.dialog).focus?.();
      }

      this.announceOpened();
    }

    redirectNow() {
      if (this.hasRedirected || !this.matchedRule?.url) return;

      this.hasRedirected = true;
      window.location.assign(this.matchedRule.url.toString());
    }

    close() {
      if (!this.allowClose || !this.dialog) return;

      document.dispatchEvent(
        new CustomEvent("theme:scroll:unlock", {
          bubbles: true,
        })
      );

      if (window.theme?.a11y?.removeTrapFocus) {
        window.theme.a11y.removeTrapFocus();
      }

      this.dialog.setAttribute("aria-hidden", "true");
      this.dialog.setAttribute("inert", "");

      if (typeof this.dialog.close === "function" && this.dialog.open) {
        this.dialog.close();
      } else {
        this.dialog.removeAttribute("open");
      }

      delete this.dataset.fallbackOpen;
      this.clearPriorityState();
    }
  }

  if (!customElements.get("head-country-redirect")) {
    customElements.define("head-country-redirect", HeadCountryRedirect);
  }
})();
