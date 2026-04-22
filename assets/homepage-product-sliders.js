(() => {
  const sectionSelector = '[data-section-type="homepage-product-sliders"]';
  const initializedSections = new WeakSet();

  const syncSelectedTabs = (section) => {
    section.querySelectorAll('.tab-link-item').forEach((item) => {
      const trigger = item.querySelector('.tab-link[data-tab]');
      const isSelected = Boolean(trigger && trigger.classList.contains('current'));

      item.classList.toggle('selected', isSelected);
    });
  };

  const bindSection = (section) => {
    if (!section || initializedSections.has(section)) {
      return;
    }

    initializedSections.add(section);

    const syncTabs = () => {
      syncSelectedTabs(section);
    };

    section.addEventListener('theme:tab:change', syncTabs);

    syncTabs();
  };

  const initAllSections = () => {
    document.querySelectorAll(sectionSelector).forEach((section) => {
      bindSection(section);
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
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAllSections, {once: true});
  } else {
    initAllSections();
  }
})();
