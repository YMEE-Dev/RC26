(() => {
  const sectionSelector = '[data-section-type="homepage-stacked-images"]';

  const initSection = (section) => {
    if (!section) {
      return;
    }
  };

  const initAllSections = () => {
    document.querySelectorAll(sectionSelector).forEach((section) => {
      initSection(section);
    });
  };

  if (!window.__homepageStackedImagesInitialized) {
    window.__homepageStackedImagesInitialized = true;

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initAllSections, {once: true});
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
