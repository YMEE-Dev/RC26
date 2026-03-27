(() => {
  const sectionSelector = '[data-section-type="homepage-floating-image"]';
  const initializedSections = new WeakSet();

  const initSection = (section) => {
    if (!section || initializedSections.has(section)) {
      return;
    }

    initializedSections.add(section);
  };

  const initAllSections = () => {
    document.querySelectorAll(sectionSelector).forEach((section) => {
      initSection(section);
    });
  };

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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAllSections, {once: true});
  } else {
    initAllSections();
  }
})();
