'use strict';

function applyModelViewerCameraDefaults(modelViewer) {
  if (!modelViewer || modelViewer.dataset.cameraPatched === 'true') return;

  modelViewer.dataset.cameraPatched = 'true';

  const apply = () => {
    if (!modelViewer.hasAttribute('auto-rotate')) modelViewer.setAttribute('auto-rotate', '');
    if (!modelViewer.hasAttribute('auto-rotate-delay')) modelViewer.setAttribute('auto-rotate-delay', '0');
    if (!modelViewer.hasAttribute('rotation-per-second')) modelViewer.setAttribute('rotation-per-second', '20deg');

    if (!modelViewer.hasAttribute('disable-zoom')) modelViewer.setAttribute('disable-zoom', '');
    if (!modelViewer.style.touchAction) modelViewer.style.touchAction = 'pan-y';

    if (!modelViewer.hasAttribute('shadow-intensity')) modelViewer.setAttribute('shadow-intensity', '0.2');
    if (!modelViewer.hasAttribute('shadow-softness')) modelViewer.setAttribute('shadow-softness', '0.8');

    if (!modelViewer.hasAttribute('camera-orbit')) modelViewer.setAttribute('camera-orbit', '0deg 75deg 200%');
    if (!modelViewer.hasAttribute('field-of-view')) modelViewer.setAttribute('field-of-view', '55deg');
    if (!modelViewer.hasAttribute('min-camera-orbit')) modelViewer.setAttribute('min-camera-orbit', 'auto auto 140%');
    if (!modelViewer.hasAttribute('max-camera-orbit')) modelViewer.setAttribute('max-camera-orbit', 'auto auto 300%');
    if (!modelViewer.hasAttribute('camera-target')) modelViewer.setAttribute('camera-target', '0m 0.3m 0m');
  };

  apply();
}

function patchModelViewersInDocument() {
  document.querySelectorAll('product-model model-viewer').forEach(applyModelViewerCameraDefaults);
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', patchModelViewersInDocument);
  } else {
    patchModelViewersInDocument();
  }

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((m) => {
      m.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;

        if (node.matches && node.matches('model-viewer')) {
          if (node.closest('product-model')) applyModelViewerCameraDefaults(node);
          return;
        }

        if (node.querySelectorAll) {
          node.querySelectorAll('product-model model-viewer').forEach(applyModelViewerCameraDefaults);
        }
      });
    });
  });

  try {
    observer.observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {
    
  }
}

function defineProductModelWhenReady() {
  if (customElements.get('product-model')) return true;
  if (!window.theme || !window.theme.DeferredMedia) return false;

  class ProductModel extends window.theme.DeferredMedia {
    constructor() {
      super();
    }

    loadContent() {
      super.loadContent();

      if (!window.Shopify || !Shopify.loadFeatures) return;

      Shopify.loadFeatures([
        {
          name: 'model-viewer-ui',
          version: '1.0',
          onLoad: this.setupModelViewerUI.bind(this)
        }
      ]);
    }

    setupModelViewerUI(errors) {
      if (errors) return;
      if (this.modelViewerUI) return;

      const modelViewer = this.querySelector('model-viewer');
      if (!modelViewer || !window.Shopify || !Shopify.ModelViewerUI) return;

      this.modelViewerUI = new Shopify.ModelViewerUI(modelViewer);

      applyModelViewerCameraDefaults(modelViewer);
    }
  }

  customElements.define('product-model', ProductModel);
  return true;
}

if (!defineProductModelWhenReady()) {
  customElements.whenDefined('deferred-media').then(() => {
    defineProductModelWhenReady();
  });
}
