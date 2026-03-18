(() => {
  const sectionSelector = '[data-section-type="homepage-collection-spotlight"]';

  const initSection = (section) => {
    if (!section) {
      return;
    }

    window.requestAnimationFrame(() => {
      section.querySelectorAll('grid-slider').forEach((slider) => {
        slider.dispatchEvent(new CustomEvent('theme:grid-slider:init', {bubbles: true}));
      });
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
  } else {
    initAllSections();
  }
})();
