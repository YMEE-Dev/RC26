(function () {
  const sectionSelector = '[data-section-type="subcollections"]';
  const RETRY_DELAY = 120;
  const MAX_RETRIES = 40;
  const HINT_CLASS = "subcollections__swiper--swipe-hint";

  const swiperInstances = window.__subcollectionsSwipers || {};
  window.__subcollectionsSwipers = swiperInstances;
  const pendingRetries = window.__subcollectionsSwiperRetries || {};
  window.__subcollectionsSwiperRetries = pendingRetries;
  const interactedSections = window.__subcollectionsSwiperInteracted || {};
  window.__subcollectionsSwiperInteracted = interactedSections;

  function enableSwipeHint(sectionId, swiperElement) {
    const swiper = swiperInstances[sectionId];

    if (!swiper || swiper.destroyed) {
      return;
    }

    swiper.update();

    const isScrollable = Math.abs(swiper.maxTranslate() - swiper.minTranslate()) > 1;

    if (interactedSections[sectionId] || !isScrollable) {
      swiperElement.classList.remove(HINT_CLASS);
      return;
    }

    swiperElement.classList.add(HINT_CLASS);

    if (swiperElement.dataset.subcollectionsHintStopBound === sectionId) {
      return;
    }

    swiperElement.dataset.subcollectionsHintStopBound = sectionId;

    const stopHint = function () {
      if (interactedSections[sectionId]) return;

      interactedSections[sectionId] = true;
      swiperElement.classList.remove(HINT_CLASS);
    };

    ["pointerdown", "touchstart", "mousedown", "wheel"].forEach(function (eventName) {
      swiperElement.addEventListener(eventName, stopHint, { once: true, passive: true });
    });
  }

  function initSwiper(section, sectionId, swiperElement) {
    if (swiperInstances[sectionId]) return;

    swiperInstances[sectionId] = new Swiper(swiperElement, {
      slidesPerView: 2.2,
      spaceBetween: 20,
      freeMode: true,
      loop: false,
      breakpoints: {
        768: {
          slidesPerView: 3,
        },
        960: {
          slidesPerView: "auto",
          spaceBetween: 50,
          centerInsufficientSlides: true,
        },
      },
    });

    /* Enable swipe hint after entrance animation completes + pause before bouncing */
    document.addEventListener('theme:subcollections:animated', function () {
      setTimeout(function () {
        enableSwipeHint(sectionId, swiperElement);
      }, 1500);
    }, { once: true });

    /* Fallback: show hint if animation event never fires (e.g. no header animation on page) */
    setTimeout(function () {
      enableSwipeHint(sectionId, swiperElement);
    }, 7000);
  }

  function clearPendingRetry(sectionId) {
    if (!pendingRetries[sectionId]) return;

    clearTimeout(pendingRetries[sectionId]);
    delete pendingRetries[sectionId];
  }

  function scheduleRetry(section, sectionId, attempt) {
    if (!sectionId || attempt >= MAX_RETRIES || pendingRetries[sectionId]) return;

    pendingRetries[sectionId] = window.setTimeout(function () {
      delete pendingRetries[sectionId];
      syncSection(section, attempt + 1);
    }, RETRY_DELAY);
  }

  function syncSection(section, attempt) {
    if (!section) return;

    const sectionId = section.dataset.sectionId;
    const swiperElement = section.querySelector("[data-subcollections-swiper]");

    if (!sectionId || !swiperElement) return;

    if (typeof Swiper === "undefined") {
      scheduleRetry(section, sectionId, attempt || 0);
      return;
    }

    clearPendingRetry(sectionId);
    initSwiper(section, sectionId, swiperElement);
  }

  function syncAll(root) {
    if (root && root.matches && root.matches(sectionSelector)) {
      syncSection(root);
      return;
    }

    const scope = root || document;
    scope.querySelectorAll(sectionSelector).forEach(syncSection);
  }

  function refreshHints() {
    Object.keys(swiperInstances).forEach(function (sectionId) {
      const swiper = swiperInstances[sectionId];

      if (swiper && !swiper.destroyed) {
        enableSwipeHint(sectionId, swiper.el);
      }
    });
  }

  if (!window.__subcollectionsSliderInitialized) {
    window.__subcollectionsSliderInitialized = true;

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () {
        syncAll();
      });
    } else {
      syncAll();
    }

    window.addEventListener("resize", function () {
      syncAll();
      refreshHints();
    });

    document.addEventListener("shopify:section:load", function (event) {
      const target = event.target;
      const section =
        target && target.matches && target.matches(sectionSelector)
          ? target
          : target && target.querySelector
            ? target.querySelector(sectionSelector)
            : null;

      if (section) syncSection(section);
    });
  } else {
    syncAll();
  }
})();
