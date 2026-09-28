(() => {
  if (window.__collectionLoadMoreInitialized) return;
  window.__collectionLoadMoreInitialized = true;

  const selectors = {
    backToTop: "[data-pagination-back-to-top]",
    button: "[data-load-more-button]",
    card: "[data-product-available]",
    grid: "[data-products-grid] .grid",
    overflow: "[data-card-overflow]",
    pagination: "[data-load-more]",
    productsGrid: "[data-products-grid]",
  };

  /* Split variants render more cards than the page holds; the extras ship with
     data-card-overflow so a page still shows products_per_page tiles. */
  const revealCards = (grid, step) => {
    let revealed = 0;

    for (const card of grid.querySelectorAll(selectors.overflow)) {
      if (revealed >= step) break;

      card.removeAttribute("data-card-overflow");
      if (!card.hidden) revealed += 1;
    }

    return revealed;
  };

  const syncButton = (pagination, grid) => {
    const button = pagination.querySelector(selectors.button);
    if (!button) return;

    if (!button.getAttribute("href") && !grid.querySelector(selectors.overflow)) {
      button.remove();
    }
  };

  const fetchNextPage = async (button, pagination, grid, step) => {
    const label = button.querySelector("span") || button;
    const originalText = label.textContent;

    button.dataset.loading = "true";
    button.setAttribute("aria-busy", "true");
    label.textContent = button.dataset.loadingText || originalText;

    try {
      const response = await fetch(button.href, { headers: { Accept: "text/html" } });
      if (!response.ok) throw new Error(response.statusText);

      const doc = new DOMParser().parseFromString(await response.text(), "text/html");
      const nextGrid = doc.querySelector(selectors.grid);
      const nextPagination = doc.querySelector(selectors.pagination);

      if (nextGrid) {
        /* the next page marks its own overflow from its own budget; this grid reveals by count */
        if (step > 0) {
          nextGrid.querySelectorAll(selectors.card).forEach((card) => card.setAttribute("data-card-overflow", ""));
        }

        grid.insertAdjacentHTML("beforeend", nextGrid.innerHTML);
      }

      if (nextPagination) {
        pagination.innerHTML = nextPagination.innerHTML;
      } else if (step > 0 && grid.querySelector(selectors.overflow)) {
        pagination.querySelector(selectors.button)?.removeAttribute("href");
      } else {
        pagination.remove();
      }

      return true;
    } catch (error) {
      label.textContent = originalText;
      delete button.dataset.loading;
      button.removeAttribute("aria-busy");

      return false;
    }
  };

  const loadMore = async (button) => {
    const pagination = button.closest(selectors.pagination);
    const grid = button.closest(selectors.productsGrid)?.querySelector(".grid");

    if (!pagination || !grid) return;

    const step = Number.parseInt(pagination.dataset.loadMoreStep, 10) || 0;

    if (step > 0) {
      const revealed = revealCards(grid, step);

      if (revealed < step && button.getAttribute("href")) {
        const loaded = await fetchNextPage(button, pagination, grid, step);
        if (loaded) revealCards(grid, step - revealed);
      }

      syncButton(pagination, grid);
      return;
    }

    await fetchNextPage(button, pagination, grid, step);
  };

  // Delegated so it survives filter re-renders and the pagination swap after each load.
  document.addEventListener("click", (event) => {
    if (event.target.closest(selectors.backToTop)) {
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      return;
    }

    const button = event.target.closest(selectors.button);
    if (!button) return;

    event.preventDefault();
    if (button.dataset.loading === "true") return;

    loadMore(button);
  });
})();
