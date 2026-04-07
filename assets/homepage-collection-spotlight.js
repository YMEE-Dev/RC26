(() => {
  const sectionSelector = '[data-section-type="homepage-collection-spotlight"]';
  const activeSections = new Set();
  const initializedSections = new WeakSet();

  const ensureProgress = (container) => {
    let progress = container.querySelector('[data-related-slider-progress]');

    if (!progress) {
      progress = document.createElement('div');
      progress.className = 'related-slider-progress';
      progress.setAttribute('data-related-slider-progress', '');
      progress.innerHTML = '<span class="related-slider-progress__line"></span>';
      container.append(progress);
    }

    return progress;
  };

  const setupProgress = (container) => {
    const slider = container.querySelector('[data-grid-slider]');

    if (!slider) {
      return;
    }

    const progress = ensureProgress(container);

    const updateProgress = () => {
      const isVisible = slider.clientWidth > 0;
      const isScrollable = isVisible && slider.scrollWidth > slider.clientWidth + 1;
      progress.classList.toggle('hidden', !isScrollable);

      if (!isScrollable) {
        progress.style.setProperty('--related-slider-progress', '0%');
        return;
      }

      const progressPercent = ((slider.scrollLeft + slider.clientWidth) / slider.scrollWidth) * 100;
      const safeProgress = Math.max(0, Math.min(100, progressPercent));
      progress.style.setProperty('--related-slider-progress', `${safeProgress}%`);
    };

    if (!slider.hasAttribute('data-related-progress-bound')) {
      slider.addEventListener(
        'scroll',
        () => {
          requestAnimationFrame(updateProgress);
        },
        {passive: true}
      );
      slider.setAttribute('data-related-progress-bound', 'true');
    }

    if (!slider.hasAttribute('data-related-progress-observer-bound')) {
      const observer = new MutationObserver(() => {
        requestAnimationFrame(updateProgress);
      });

      observer.observe(slider, {childList: true, subtree: true});
      slider.setAttribute('data-related-progress-observer-bound', 'true');
    }

    if (!slider.hasAttribute('data-related-progress-resize-bound') && window.ResizeObserver) {
      const resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(updateProgress);
      });

      resizeObserver.observe(slider);
      slider.setAttribute('data-related-progress-resize-bound', 'true');
    }

    updateProgress();
  };

  const refreshSection = (section) => {
    if (!section) {
      return;
    }

    section.querySelectorAll('.homepage-collection-spotlight__products').forEach((container) => {
      setupProgress(container);
    });
  };

  const initSection = (section) => {
    if (!section) {
      return;
    }

    if (!initializedSections.has(section)) {
      initializedSections.add(section);
      activeSections.add(section);
      section.addEventListener('theme:grid-slider:init', () => {
        refreshSection(section);
      });
    }

    window.requestAnimationFrame(() => {
      section.querySelectorAll('grid-slider').forEach((slider) => {
        slider.dispatchEvent(new CustomEvent('theme:grid-slider:init', {bubbles: true}));
      });
      refreshSection(section);
    });
  };

  const initAllSections = (root) => {
    if (root && root.matches && root.matches(sectionSelector)) {
      initSection(root);
      return;
    }

    const scope = root || document;
    scope.querySelectorAll(sectionSelector).forEach((section) => {
      initSection(section);
    });
  };

  if (!window.__homepageCollectionSpotlightInitialized) {
    window.__homepageCollectionSpotlightInitialized = true;

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        initAllSections();
      }, {once: true});
    } else {
      initAllSections();
    }

    document.addEventListener('shopify:section:load', (event) => {
      const container = event.target instanceof Element ? event.target : null;

      if (!container) {
        return;
      }

      if (container.matches(sectionSelector)) {
        initSection(container);
      }

      container.querySelectorAll(sectionSelector).forEach((section) => {
        initSection(section);
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

    const refreshActiveSections = () => {
      activeSections.forEach((section) => {
        if (!document.body.contains(section)) {
          activeSections.delete(section);
          return;
        }

        refreshSection(section);
      });
    };

    document.addEventListener('theme:resize:width', refreshActiveSections);
    window.addEventListener('resize', refreshActiveSections, {passive: true});
  } else {
    initAllSections();
  }
})();
