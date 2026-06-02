(function () {
  document.addEventListener("click", function (e) {
    var opt = e.target.closest("[data-plp-sort-option]");
    if (!opt) return;
    e.preventDefault();

    var value = opt.getAttribute("data-value");
    if (!value) return;

    var navLink = document.querySelector('[data-sort-link][data-value="' + value + '"]');
    if (navLink) {
      navLink.click();
    } else {
      var url = new URL(window.location.href);
      url.searchParams.set("sort_by", value);
      window.location.href = url.toString();
    }
  });
})();

(function () {
  var grid = document.querySelector("[data-products-grid]");
  if (!grid) return;

  new MutationObserver(function (mutations) {
    var hasNewNodes = mutations.some(function (m) {
      return m.type === "childList" && m.addedNodes.length > 0;
    });
    if (!hasNewNodes) return;

    requestAnimationFrame(function () {
      grid.querySelectorAll(".plp-card-up:not(.plp-card-up--visible)").forEach(function (el) {
        el.classList.add("plp-card-up--visible");
      });
    });
  }).observe(grid, { childList: true });
})();
