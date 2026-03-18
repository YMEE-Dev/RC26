(() => {
  const sectionSelector = '[data-section-type="homepage-collection-hover"]';
  const initializedAttribute = 'data-homepage-collection-hover-initialized';

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
    if (!section || section.hasAttribute(initializedAttribute)) {
      return;
    }

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

    const selectedTrigger = section.querySelector('[data-hover-target].is-selected');

    if (selectedTrigger) {
      updateState(section, selectedTrigger.getAttribute('data-hover-target'));
      return;
    }

    const firstTrigger = triggers[0];

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
  } else {
    initAllSections();
  }
})();
