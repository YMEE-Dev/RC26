(() => {
  if (window.__collectionLoadMoreInitialized) return;
  window.__collectionLoadMoreInitialized = true;

  const selectors = {
    button: "[data-load-more-button]",
    grid: "[data-products-grid] .grid",
    pagination: "[data-load-more]",
    productsGrid: "[data-products-grid]",
  };

  const loadNextPage = async (button) => {
    const pagination = button.closest(selectors.pagination);
    const grid = button.closest(selectors.productsGrid)?.querySelector(".grid");

    if (!pagination || !grid) return;

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

      if (nextGrid) grid.insertAdjacentHTML("beforeend", nextGrid.innerHTML);

      if (nextPagination) {
        pagination.innerHTML = nextPagination.innerHTML;
      } else {
        pagination.remove();
      }
    } catch (error) {
      label.textContent = originalText;
      delete button.dataset.loading;
      button.removeAttribute("aria-busy");
    }
  };

  // Delegated so it survives filter re-renders and the pagination swap after each load.
  document.addEventListener("click", (event) => {
    const button = event.target.closest(selectors.button);
    if (!button) return;

    event.preventDefault();
    if (button.dataset.loading === "true") return;

    loadNextPage(button);
  });
})();
