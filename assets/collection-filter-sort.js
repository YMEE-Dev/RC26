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
