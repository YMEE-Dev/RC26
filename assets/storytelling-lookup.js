/**
 * Storytelling Lookup
 *
 * Scans ALL store products via /collections/all/products.json (paginated,
 * 250/page) to find every storytelling-type product, then uses the section
 * rendering API to verify which one references the current product in its
 * ste_products metafield and render the tile.
 */
(function () {
  // console.log('[storytelling-lookup] Script loaded');

  var container = document.querySelector('[data-storytelling-lookup]');
  if (!container) {
    // console.log('[storytelling-lookup] No container — Liquid already found storytelling');
    return;
  }

  var currentProductId = Number(container.dataset.productId);
  var currentProductHandle = container.dataset.productHandle;

  // console.log('[storytelling-lookup] Product:', currentProductId, currentProductHandle);

  if (!currentProductId || !currentProductHandle) {
    // console.log('[storytelling-lookup] Missing product ID or handle — aborting');
    return;
  }

  var SECTION_ID = 'api-storytelling-tile';
  var imageContainer = container.querySelector('[data-storytelling-tile-target]');
  var fallbackEl = container.querySelector('[data-storytelling-fallback]');

  /**
   * Fetch ALL storytelling products from the store by paginating
   * /collections/all/products.json (250 per page, no Liquid limit).
   */
  async function findAllStorytellingProducts() {
    var results = [];
    var seenHandles = {};
    var page = 1;

    while (page <= 20) {
      try {
        var resp = await fetch(
          '/collections/all/products.json?limit=250&page=' + page
        );
        if (!resp.ok) {
          // console.log('[storytelling-lookup] /collections/all page', page, 'returned', resp.status);
          break;
        }

        var data = await resp.json();
        var products = data.products || [];

        if (products.length === 0) {
          // console.log('[storytelling-lookup] /collections/all page', page, ': empty — done');
          break;
        }

        // console.log('[storytelling-lookup] /collections/all page', page, ':', products.length, 'products');

        for (var i = 0; i < products.length; i++) {
          var p = products[i];
          if (
            p.product_type &&
            p.product_type.toLowerCase().indexOf('storytelling') !== -1 &&
            !seenHandles[p.handle]
          ) {
            seenHandles[p.handle] = true;
            results.push({
              handle: p.handle,
              title: p.title,
              created_at: p.created_at || p.published_at || ''
            });
            // console.log('[storytelling-lookup]   storytelling:', p.handle, '—', p.title);
          }
        }

        if (products.length < 250) break;
        page++;
      } catch (e) {
        // console.warn('[storytelling-lookup] Fetch error on page', page, e);
        break;
      }
    }

    return results;
  }

  /**
   * Fetch the storytelling tile rendered in the context of the storytelling
   * product's own page. The section outputs ste_ids as a data attribute so
   * we can check client-side if the current product is referenced.
   */
  async function verifyAndRenderTile(storytellingHandle) {
    try {
      var url =
        '/products/' + encodeURIComponent(storytellingHandle) +
        '?section_id=' + SECTION_ID;

      // console.log('[storytelling-lookup] Verifying:', storytellingHandle);
      var resp = await fetch(url);
      if (!resp.ok) {
        // console.log('[storytelling-lookup]   Section API returned', resp.status);
        return null;
      }

      var html = await resp.text();

      // Extract debug comment
      var debugMatch = html.match(/<!-- \[api-storytelling-tile DEBUG\]([\s\S]*?)-->/);
      if (debugMatch) {
        // console.log('[storytelling-lookup]   Section debug:', debugMatch[1].trim());
      }

      // Check if it rendered (has ste_products)
      if (html.indexOf('data-storytelling-match="true"') === -1) {
        // console.log('[storytelling-lookup]   No ste_products for:', storytellingHandle);
        return null;
      }

      // Extract ste_ids and check if current product ID is in the list
      var idsMatch = html.match(/data-storytelling-ste-ids="([^"]*)"/);
      if (!idsMatch) {
        // console.log('[storytelling-lookup]   Could not extract ste_ids');
        return null;
      }

      var idsStr = idsMatch[1];
      var ids = idsStr.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      var currentIdStr = String(currentProductId);

      // console.log('[storytelling-lookup]   ste_ids:', ids, 'looking for:', currentIdStr);

      if (ids.indexOf(currentIdStr) === -1) {
        // console.log('[storytelling-lookup]   Current product NOT in ste_products');
        return null;
      }

      // console.log('[storytelling-lookup]   MATCH FOUND!');
      return html;
    } catch (e) {
      // console.warn('[storytelling-lookup]   Verify error:', e);
      return null;
    }
  }

  async function run() {
    // Step 1: Find ALL storytelling products in the store
    var allCandidates = await findAllStorytellingProducts();

    // console.log('[storytelling-lookup] Total storytelling candidates:', allCandidates.length);
    if (allCandidates.length === 0) {
      // console.log('[storytelling-lookup] No storytelling products found in store');
      return;
    }

    // Step 2: Sort by created_at descending (most recent first)
    allCandidates.sort(function (a, b) {
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

    // Step 3: For each candidate, verify via section rendering API
    for (var k = 0; k < allCandidates.length; k++) {
      var tileHtml = await verifyAndRenderTile(allCandidates[k].handle);
      if (tileHtml) {
        // console.log('[storytelling-lookup] SUCCESS — injecting tile for:', allCandidates[k].handle);
        if (imageContainer) {
          imageContainer.innerHTML = tileHtml;
          imageContainer.classList.add('product__collection-image--storytelling');
        }
        if (fallbackEl) {
          fallbackEl.style.display = 'none';
        }
        return;
      }
    }
    // console.log('[storytelling-lookup] No matching storytelling parent found after checking all candidates');
  }

  run();
})();
