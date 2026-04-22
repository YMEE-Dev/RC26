'use strict';

(function () {
  // Queue for containers that need init before webgi-loader.js has run
  var _pendingContainers = [];

  function initContainer(container) {
    if (typeof window.__webgiInitViewer === 'function') {
      window.__webgiInitViewer(container);
    } else {
      _pendingContainers.push(container);
    }
  }

  // Called by webgi-loader.js after it sets window.__webgiInitViewer
  window.__webgiInitViewerReady = function () {
    var pending = _pendingContainers.splice(0);
    pending.forEach(function (c) {
      window.__webgiInitViewer(c);
    });
  };

  function initAllProductModels() {
    // Determine layout once — use matchMedia with the same breakpoint as the CSS.
    // This is more reliable than getComputedStyle at deferred-script execution time.
    var isDesktop = window.matchMedia("(min-width: 990px)").matches;

    document.querySelectorAll("product-model").forEach(function (el) {
      if (el.getAttribute("loaded")) return;

      // Skip the carousel that is currently hidden to avoid creating two WebGI
      // viewer instances (same 3D media is rendered in both mobile and desktop carousels).
      var carousel = el.closest(".pdp-embla--desktop, .pdp-embla--mobile");
      if (carousel) {
        if (isDesktop && carousel.classList.contains("pdp-embla--mobile")) return;
        if (!isDesktop && carousel.classList.contains("pdp-embla--desktop")) return;
      }

      var tpl = el.querySelector("template");
      if (!tpl || !tpl.content || !tpl.content.firstElementChild) return;

      var clone = tpl.content.firstElementChild.cloneNode(true);
      el.appendChild(clone);
      el.setAttribute("loaded", true);

      var poster = el.querySelector("[data-deferred-media-button]");
      if (poster) poster.style.display = "none";

      var container = el.querySelector(".webgi-container");
      if (container) initContainer(container);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAllProductModels);
  } else {
    initAllProductModels();
  }

  // Re-check when the layout switches between mobile and desktop breakpoints.
  // The newly visible carousel's product-model won't have been initialised yet.
  document.addEventListener("theme:resize:width", initAllProductModels);
})();
