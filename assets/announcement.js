(() => {
  "use strict";

  const selectors = {
    barHolder: ".announcement__bar-holder",
    closeButton: "[data-announcement-close]",
    marquee: ".announcement__bar-holder--marquee",
    slide: "[data-slide]",
    slider: "[data-slider]",
    ticker: "ticker-bar",
    tickerSlide: ".announcement__slide",
    wrapper: "[data-announcement-wrapper]"
  };

  const attributes = {
    autoHeight: "data-announcement-auto-height"
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
        this.autoHeight = this.wrapper?.hasAttribute(attributes.autoHeight) || false;
        this.isClosing = false;
        this.resizeEvent = this.resize.bind(this);
        this.closeEvent = this.close.bind(this);
        this.syncHeightEvent = this.syncHeight.bind(this);
        this.autoplayHooked = new WeakSet();
      }

      connectedCallback() {
        if (this.hasDismissedCookie()) {
          this.applyClosedState();
        } else {
          this.removeClosedState();
        }

        this.addEventListener("theme:slider:loaded", (event) => {
          this.querySelectorAll(selectors.ticker)?.forEach((ticker) => {
            ticker.dispatchEvent(new CustomEvent("theme:ticker:refresh"));
          });
          this.resumeAutoplayAfterInteraction(event.detail?.slider);
          this.syncHeight();
        });

        // Web fonts change line metrics; a two-line bar measured with the fallback font
        // can be a few px off once the real face paints.
        document.fonts?.ready.then(this.syncHeightEvent);

        this.addEventListener("theme:countdown:hide", (event) => {
          if (window.Shopify.designMode) return;

          const marquee = event.target.closest(selectors.marquee);

          if (this.slidesCount < 2) {
            // Wrapped text slides are plain divs, so a bar can have no <ticker-bar> at all.
            const ticker = this.querySelector(selectors.ticker);
            if (ticker) ticker.style.display = "none";
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
        // Flickity has just re-sized its viewport; measure after this frame's layout.
        requestAnimationFrame(this.syncHeightEvent);
      }

      // Flickity's player stops for good on uiChange/pointerDown; restart it once the user lets go.
      resumeAutoplayAfterInteraction(sliderComponent) {
        const flkty = sliderComponent?.flkty;
        if (!flkty || !flkty.options.autoPlay || this.autoplayHooked.has(flkty)) return;
        this.autoplayHooked.add(flkty);

        const resume = () => {
          if (flkty.player.state === "stopped") flkty.playPlayer();
        };

        flkty.on("uiChange", resume);
        flkty.on("pointerUp", resume);
      }

      // Slider layout with "Wrap text on two lines": --ANNOUNCEMENT-HEIGHT-* on :root is a
      // Liquid guess of a single text line, but a wrapped slide makes the bar taller, and
      // the header offsets itself by var(--announcement-height). Publish the rendered height
      // on <html> (inline style wins over the :root media rules and the :has() rule in
      // nav-menu.css). announcement.css pins the bar's own inner min-heights to the static
      // value so this measurement cannot feed back into itself.
      syncHeight() {
        if (!this.autoHeight || !this.wrapper || !this.isTopBar()) return;
        // fonts.ready can resolve after the editor re-rendered the section; a detached
        // bar measures 0 and would collapse the header offset.
        if (!this.isConnected || this.isClosing || this.hasDismissedCookie()) return;

        // Device-targeted slides are display:none on the other breakpoint. With no visible
        // slide the holder is 0px tall and the bar reserves nothing, exactly as the Liquid
        // value does — don't let the stray close button become the reserved height.
        const holder = this.querySelector(selectors.barHolder);
        const contentHeight = holder ? holder.offsetHeight : 0;
        const height = contentHeight > 0 ? this.wrapper.offsetHeight : 0;

        document.documentElement.style.setProperty("--announcement-height", `${height}px`);
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
        // Collapse the space the header reserves for the bar (--PT in the header
        // consumes --announcement-height). The bar is position:absolute, so this
        // is the whole fix — otherwise a blank strip is left where the bar was.
        if (this.isTopBar()) {
          document.documentElement.style.setProperty("--announcement-height", "0px");
        }
      }

      removeClosedState() {
        this.wrapper?.classList.remove("announcement__wrapper--closing");
        if (this.isTopBar()) {
          document.documentElement.style.removeProperty("--announcement-height");
        }
        this.syncHeight();
      }

      isTopBar() {
        return this.wrapper?.classList.contains("announcement__wrapper--top");
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
        // Drop the measured height when the bar leaves the page (editor removes the section
        // or all its blocks) so the header falls back to the :root value instead of a
        // stale inline one. A re-rendered bar connects afterwards and measures again.
        if (this.autoHeight && this.isTopBar()) {
          document.documentElement.style.removeProperty("--announcement-height");
        }
      }
    }
  );
})();
