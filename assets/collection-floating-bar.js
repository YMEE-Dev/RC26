/**
 * Collection Floating Bar
 * Fixed bottom bar on mobile for filter/sort on collection pages.
 * Hides when footer enters viewport via IntersectionObserver.
 */
(function () {
  var bar = document.querySelector("[data-collection-floating-bar]");
  if (!bar) return;

  var mq = window.matchMedia("(max-width: 960px)");
  if (!mq.matches) return;

  // ── Visually hide the header hamburger (floating bar replaces it) ──
  // Use clip instead of display:none so .click() still works programmatically
  var hamburger = document.querySelector('.header__mobile__hamburger[data-drawer-toggle="hamburger"]');
  if (hamburger) {
    hamburger.style.position = "absolute";
    hamburger.style.width = "1px";
    hamburger.style.height = "1px";
    hamburger.style.overflow = "hidden";
    hamburger.style.clip = "rect(0,0,0,0)";
    hamburger.style.pointerEvents = "none";
  }

  // ── Footer IntersectionObserver: hide/show bar ──
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

  // ── Filter button: open the filter sidebar ──
  var filterBtn = bar.querySelector("[data-collection-floating-bar-filter]");
  if (filterBtn) {
    filterBtn.addEventListener("click", function () {
      var sidebarToggle = document.querySelector("[data-aria-toggle][aria-controls='filter-groups']");
      if (sidebarToggle) {
        sidebarToggle.click();
      }
    });
  }

  // ── Sort button: open sort slide-out sidebar ──
  var sortBtn = bar.querySelector("[data-collection-floating-bar-sort]");
  var sortSidebar = document.querySelector("[data-sort-sidebar]");
  var sortOverlay = document.querySelector(".collection-floating-bar__sort-overlay");

  // Move sidebar and overlay to body so they aren't trapped by parent stacking context
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

  // ── Sort option clicks: update URL and reload ──
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

  // ── Menu button: open mobile menu (same as header hamburger) ──
  var menuBtn = bar.querySelector("[data-collection-floating-bar-menu]");
  if (menuBtn) {
    menuBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      var hamburgerBtn = document.querySelector('.header__mobile__hamburger[data-drawer-toggle="hamburger"]');
      if (hamburgerBtn) {
        hamburgerBtn.click();
      }
    });
  }
})();
