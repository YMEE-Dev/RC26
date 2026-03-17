(function() {
  const sectionSelector = '[data-section-type="gift-guide-slider"]';

  const swiperInstances = window.__giftGuideSliderSwipers || {};
  window.__giftGuideSliderSwipers = swiperInstances;

  function initSection(section) {
    if (!section) {
      return;
    }

    const sectionId = section.dataset.sectionId;
    const swiperElement = section.querySelector('.gift-guide-slider__swiper');

    if (!sectionId || !swiperElement || typeof Swiper === 'undefined') {
      return;
    }

    if (swiperInstances[sectionId]) {
      swiperInstances[sectionId].destroy(true, true);
      delete swiperInstances[sectionId];
    }

    swiperInstances[sectionId] = new Swiper(swiperElement, {
      slidesPerView: 1,
      spaceBetween: 80,
      loop: false,
      smooth: true,
      breakpoints: {
        640: { slidesPerView: 2, spaceBetween: 80 },
        990: { slidesPerView: 2.7, spaceBetween: 80 },
        1200: { slidesPerView: 2.7, spaceBetween: 80 }
      }
    });
  }

  function initAll(root) {
    if (root && root.matches && root.matches(sectionSelector)) {
      initSection(root);
      return;
    }

    const scope = root || document;
    scope.querySelectorAll(sectionSelector).forEach(initSection);
  }

  if (!window.__giftGuideSliderInitialized) {
    window.__giftGuideSliderInitialized = true;

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        initAll();
      });
    } else {
      initAll();
    }

    document.addEventListener('shopify:section:load', function(event) {
      const target = event.target;
      const section = target && target.matches && target.matches(sectionSelector)
        ? target
        : target && target.querySelector
          ? target.querySelector(sectionSelector)
          : null;

      if (section) {
        initSection(section);
      }
    });
  } else {
    initAll();
  }
})();
