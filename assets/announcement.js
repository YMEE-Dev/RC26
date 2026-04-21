(() => {
  "use strict";

  const selectors = {
    closeButton: "[data-announcement-close]",
    marquee: ".announcement__bar-holder--marquee",
    slide: "[data-slide]",
    slider: "[data-slider]",
    ticker: "ticker-bar",
    tickerSlide: ".announcement__slide",
    wrapper: "[data-announcement-wrapper]"
  };

  if (customElements.get("announcement-bar")) return;

  customElements.define(
    "announcement-bar",
    class extends HTMLElement {
      constructor() {
        super();
        this.slider = this.querySelector(selectors.slider);
        const slideIds = [...this.querySelectorAll(selectors.tickerSlide)]
          .map((slide) => slide.dataset.blockId || slide.dataset.slide)
          .filter(Boolean);
        this.slidesCount = slideIds.length ? new Set(slideIds).size : this.querySelectorAll(selectors.tickerSlide).length;
        this.wrapper = this.closest(selectors.wrapper);
        this.closeButton = this.wrapper?.querySelector(selectors.closeButton);
        this.cookieName = this.wrapper?.dataset.announcementCookieName || "announcement_bar_closed";
        this.isClosing = false;
        this.resizeEvent = this.resize.bind(this);
        this.closeEvent = this.close.bind(this);
      }

      connectedCallback() {
        if (this.hasDismissedCookie()) {
          this.applyClosedState();
        } else {
          this.removeClosedState();
        }

        this.addEventListener("theme:slider:loaded", () => {
          this.querySelectorAll(selectors.ticker)?.forEach((ticker) => {
            ticker.dispatchEvent(new CustomEvent("theme:ticker:refresh"));
          });
        });

        this.addEventListener("theme:countdown:hide", (event) => {
          if (window.Shopify.designMode) return;

          const marquee = event.target.closest(selectors.marquee);

          if (this.slidesCount < 2) {
            this.querySelector(selectors.ticker).style.display = "none";
          }

          if (marquee) {
            const slide = event.target.closest(selectors.tickerSlide);
            this.removeTickerText(slide);
          } else {
            const slide = event.target.closest(selectors.slide);
            this.removeSlide(slide);
          }
        });

        const refreshTickers = () => {
          this.querySelectorAll(selectors.ticker)?.forEach((ticker) => {
            ticker.dispatchEvent(new CustomEvent("theme:ticker:refresh"));
          });
          this.removeEventListener("theme:countdown:expire", refreshTickers);
        };

        this.addEventListener("theme:countdown:expire", refreshTickers);
        this.closeButton?.addEventListener("click", this.closeEvent);
        document.addEventListener("theme:resize:width", this.resizeEvent);
        document.dispatchEvent(new CustomEvent("theme:announcement:init", { bubbles: true }));
      }

      resize() {
        this.slider?.dispatchEvent(new CustomEvent("theme:slider:init", { bubbles: false }));
        this.slider?.dispatchEvent(new CustomEvent("theme:slider:reposition", { bubbles: false }));
      }

      close() {
        if (!this.wrapper || this.isClosing) return;

        this.isClosing = true;
        this.setDismissedCookie();
        this.applyClosedState();
      }

      hasDismissedCookie() {
        const prefix = `${this.cookieName}=`;

        return document.cookie.split("; ").some((cookie) => cookie.startsWith(prefix));
      }

      setDismissedCookie() {
        document.cookie = `${this.cookieName}=1; path=/; max-age=86400; samesite=lax`;
      }

      applyClosedState() {
        this.wrapper?.classList.add("announcement__wrapper--closing");
      }

      removeClosedState() {
        this.wrapper?.classList.remove("announcement__wrapper--closing");
      }

      removeSlide(slide) {
        this.slider?.dispatchEvent(
          new CustomEvent("theme:slider:remove-slide", {
            bubbles: false,
            detail: { slide }
          })
        );
      }

      removeTickerText(slide) {
        const ticker = slide?.closest(selectors.ticker);
        slide?.remove();
        ticker?.dispatchEvent(new CustomEvent("theme:ticker:refresh"));
      }

      disconnectedCallback() {
        document.removeEventListener("theme:resize:width", this.resizeEvent);
        this.closeButton?.removeEventListener("click", this.closeEvent);
      }
    }
  );
})();
