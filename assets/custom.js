/*
 * Broadcast Theme
 *
 * Use this file to add custom Javascript to Broadcast.  Keeping your custom
 * Javascript in this file will make it easier to update Broadcast.
 */

(function () {
  // Add custom code below this line
  const currentScript = document.currentScript;
  const dataset = currentScript && currentScript.dataset ? currentScript.dataset : {};
  const newsletterPathPattern = /(^|\/)newsletter$/;

  const loadScriptOnce = (src, marker) => {
    if (!src) {
      return;
    }

    const existingScript = document.querySelector(`script[src="${src}"]`);
    if (existingScript) {
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.defer = true;
    script.setAttribute(marker, "true");
    document.head.appendChild(script);
  };

  loadScriptOnce(dataset.homepageProductSlidersSrc || "", "data-homepage-product-sliders-script");
  loadScriptOnce(dataset.homepageFloatingImageSrc || "", "data-homepage-floating-image-script");
  loadScriptOnce(dataset.homepageStackedImagesSrc || "", "data-homepage-stacked-images-script");
  loadScriptOnce(dataset.homepageCollectionSpotlightSrc || "", "data-homepage-collection-spotlight-script");
  loadScriptOnce(dataset.homepageCollectionHoverSrc || "", "data-homepage-collection-hover-script");
  loadScriptOnce(dataset.headCountryRedirectSrc || "", "data-head-country-redirect-script");
  loadScriptOnce(dataset.blogHeaderVideoSrc || "", "data-blog-header-video-script");
  loadScriptOnce(dataset.giftGuideSliderSrc || "", "data-gift-guide-slider-script");
  loadScriptOnce(dataset.timelineSrc || "", "data-timeline-script");
  loadScriptOnce(dataset.socialVideosSrc || "", "data-social-videos-script");
  loadScriptOnce(dataset.rcTimelineSrc || "", "data-rc-timeline-script");

  const normalizePathname = (pathname) => {
    const normalizedPath = `${pathname || ""}`.trim().toLowerCase().replace(/\/+$/, "");
    return normalizedPath || "/";
  };

  const isNewsletterDrawerLink = (href) => {
    if (!href || href.charAt(0) === "#") {
      return false;
    }

    let parsedUrl = null;

    try {
      parsedUrl = new URL(href, window.location.origin);
    } catch (error) {
      return false;
    }

    if (parsedUrl.origin !== window.location.origin) {
      return false;
    }

    return newsletterPathPattern.test(normalizePathname(parsedUrl.pathname));
  };

  const openNewsletterDrawer = () => {
    const drawerHost = document.querySelector("footer-newsletter-drawer");

    if (!drawerHost) {
      return false;
    }

    if (typeof drawerHost.open === "function") {
      try {
        drawerHost.open();
        return true;
      } catch (error) {}
    }

    const trigger = drawerHost.querySelector("[data-newsletter-drawer-open]");
    const drawer = drawerHost.querySelector("[data-newsletter-drawer]");

    if (!drawer) {
      return false;
    }

    if (trigger) {
      trigger.setAttribute("aria-expanded", "true");
    }

    drawer.classList.add("expanded");
    window.dispatchEvent(new CustomEvent("theme:scroll:lock", { detail: drawerHost.scrollableEl || drawer }));

    if (window.theme?.a11y?.trapFocus) {
      window.theme.a11y.trapFocus(drawer);
    }

    return true;
  };

  if (!window.theme) {
    window.theme = {};
  }

  window.theme.openNewsletterDrawer = openNewsletterDrawer;
  window.openNewsletterDrawer = openNewsletterDrawer;

  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0) {
      return;
    }

    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    if (!(event.target instanceof Element)) {
      return;
    }

    const link = event.target.closest("a[href]");

    if (!link) {
      return;
    }

    if (link.hasAttribute("download") || link.getAttribute("target") === "_blank") {
      return;
    }

    if (!isNewsletterDrawerLink(link.getAttribute("href"))) {
      return;
    }

    if (!openNewsletterDrawer()) {
      return;
    }

    event.preventDefault();
  });

  const breakpointRefreshQuery = window.matchMedia("(min-width: 960px)");
  const handleBreakpointRefresh = () => {
    window.location.reload();
  };

  if (typeof breakpointRefreshQuery.addEventListener === "function") {
    breakpointRefreshQuery.addEventListener("change", handleBreakpointRefresh);
  } else if (typeof breakpointRefreshQuery.addListener === "function") {
    breakpointRefreshQuery.addListener(handleBreakpointRefresh);
  }

  // ^^ Keep your scripts inside this IIFE function call to
  // avoid leaking your variables into the global scope.
})();
