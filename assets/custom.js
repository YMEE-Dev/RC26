/*
* Broadcast Theme
*
* Use this file to add custom Javascript to Broadcast.  Keeping your custom
* Javascript in this file will make it easier to update Broadcast.
*/


(function() {
  // Add custom code below this line
  const currentScript = document.currentScript;
  const homepageProductSlidersSrc = currentScript && currentScript.dataset
    ? currentScript.dataset.homepageProductSlidersSrc
    : '';

  if (homepageProductSlidersSrc) {
    const existingScript = document.querySelector(`script[src="${homepageProductSlidersSrc}"]`);

    if (!existingScript) {
      const homepageProductSlidersScript = document.createElement('script');
      homepageProductSlidersScript.src = homepageProductSlidersSrc;
      homepageProductSlidersScript.defer = true;
      homepageProductSlidersScript.setAttribute('data-homepage-product-sliders-script', 'true');
      document.head.appendChild(homepageProductSlidersScript);
    }
  }


  




  // ^^ Keep your scripts inside this IIFE function call to 
  // avoid leaking your variables into the global scope.
})();
