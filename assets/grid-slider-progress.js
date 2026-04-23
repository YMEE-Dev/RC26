(() => {
  if (window.themeGridSliderProgressInitialized) {
    return;
  }

  window.themeGridSliderProgressInitialized = true;

  const sectionSelector = '[data-grid-slider-progress-section]';
  const relatedSliderSelector = '[data-grid-slider]';
  const gridItemSelector = '[data-grid-item]';
  const progressSelector = ':scope > [data-grid-slider-progress]';
  const activeSections = new Set();
  const initializedSections = new WeakSet();

  const getClosestSlideIndex = (items, slider) => {
    let closestIndex = 0;
    let minDistance = Number.POSITIVE_INFINITY;

    items.forEach((item, index) => {
      const distance = Math.abs(item.offsetLeft - slider.scrollLeft);

      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    return closestIndex;
  };

  const setupProgress = (gridSlider) => {
    const slider = gridSlider.querySelector(relatedSliderSelector);

    if (!slider) {
      return;
    }

    let progress = gridSlider.querySelector(progressSelector);

    if (!progress) {
      progress = document.createElement('div');
      progress.className = 'related-slider-progress';
      progress.setAttribute('data-grid-slider-progress', '');
      progress.innerHTML = '<span class="related-slider-progress__line"></span>';
      gridSlider.append(progress);
    }

    const syncSliderState = (items) => {
      if (!slider.classList.contains('grid--slider')) {
        return;
      }

      const shouldDisableSlider = items.length <= 4;
      const isSliderDisabled = slider.classList.contains('grid--slider-disabled');

      if (shouldDisableSlider !== isSliderDisabled) {
        slider.classList.toggle('grid--slider-disabled', shouldDisableSlider);
        gridSlider.dispatchEvent(new CustomEvent('theme:grid-slider:init'));
      }
    };

    const updateActive = () => {
      const items = Array.from(slider.querySelectorAll(gridItemSelector));
      syncSliderState(items);

      if (items.length < 2) {
        progress.classList.add('hidden');
        progress.style.setProperty('--related-slider-progress', '0%');
        return;
      }

      const isScrollable = slider.scrollWidth > slider.clientWidth + 1;
      progress.classList.toggle('hidden', !isScrollable);

      if (!isScrollable) {
        progress.style.setProperty('--related-slider-progress', '0%');
        return;
      }

      const maxScroll = Math.max(slider.scrollWidth - slider.clientWidth, 1);
      const progressPercent = (slider.scrollLeft / maxScroll) * 100;
      const safeProgress = Math.max(0, Math.min(100, progressPercent));

      progress.style.setProperty('--related-slider-progress', `${safeProgress}%`);
    };

    if (!slider.hasAttribute('data-grid-slider-progress-bound')) {
      slider.addEventListener(
        'scroll',
        () => {
          requestAnimationFrame(updateActive);
        },
        {passive: true}
      );
      slider.setAttribute('data-grid-slider-progress-bound', 'true');
    }

    if (!slider.hasAttribute('data-grid-slider-progress-observer-bound')) {
      const observer = new MutationObserver(() => {
        requestAnimationFrame(updateActive);
      });

      observer.observe(slider, {childList: true, subtree: true});
      slider.setAttribute('data-grid-slider-progress-observer-bound', 'true');
    }

    if (!slider.hasAttribute('data-grid-slider-progress-resize-bound') && window.ResizeObserver) {
      const resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(updateActive);
      });

      resizeObserver.observe(slider);
      slider.setAttribute('data-grid-slider-progress-resize-bound', 'true');
    }

    if (!gridSlider.hasAttribute('data-grid-slider-progress-arrow-bound')) {
      gridSlider.addEventListener('click', (event) => {
        const arrow = event.target.closest('[data-button-arrow]');

        if (!arrow || !gridSlider.contains(arrow)) {
          return;
        }

        const items = Array.from(slider.querySelectorAll(gridItemSelector));

        if (items.length < 2) {
          return;
        }

        const firstVisibleSlide = slider.querySelector(`${gridItemSelector}.is-visible`);
        let currentIndex = firstVisibleSlide ? items.indexOf(firstVisibleSlide) : getClosestSlideIndex(items, slider);

        if (currentIndex < 0) {
          currentIndex = 0;
        }

        let targetIndex = currentIndex;

        if (arrow.hasAttribute('data-button-prev')) {
          targetIndex = Math.max(0, currentIndex - 1);
        }

        if (arrow.hasAttribute('data-button-next')) {
          targetIndex = Math.min(items.length - 1, currentIndex + 1);
        }

        if (targetIndex === currentIndex) {
          return;
        }

        event.preventDefault();
        slider.scrollTo({
          top: 0,
          left: items[targetIndex].offsetLeft,
          behavior: 'smooth',
        });
      });

      gridSlider.setAttribute('data-grid-slider-progress-arrow-bound', 'true');
    }

    if (!gridSlider.hasAttribute('data-grid-slider-progress-init-bound')) {
      gridSlider.addEventListener('theme:grid-slider:init', () => {
        requestAnimationFrame(updateActive);
      });
      gridSlider.setAttribute('data-grid-slider-progress-init-bound', 'true');
    }

    updateActive();
  };

  const initProgressForSection = (section) => {
    section.querySelectorAll('grid-slider').forEach((gridSlider) => {
      setupProgress(gridSlider);
    });
  };

  const bindSection = (section) => {
    if (!section || initializedSections.has(section)) {
      return;
    }

    initializedSections.add(section);
    activeSections.add(section);

    const initProgress = () => {
      initProgressForSection(section);
    };

    section.addEventListener('theme:tab:change', initProgress);

    section.querySelectorAll('recently-viewed').forEach((recentlyViewed) => {
      if (recentlyViewed.hasAttribute('data-grid-slider-progress-recent-bound')) {
        return;
      }

      recentlyViewed.addEventListener('theme:recently-viewed:loaded', initProgress);
      recentlyViewed.setAttribute('data-grid-slider-progress-recent-bound', 'true');
    });

    initProgress();

    requestAnimationFrame(() => {
      requestAnimationFrame(initProgress);
    });
  };

  const initAllSections = () => {
    document.querySelectorAll(sectionSelector).forEach((section) => {
      bindSection(section);
    });
  };

  const refreshActiveSections = () => {
    const staleSections = [];

    activeSections.forEach((section) => {
      if (!document.body.contains(section)) {
        staleSections.push(section);
        return;
      }

      initProgressForSection(section);
    });

    staleSections.forEach((section) => {
      activeSections.delete(section);
    });
  };

  document.addEventListener('shopify:section:load', (event) => {
    const container = event.target instanceof Element ? event.target : null;

    if (!container) {
      return;
    }

    if (container.matches(sectionSelector)) {
      bindSection(container);
    }

    container.querySelectorAll(sectionSelector).forEach((section) => {
      bindSection(section);
    });
  });

  document.addEventListener('shopify:section:unload', (event) => {
    const container = event.target instanceof Element ? event.target : null;

    if (!container) {
      return;
    }

    if (container.matches(sectionSelector)) {
      activeSections.delete(container);
    }

    container.querySelectorAll(sectionSelector).forEach((section) => {
      activeSections.delete(section);
    });
  });

  document.addEventListener('theme:resize:width', refreshActiveSections);
  window.addEventListener('resize', refreshActiveSections, {passive: true});
  window.addEventListener('load', refreshActiveSections, {passive: true});

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAllSections, {once: true});
  } else {
    initAllSections();
  }
})();
