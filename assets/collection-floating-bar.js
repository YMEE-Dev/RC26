(function () {
  var bar = document.querySelector("[data-collection-floating-bar]");
  if (!bar) return;

  var mq = window.matchMedia("(max-width: 960px)");
  if (!mq.matches) return;

  var footer = document.querySelector(".site-footer-wrapper");
  if (footer) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            bar.classList.add("is-hidden");
          } else {
            bar.classList.remove("is-hidden");
          }
        });
      },
      { threshold: 0 }
    );
    observer.observe(footer);
  }

  var filterBtn = bar.querySelector("[data-collection-floating-bar-filter]");
  if (filterBtn) {
    filterBtn.addEventListener("click", function () {
      var sidebarToggle = document.querySelector("[data-aria-toggle][aria-controls='filter-groups']");
      if (sidebarToggle) {
        sidebarToggle.click();
      }
    });
  }

  var instockBtn = bar.querySelector("[data-collection-floating-bar-instock]");
  if (instockBtn) {
    instockBtn.addEventListener("click", function () {
      var control = document.querySelector("[data-availability-filter-control]");
      if (!control) return;
      control.click();
      instockBtn.classList.toggle("is-active");
    });
  }

  var sortBtn = bar.querySelector("[data-collection-floating-bar-sort]");
  var sortSidebar = document.querySelector("[data-sort-sidebar]");
  var sortOverlay = document.querySelector(".collection-floating-bar__sort-overlay");

  if (sortSidebar) document.body.appendChild(sortSidebar);
  if (sortOverlay) document.body.appendChild(sortOverlay);
  var sortCloseButtons = document.querySelectorAll("[data-sort-sidebar-close]");

  function openSortSidebar() {
    if (sortSidebar) sortSidebar.classList.add("expanded");
    if (sortOverlay) sortOverlay.classList.add("expanded");
    document.dispatchEvent(new CustomEvent("theme:scroll:lock", { bubbles: true }));
  }

  function closeSortSidebar() {
    if (sortSidebar) sortSidebar.classList.remove("expanded");
    if (sortOverlay) sortOverlay.classList.remove("expanded");
    document.dispatchEvent(new CustomEvent("theme:scroll:unlock", { bubbles: true }));
  }

  if (sortBtn) {
    sortBtn.addEventListener("click", function () {
      openSortSidebar();
    });
  }

  sortCloseButtons.forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      closeSortSidebar();
    });
  });

  var sortOptions = document.querySelectorAll("[data-sort-sidebar-option]");
  sortOptions.forEach(function (option) {
    option.addEventListener("click", function (e) {
      e.preventDefault();
      var value = option.getAttribute("data-value");
      if (!value) return;

      var url = new URL(window.location.href);
      url.searchParams.set("sort_by", value);
      window.location.href = url.toString();
    });
  });
})();
