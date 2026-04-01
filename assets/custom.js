/*
* Broadcast Theme
*
* Use this file to add custom Javascript to Broadcast.  Keeping your custom
* Javascript in this file will make it easier to update Broadcast.
*/


(function() {
  // Add custom code below this line
  const currentScript = document.currentScript;
  const dataset = currentScript && currentScript.dataset ? currentScript.dataset : {};

  const loadScriptOnce = (src, marker) => {
    if (!src) {
      return;
    }

    const existingScript = document.querySelector(`script[src="${src}"]`);
    if (existingScript) {
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    script.setAttribute(marker, 'true');
    document.head.appendChild(script);
  };

  loadScriptOnce(dataset.homepageProductSlidersSrc || '', 'data-homepage-product-sliders-script');
  loadScriptOnce(dataset.homepageFloatingImageSrc || '', 'data-homepage-floating-image-script');
  loadScriptOnce(dataset.homepageStackedImagesSrc || '', 'data-homepage-stacked-images-script');
  loadScriptOnce(dataset.homepageCollectionSpotlightSrc || '', 'data-homepage-collection-spotlight-script');
  loadScriptOnce(dataset.homepageCollectionHoverSrc || '', 'data-homepage-collection-hover-script');
  loadScriptOnce(dataset.blogHeaderVideoSrc || '', 'data-blog-header-video-script');


  




  // ^^ Keep your scripts inside this IIFE function call to 
  // avoid leaking your variables into the global scope.
})();
