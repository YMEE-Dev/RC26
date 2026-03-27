(function () {
  const sectionSelector = '[data-section-type="subcollections"]';
  const MOBILE_BREAKPOINT = 960;

  const swiperInstances = window.__subcollectionsSwipers || {};
  window.__subcollectionsSwipers = swiperInstances;

  function isMobile() {
    return window.innerWidth < MOBILE_BREAKPOINT;
  }

  function initSwiper(section, sectionId, swiperElement) {
    if (swiperInstances[sectionId]) return;

    swiperInstances[sectionId] = new Swiper(swiperElement, {
      slidesPerView: 1,
      spaceBetween: 20,
      loop: false
    });
  }

  function destroySwiper(sectionId) {
    if (!swiperInstances[sectionId]) return;

    swiperInstances[sectionId].destroy(true, true);
    delete swiperInstances[sectionId];
  }

  function syncSection(section) {
    if (!section) return;

    const sectionId = section.dataset.sectionId;
    const swiperElement = section.querySelector('[data-subcollections-swiper]');

    if (!sectionId || !swiperElement || typeof Swiper === 'undefined') return;

    if (isMobile()) {
      initSwiper(section, sectionId, swiperElement);
    } else {
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

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        syncAll();
      });
    } else {
      syncAll();
    }

    window.addEventListener('resize', function () {
      syncAll();
    });

    document.addEventListener('shopify:section:load', function (event) {
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
