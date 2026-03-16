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
    document.querySelectorAll("product-model").forEach(function (el) {
      if (el.getAttribute("loaded")) return;

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
})();
