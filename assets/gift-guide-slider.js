(function() {
  const sectionSelector = '[data-section-type="gift-guide-slider"]';

  const swiperInstances = window.__giftGuideSliderSwipers || {};
  window.__giftGuideSliderSwipers = swiperInstances;

  function ensureProgress(container) {
    let progress = container.querySelector('[data-related-slider-progress]');

    if (!progress) {
      progress = document.createElement('div');
      progress.className = 'related-slider-progress';
      progress.setAttribute('data-related-slider-progress', '');
      progress.innerHTML = '<span class="related-slider-progress__line"></span>';
      container.append(progress);
    }

    return progress;
  }

  function updateProgress(sectionId) {
    const swiper = swiperInstances[sectionId];

    if (!swiper || swiper.destroyed) {
      return;
    }

    const section = document.querySelector(
      `${sectionSelector}[data-section-id="${sectionId}"]`
    );
    const container = section ? section.querySelector('.gift-guide-slider__carousel-container') : null;
    const progress = container ? ensureProgress(container) : null;
    const sliderElement = swiper.el;
    const trackElement = swiper.wrapperEl;

    if (!progress || !sliderElement || !trackElement) {
      return;
    }

    const isScrollable = trackElement.scrollWidth > sliderElement.clientWidth + 1 && swiper.snapGrid.length > 1;
    progress.classList.toggle('hidden', !isScrollable);

    if (!isScrollable) {
      progress.style.setProperty('--related-slider-progress', '0%');
      return;
    }

    const currentOffset = Math.abs(swiper.translate || 0);
    const progressPercent = ((currentOffset + sliderElement.clientWidth) / trackElement.scrollWidth) * 100;
    const safeProgress = Math.max(0, Math.min(100, progressPercent));
    progress.style.setProperty('--related-slider-progress', `${safeProgress}%`);
  }

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
      mousewheel: {
        enabled: true,
        forceToAxis: true,
        releaseOnEdges: true,
        sensitivity: 1
      },
      on: {
        afterInit() {
          requestAnimationFrame(() => updateProgress(sectionId));
        },
        progress() {
          requestAnimationFrame(() => updateProgress(sectionId));
        },
        resize() {
          requestAnimationFrame(() => updateProgress(sectionId));
        },
        breakpoint() {
          requestAnimationFrame(() => updateProgress(sectionId));
        },
        lock() {
          requestAnimationFrame(() => updateProgress(sectionId));
        },
        unlock() {
          requestAnimationFrame(() => updateProgress(sectionId));
        },
        update() {
          requestAnimationFrame(() => updateProgress(sectionId));
        }
      },
      breakpoints: {
        960: { slidesPerView: 2.7, spaceBetween: 80 },
        1200: { slidesPerView: 2.7, spaceBetween: 80 }
      }
    });

    requestAnimationFrame(() => updateProgress(sectionId));
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
