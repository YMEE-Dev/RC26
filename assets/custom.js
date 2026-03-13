/*
* Broadcast Theme
*
* Use this file to add custom Javascript to Broadcast.  Keeping your custom
* Javascript in this file will make it easier to update Broadcast.
*/


(function() {
  // Add custom code below this line
  const currentScript = document.currentScript;
  const homepageProductListSrc = currentScript && currentScript.dataset
    ? currentScript.dataset.homepageProductListSrc
    : '';

  if (homepageProductListSrc) {
    const existingScript = document.querySelector(`script[src="${homepageProductListSrc}"]`);

    if (!existingScript) {
      const homepageProductListScript = document.createElement('script');
      homepageProductListScript.src = homepageProductListSrc;
      homepageProductListScript.defer = true;
      homepageProductListScript.setAttribute('data-homepage-product-list-script', 'true');
      document.head.appendChild(homepageProductListScript);
    }
  }


  




  // ^^ Keep your scripts inside this IIFE function call to 
  // avoid leaking your variables into the global scope.
})();
