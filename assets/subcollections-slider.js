(function () {
  const sectionSelector = '[data-section-type="subcollections"]';
  const MOBILE_BREAKPOINT = 960;
  const RETRY_DELAY = 120;
  const MAX_RETRIES = 40;

  const swiperInstances = window.__subcollectionsSwipers || {};
  window.__subcollectionsSwipers = swiperInstances;
  const pendingRetries = window.__subcollectionsSwiperRetries || {};
  window.__subcollectionsSwiperRetries = pendingRetries;

  function isMobile() {
    return window.innerWidth < MOBILE_BREAKPOINT;
  }

  function initSwiper(section, sectionId, swiperElement) {
    if (swiperInstances[sectionId]) return;

    swiperInstances[sectionId] = new Swiper(swiperElement, {
      slidesPerView: 2.2,
      breakpoints: {
        768: {
          slidesPerView: 3,
        },
      },
      spaceBetween: 20,
      freeMode: true,
      loop: false,
    });
  }

  function destroySwiper(sectionId) {
    if (!swiperInstances[sectionId]) return;

    swiperInstances[sectionId].destroy(true, true);
    delete swiperInstances[sectionId];
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

    if (isMobile()) {
      if (typeof Swiper === "undefined") {
        scheduleRetry(section, sectionId, attempt || 0);
        return;
      }

      clearPendingRetry(sectionId);
      initSwiper(section, sectionId, swiperElement);
    } else {
      clearPendingRetry(sectionId);
      destroySwiper(sectionId);
    }
  }

  function syncAll(root) {
    if (root && root.matches && root.matches(sectionSelector)) {
      syncSection(root);
      return;
    }

    const scope = root || document;
    scope.querySelectorAll(sectionSelector).forEach(syncSection);
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
