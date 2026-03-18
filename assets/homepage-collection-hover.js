(() => {
  const sectionSelector = '[data-section-type="homepage-collection-hover"]';
  const initializedAttribute = 'data-homepage-collection-hover-initialized';
  const activeSections = new Set();

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

  const setupMobileProgress = (section) => {
    const container = section.querySelector('.homepage-collection-hover__mobile');
    const slider = section.querySelector('.homepage-collection-hover__mobile-slider');

    if (!container || !slider) {
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

  const updateState = (section, targetId) => {
    if (!section || !targetId) {
      return;
    }

    const nextTrigger = section.querySelector(`[data-hover-target="${targetId}"]`);
    const nextImage = section.querySelector(`#${targetId}`);
    const currentTrigger = section.querySelector('[data-hover-target].is-selected');
    const currentImage = section.querySelector('[data-collection-image].is-visible');

    if (!nextTrigger || !nextImage || nextImage === currentImage) {
      return;
    }

    if (currentTrigger) {
      currentTrigger.classList.remove('is-selected');
    }

    if (currentImage) {
      currentImage.classList.remove('is-visible');
    }

    nextTrigger.classList.add('is-selected');
    nextImage.classList.add('is-visible');
  };

  const initSection = (section) => {
    if (!section) {
      return;
    }

    activeSections.add(section);

    if (!section.hasAttribute(initializedAttribute)) {
      section.setAttribute(initializedAttribute, 'true');

      const triggers = section.querySelectorAll('[data-hover-target]');

      triggers.forEach((trigger) => {
        const targetId = trigger.getAttribute('data-hover-target');

        if (!targetId) {
          return;
        }

        const handleActivate = () => updateState(section, targetId);
        trigger.addEventListener('mouseenter', handleActivate);
        trigger.addEventListener('focus', handleActivate);
      });
    }

    setupMobileProgress(section);

    const selectedTrigger = section.querySelector('[data-hover-target].is-selected');

    if (selectedTrigger) {
      updateState(section, selectedTrigger.getAttribute('data-hover-target'));
      return;
    }

    const firstTrigger = section.querySelector('[data-hover-target]');

    if (firstTrigger) {
      updateState(section, firstTrigger.getAttribute('data-hover-target'));
    }
  };

  const initAllSections = (root) => {
    if (root instanceof Element && root.matches(sectionSelector)) {
      initSection(root);
      return;
    }

    const scope = root instanceof Element ? root : document;
    scope.querySelectorAll(sectionSelector).forEach((section) => {
      initSection(section);
    });
  };

  if (!window.__homepageCollectionHoverInitialized) {
    window.__homepageCollectionHoverInitialized = true;

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

        setupMobileProgress(section);
      });
    };

    document.addEventListener('theme:resize:width', refreshActiveSections);
    window.addEventListener('resize', refreshActiveSections, {passive: true});
  } else {
    initAllSections();
  }
})();
