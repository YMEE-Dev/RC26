'use strict';

(function() {
    function initAllProductModels() {
        document.querySelectorAll("product-model").forEach(function(el) {
            if (el.getAttribute("loaded")) return;

            var tpl = el.querySelector("template");
            if (!tpl || !tpl.content || !tpl.content.firstElementChild) return;

            var clone = tpl.content.firstElementChild.cloneNode(true);
            el.appendChild(clone);
            el.setAttribute("loaded", true);

            var poster = el.querySelector("[data-deferred-media-button]");
            if (poster) poster.style.display = "none";

            var container = el.querySelector(".webgi-container");
            if (container && typeof window.__webgiInitViewer === "function") {
                window.__webgiInitViewer(container);
            }
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initAllProductModels);
    } else {
        initAllProductModels();
    }
})();