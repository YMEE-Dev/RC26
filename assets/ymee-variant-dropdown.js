/**
 * SIZE-only dropdown. Metal color / other options use the default theme picker.
 * Desktop: inline dropdown overlay.  Mobile: bottom-sheet.
 * Listens for color changes from the default picker and filters dropdown rows.
 * Includes gallery filtering logic (still-life by Y/W/R, model always visible).
 */
(function () {
  // Wrap window.theme.scrollTo so color-picker variant changes can suppress it.
  if (window.theme && typeof window.theme.scrollTo === "function" && !window.theme.__ymeeScrollToWrapped) {
    var _origScrollTo = window.theme.scrollTo;
    window.theme.scrollTo = function () {
      if (window.__ymeeSkipScrollTo) return;
      return _origScrollTo.apply(this, arguments);
    };
    window.theme.__ymeeScrollToWrapped = true;
  }

  function cssEscape(val) {
    if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(val);
    return String(val).replace(/[^a-zA-Z0-9_\-]/g, function (ch) {
      return "\\" + ch;
    });
  }

  function isMobileViewport() {
    try {
      return window.matchMedia && window.matchMedia("(max-width: 1024px)").matches;
    } catch (e) {
      return false;
    }
  }

  function createSheet(sectionId, mountParent) {
    var selector = "[data-ymee-variant-sheet]";
    if (sectionId) selector = '[data-ymee-variant-sheet][data-ymee-variant-sheet-for="' + cssEscape(sectionId) + '"]';

    var existing = document.querySelector(selector);
    if (existing) {
      var existingBackdrop = null;
      try {
        existingBackdrop = document.querySelector(
          '[data-ymee-variant-sheet-backdrop][data-ymee-variant-sheet-for="' + cssEscape(sectionId) + '"]'
        );
      } catch (e) {
        existingBackdrop = document.querySelector("[data-ymee-variant-sheet-backdrop]");
      }
      return {
        sheet: existing,
        body: existing.querySelector("[data-ymee-variant-sheet-body]"),
        footer: existing.querySelector("[data-ymee-variant-sheet-footer]"),
        footerAddBtn: existing.querySelector("[data-ymee-variant-sheet-footer-add]"),
        footerAccelSlot: existing.querySelector("[data-ymee-variant-sheet-footer-accelerated-slot]"),
        closeBtn: existing.querySelector("[data-ymee-variant-sheet-close]"),
        backdrop: existingBackdrop,
      };
    }

    var backdrop = document.createElement("div");
    backdrop.className = "ymee-variant-sheet-backdrop";
    backdrop.setAttribute("data-ymee-variant-sheet-backdrop", "");
    if (sectionId) backdrop.setAttribute("data-ymee-variant-sheet-for", sectionId);
    backdrop.hidden = true;

    var sheet = document.createElement("div");
    sheet.className = "ymee-variant-sheet";
    sheet.setAttribute("data-ymee-variant-sheet", "");
    if (sectionId) sheet.setAttribute("data-ymee-variant-sheet-for", sectionId);
    sheet.hidden = true;

    var header = document.createElement("div");
    header.className = "ymee-variant-sheet__header";

    var title = document.createElement("div");
    title.className = "ymee-variant-sheet__title";
    title.textContent = window.ymeeChooseSizeText || "Choose size";

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "ymee-variant-sheet__close";
    closeBtn.innerHTML =
      '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 1L1 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M1 1L13 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    closeBtn.setAttribute("data-ymee-variant-sheet-close", "");

    header.appendChild(title);
    header.appendChild(closeBtn);

    var body = document.createElement("div");
    body.className = "ymee-variant-sheet__body";
    body.setAttribute("data-ymee-variant-sheet-body", "");

    var footer = document.createElement("div");
    footer.className = "ymee-variant-sheet__footer";
    footer.setAttribute("data-ymee-variant-sheet-footer", "");

    var footerAddBtn = document.createElement("button");
    footerAddBtn.type = "button";
    footerAddBtn.className = "ymee-variant-sheet__footer-add";
    footerAddBtn.setAttribute("data-ymee-variant-sheet-footer-add", "");
    footerAddBtn.hidden = true;
    footerAddBtn.innerHTML =
      '<span class="btn__text"><svg xmlns="http://www.w3.org/2000/svg" width="17" height="19" viewBox="0 0 17 19" fill="none"{% if class %} class="{{ class }}"{% endif %}><path d="M16.666 15.4434L15.3643 5.02638C15.3379 4.76563 15.1035 4.55763 14.8438 4.55763H11.458V3.125C11.458 1.40625 10.0518 0 8.333 0C6.61425 0 5.208 1.40625 5.208 3.125V4.55763H1.82225C1.5615 4.55763 1.32713 4.76563 1.30175 5.02638L0 15.4434V15.4951C0 17.2139 1.40625 18.6201 3.125 18.6201H13.542C15.2608 18.6201 16.667 17.2139 16.667 15.4951C16.666 15.4697 16.666 15.4434 16.666 15.4434ZM6.25 3.12587C6.25 1.98038 7.1875 1.04288 8.333 1.04288C9.4785 1.04288 10.416 1.98038 10.416 3.12587V4.55753H6.25V3.12587ZM13.541 17.5789H3.125C1.9795 17.5789 1.06738 16.6677 1.042 15.5212L2.29103 5.59925H5.20803V7.68225C4.86915 7.86487 4.66115 8.20275 4.66115 8.59337C4.66115 9.16662 5.1299 9.63538 5.70315 9.63538C6.2764 9.63538 6.74515 9.16662 6.74515 8.59337C6.74515 8.22912 6.53714 7.89025 6.25003 7.70762V5.59923H10.417V7.68222C10.0782 7.86484 9.87015 8.20272 9.87015 8.59335C9.87015 9.1666 10.3389 9.63535 10.9122 9.63535C11.4854 9.63535 11.9542 9.1666 11.9542 8.59335C11.9542 8.2291 11.7461 7.89022 11.459 7.7076L11.458 5.5992H14.3751L15.6251 15.5212C15.5987 16.6667 14.6875 17.5789 13.541 17.5789ZM5.963 8.59438C5.963 8.75063 5.85851 8.85513 5.70225 8.85513C5.54599 8.85513 5.4415 8.75063 5.4415 8.59438C5.4415 8.43812 5.54599 8.33363 5.70225 8.33363C5.85948 8.33363 5.963 8.43812 5.963 8.59438ZM11.172 8.59438C11.172 8.75063 11.0675 8.85513 10.9113 8.85513C10.755 8.85513 10.6505 8.75063 10.6505 8.59438C10.6505 8.43812 10.755 8.33363 10.9113 8.33363C11.0675 8.33363 11.172 8.43812 11.172 8.59438Z" fill="white"/></svg>' +
      (window.ymeeAddToCartText || "Add to cart") +
      "</span>";

    var footerAccelSlot = document.createElement("div");
    footerAccelSlot.className = "ymee-variant-sheet__footer-accelerated-slot";
    footerAccelSlot.setAttribute("data-ymee-variant-sheet-footer-accelerated-slot", "");
    footerAccelSlot.hidden = true;

    footer.appendChild(footerAddBtn);
    footer.appendChild(footerAccelSlot);

    sheet.appendChild(header);
    sheet.appendChild(body);
    sheet.appendChild(footer);

    var parent = document.body;
    parent.appendChild(backdrop);
    parent.appendChild(sheet);

    return {
      sheet: sheet,
      body: body,
      footer: footer,
      footerAddBtn: footerAddBtn,
      footerAccelSlot: footerAccelSlot,
      closeBtn: closeBtn,
      backdrop: backdrop,
    };
  }

  function normalizeColorCode(value) {
    if (!value) return "";
    return String(value)
      .toLowerCase()
      .trim()
      .replace(/[\s-]+/g, "_")
      .replace(/[^a-z0-9_]/g, "");
  }

  function colorsMatch(pickerColor, mediaColor) {
    if (!pickerColor || !mediaColor) return false;
    if (pickerColor === mediaColor) return true;
    // "18kt_yellow_gold" ends with "_yellow_gold" → matches "yellow_gold"
    if (pickerColor.length > mediaColor.length) {
      return pickerColor.lastIndexOf("_" + mediaColor) === pickerColor.length - mediaColor.length - 1;
    }
    // mediaColor longer than pickerColor — reverse check
    if (mediaColor.length > pickerColor.length) {
      return mediaColor.lastIndexOf("_" + pickerColor) === mediaColor.length - pickerColor.length - 1;
    }
    return false;
  }

  function getVariantColorCode(variant, sectionId) {
    if (!variant || !sectionId) return "";
    if (!variant.featured_media || !variant.featured_media.id) return "";
    var productImagesEl = document.querySelector(
      "#MainProduct--" +
        cssEscape(sectionId) +
        " product-images, #MainProduct--" +
        cssEscape(sectionId) +
        " .product__images"
    );
    if (!productImagesEl) return "";
    var mediaId = sectionId + "-" + variant.featured_media.id;
    var mediaEl = productImagesEl.querySelector('[data-media-id="' + cssEscape(mediaId) + '"]');
    if (!mediaEl) return "";
    var kind = (mediaEl.getAttribute("data-media-kind") || "").toLowerCase();
    if (kind !== "variant") return "";
    return (mediaEl.getAttribute("data-media-color") || "").toLowerCase();
  }

  function findVariantFromDOM(sectionRoot, sectionId) {
    var productFormId = "product-form-" + sectionId;
    var variantInput = sectionRoot.querySelector('input[name="id"][form="' + cssEscape(productFormId) + '"]');
    if (!variantInput) variantInput = sectionRoot.querySelector('product-form input[name="id"]');
    if (!variantInput || !variantInput.value) return null;
    var pdEl = sectionRoot.querySelector("[data-product-json]");
    if (!pdEl) return null;
    try {
      var pd = JSON.parse(pdEl.textContent || "{}");
      if (!pd || !pd.variants) return null;
      for (var i = 0; i < pd.variants.length; i++) {
        if (String(pd.variants[i].id) === String(variantInput.value)) return pd.variants[i];
      }
    } catch (e) {}
    return null;
  }

  function getColorFromPicker(sectionRoot) {
    var picker = sectionRoot.querySelector("[data-ymee-color-picker]");
    if (!picker) return "";
    var checked = picker.querySelector("[data-ymee-color-input]:checked");
    if (!checked) return "";
    return normalizeColorCode(checked.value);
  }

  // Returns the gallery filter color code for the current variant, using the
  // media alt-text color (locale-independent) rather than the picker option
  // value which may be translated and won't match English alt-text tokens.
  function getGalleryColorCode(sectionRoot, sectionId) {
    var variant = findVariantFromDOM(sectionRoot, sectionId);
    if (variant) {
      var mediaColor = getVariantColorCode(variant, sectionId);
      if (mediaColor) return mediaColor;
    }
    return getColorFromPicker(sectionRoot);
  }

  function applyGalleryFilter(sectionId, colorCode) {
    var productImagesEl = document.querySelector(
      "#MainProduct--" +
        cssEscape(sectionId) +
        " product-images, #MainProduct--" +
        cssEscape(sectionId) +
        " .product__images"
    );
    if (!productImagesEl) return;

    // Check if any slide uses the variant:/common: alt text system
    var hasVariantSystem = false;
    productImagesEl.querySelectorAll("[data-media-kind]").forEach(function (el) {
      var kind = (el.getAttribute("data-media-kind") || "").toLowerCase();
      if (kind === "variant" || kind === "common") hasVariantSystem = true;
    });

    // If no variant/common system, preserve original behavior completely
    if (!hasVariantSystem) return;

    // If no color code, restore all slides and leave order as-is
    if (!colorCode) {
      productImagesEl.removeAttribute("data-gallery-filter-active");
      productImagesEl.querySelectorAll(".pdp-embla__container").forEach(function (container) {
        // Move any held-back slides back into the container
        var holdingEl = container.nextElementSibling;
        if (holdingEl && holdingEl.classList.contains("pdp-embla__filtered-hold")) {
          while (holdingEl.firstChild) {
            holdingEl.firstChild.classList.remove("pdp-embla__slide--filtered-out");
            holdingEl.firstChild.classList.remove("product__slide--filtered-out");
            container.appendChild(holdingEl.firstChild);
          }
        }
      });
      // Restore held-back thumbs
      ["pdp-thumbs--desktop", "pdp-thumbs--mobile"].forEach(function (thumbClass) {
        var thumbsHolder = productImagesEl.querySelector("." + thumbClass + " .product__thumbs__holder");
        if (!thumbsHolder) return;
        var holdingEl = thumbsHolder.nextElementSibling;
        if (holdingEl && holdingEl.classList.contains("pdp-thumbs__filtered-hold")) {
          while (holdingEl.firstChild) {
            holdingEl.firstChild.classList.remove("pdp-thumb--filtered-out");
            thumbsHolder.appendChild(holdingEl.firstChild);
          }
        }
      });
      return;
    }

    // Process each carousel container (mobile + desktop)
    productImagesEl.querySelectorAll(".pdp-embla__container").forEach(function (container) {
      // Ensure holding element exists for hidden slides
      var holdingEl = container.nextElementSibling;
      if (!holdingEl || !holdingEl.classList.contains("pdp-embla__filtered-hold")) {
        holdingEl = document.createElement("div");
        holdingEl.className = "pdp-embla__filtered-hold";
        holdingEl.style.display = "none";
        container.parentNode.insertBefore(holdingEl, container.nextSibling);
      }

      // Gather all slides from both container and holding
      var allSlides = Array.prototype.slice
        .call(container.querySelectorAll("[data-embla-slide]"))
        .concat(Array.prototype.slice.call(holdingEl.querySelectorAll("[data-embla-slide]")));
      if (!allSlides.length) return;

      var modelSlides = [];
      var variantSlides = [];
      var commonSlides = [];
      var otherSlides = [];
      var hiddenSlides = [];

      allSlides.forEach(function (slide) {
        var mediaEl = slide.querySelector("[data-media-kind]") || slide;
        var kind = (mediaEl.getAttribute("data-media-kind") || "other").toLowerCase();
        var color = (mediaEl.getAttribute("data-media-color") || "").toLowerCase();
        var mediaType = (
          slide.getAttribute("data-media-type") ||
          mediaEl.getAttribute("data-type") ||
          ""
        ).toLowerCase();

        if (mediaType === "model" || kind === "model") {
          modelSlides.push(slide);
          slide.classList.remove("pdp-embla__slide--filtered-out");
          slide.classList.remove("product__slide--filtered-out");
        } else if (kind === "variant") {
          if (colorsMatch(colorCode, color)) {
            variantSlides.push(slide);
            slide.classList.remove("pdp-embla__slide--filtered-out");
            slide.classList.remove("product__slide--filtered-out");
          } else {
            hiddenSlides.push(slide);
            slide.classList.add("pdp-embla__slide--filtered-out");
            slide.classList.add("product__slide--filtered-out");
          }
        } else if (kind === "common") {
          commonSlides.push(slide);
          slide.classList.remove("pdp-embla__slide--filtered-out");
          slide.classList.remove("product__slide--filtered-out");
        } else {
          otherSlides.push(slide);
          slide.classList.remove("pdp-embla__slide--filtered-out");
          slide.classList.remove("product__slide--filtered-out");
        }
      });

      // Put visible slides in the container: model first, then variant, common, other
      var visibleSlides = modelSlides.concat(variantSlides).concat(commonSlides).concat(otherSlides);
      visibleSlides.forEach(function (slide) {
        container.appendChild(slide);
      });
      hiddenSlides.forEach(function (slide) {
        holdingEl.appendChild(slide);
      });
    });

    // Collect visible media IDs for thumbnail filtering (use mobile as source of truth)
    var visibleMediaIds = [];
    var mobileContainer = productImagesEl.querySelector(".pdp-embla--mobile .pdp-embla__container");
    var sourceSlides = mobileContainer
      ? mobileContainer.querySelectorAll("[data-embla-slide]")
      : productImagesEl.querySelectorAll(".pdp-embla__container [data-embla-slide]");

    sourceSlides.forEach(function (slide) {
      var mediaEl = slide.querySelector("[data-media-id]") || slide;
      var mediaId = mediaEl.getAttribute("data-media-id") || slide.getAttribute("data-primary-media-id") || "";
      if (mediaId) visibleMediaIds.push(mediaId);
    });

    // Filter and reorder thumbnails — move hidden thumbs out of the holder
    ["pdp-thumbs--desktop", "pdp-thumbs--mobile"].forEach(function (thumbClass) {
      var thumbsHolder = productImagesEl.querySelector("." + thumbClass + " .product__thumbs__holder");
      if (!thumbsHolder) return;

      // Ensure holding element for hidden thumbs
      var holdingEl = thumbsHolder.nextElementSibling;
      if (!holdingEl || !holdingEl.classList.contains("pdp-thumbs__filtered-hold")) {
        holdingEl = document.createElement("div");
        holdingEl.className = "pdp-thumbs__filtered-hold";
        holdingEl.style.display = "none";
        thumbsHolder.parentNode.insertBefore(holdingEl, thumbsHolder.nextSibling);
      }

      // Collect all thumbs from holder and holding
      var allThumbs = Array.prototype.slice
        .call(thumbsHolder.querySelectorAll(".product__thumb"))
        .concat(Array.prototype.slice.call(holdingEl.querySelectorAll(".product__thumb")));

      var thumbMap = {};
      allThumbs.forEach(function (thumb) {
        var link = thumb.querySelector("[data-thumb-link], a[data-media-id]");
        var mediaId = link ? link.getAttribute("data-media-id") || "" : "";
        if (mediaId) thumbMap[mediaId] = thumb;
      });

      // Reorder visible thumbs into holder, matching visible media order
      visibleMediaIds.forEach(function (mediaId) {
        var thumb = thumbMap[mediaId];
        if (thumb) {
          thumb.classList.remove("pdp-thumb--filtered-out");
          thumbsHolder.appendChild(thumb);
        }
      });

      // Move hidden thumbs to holding element
      allThumbs.forEach(function (thumb) {
        var link = thumb.querySelector("[data-thumb-link], a[data-media-id]");
        var thumbMediaId = link ? link.getAttribute("data-media-id") || "" : "";
        if (thumbMediaId && visibleMediaIds.indexOf(thumbMediaId) === -1) {
          thumb.classList.add("pdp-thumb--filtered-out");
          holdingEl.appendChild(thumb);
        }
      });
    });

    // Reset desktop carousel to intro stage and reinit all carousels
    productImagesEl.querySelectorAll(".pdp-embla").forEach(function (emblaRoot) {
      if (emblaRoot._resetToIntro) {
        emblaRoot._resetToIntro();
      }
      if (emblaRoot._emblaInstance && typeof emblaRoot._emblaInstance.reInit === "function") {
        try {
          emblaRoot._emblaInstance.reInit();
          emblaRoot._emblaInstance.scrollTo(0, true);
        } catch (e) {}
      }
    });

    // Update active media to first visible slide
    if (visibleMediaIds.length) {
      productImagesEl.setAttribute("data-active-media", visibleMediaIds[0]);
    }

    // Install a capturing-phase listener that blocks non-thumb
    // theme:media:select events while the filter is active.  This prevents
    // product-images' built-in setActiveMedia handler from corrupting
    // data-active-media / thumb is-active state when product-info fires
    // updateMedia asynchronously after a variant change.
    if (!productImagesEl._galleryFilterCapture) {
      productImagesEl._galleryFilterCapture = true;
      productImagesEl.addEventListener(
        "theme:media:select",
        function (e) {
          if (productImagesEl.getAttribute("data-gallery-filter-active") !== "true") return;
          var tgt = e.target;
          var fromThumb =
            tgt &&
            (tgt.closest
              ? tgt.closest("product-thumbs")
              : tgt.tagName && tgt.tagName.toLowerCase() === "product-thumbs");
          if (!fromThumb) {
            e.stopImmediatePropagation();
            e.stopPropagation();
          }
        },
        true
      );
    }

    // Flag that our gallery filter is active — the theme:media:select handler
    // in product.liquid checks this to skip carousel manipulation that would
    // undo our filtering (scroll to featured_media, setCarouselStarted, etc.)
    // The flag auto-expires after 1.5s so it only blocks the theme's async
    // updateMedia dispatch and doesn't interfere with later user interactions.
    productImagesEl.setAttribute("data-gallery-filter-active", "true");
    setTimeout(function () {
      productImagesEl.removeAttribute("data-gallery-filter-active");
    }, 1500);
  }

  // Wrapper that applies the gallery filter. The data-gallery-filter-active
  // flag set by applyGalleryFilter prevents the theme's theme:media:select
  // handler from undoing our carousel state (scroll, intro stage, etc.).
  function applyGalleryFilterDeferred(sectionId, colorCode) {
    applyGalleryFilter(sectionId, colorCode);
  }

  function hasVariantAltMediaSystem(sectionRoot, sectionId) {
    var productImagesEl =
      sectionRoot.querySelector("product-images, .product__images") ||
      document.querySelector(
        "#MainProduct--" +
          cssEscape(sectionId) +
          " product-images, #MainProduct--" +
          cssEscape(sectionId) +
          " .product__images"
      );

    if (!productImagesEl) return false;

    var hasVariantSystem = false;
    productImagesEl.querySelectorAll("[data-media-kind]").forEach(function (el) {
      var kind = (el.getAttribute("data-media-kind") || "").toLowerCase();
      if (kind === "variant" || kind === "common") hasVariantSystem = true;
    });

    return hasVariantSystem;
  }

  function getCurrentNonSizeOptions(sectionRoot, sizeOptionIndex) {
    var result = {};

    var colorPickers = sectionRoot.querySelectorAll("[data-ymee-color-picker]");
    colorPickers.forEach(function (picker) {
      var pos = parseInt(picker.getAttribute("data-option-position"), 10);
      if (isNaN(pos)) return;
      var idx = pos - 1;
      if (idx === sizeOptionIndex) return;

      var checked = picker.querySelector('input[type="radio"]:checked');
      if (checked) {
        result[idx] = checked.value;
      }
    });

    if (Object.keys(result).length === 0) {
      var variantSelectsEl = sectionRoot.querySelector("variant-selects");
      if (variantSelectsEl) {
        var wrappers = variantSelectsEl.querySelectorAll(".selector-wrapper[data-option-position]");
        wrappers.forEach(function (wrapper) {
          var pos = parseInt(wrapper.getAttribute("data-option-position"), 10);
          if (isNaN(pos)) return;
          var idx = pos - 1;
          if (idx === sizeOptionIndex) return;

          var checked = wrapper.querySelector('input[type="radio"]:checked');
          if (checked) {
            result[idx] = checked.value;
            return;
          }
          var selectEl = wrapper.querySelector("select");
          if (selectEl) {
            result[idx] = selectEl.value;
          }
        });
      }
    }

    return result;
  }

  function init(scope) {
    (scope || document).querySelectorAll("[data-ymee-variant-dropdown]").forEach(function (root) {
      if (root.dataset.ymeeBound === "true") return;
      root.dataset.ymeeBound = "true";

      var sectionId = root.getAttribute("data-section-id");
      if (!sectionId) return;

      var sizeOptionIndex = parseInt(root.getAttribute("data-size-option-index"), 10);
      if (isNaN(sizeOptionIndex) || sizeOptionIndex < 0) return;

      var sectionRoot =
        document.querySelector("#MainProduct--" + cssEscape(sectionId)) ||
        root.closest('[data-section-id="' + cssEscape(sectionId) + '"]') ||
        document;

      sectionRoot.setAttribute("data-ymee-variant-dropdown-enabled", "true");

      var productInfoEl =
        sectionRoot.closest("product-info") || sectionRoot.querySelector("product-info") || sectionRoot;
      if (productInfoEl && productInfoEl.tagName === "PRODUCT-INFO") {
        productInfoEl.setAttribute("data-variant-image-scroll", "false");
        productInfoEl.variantImageScroll = false;
      }

      var toggle = root.querySelector(".ymee-variant-dropdown__toggle");
      var menu = root.querySelector(".ymee-variant-dropdown__menu");
      var placeholderEl = root.querySelector("[data-ymee-variant-dropdown-placeholder]");
      var footerAtcBtn = menu.querySelector("[data-ymee-footer-atc]");

      var productFormId = "product-form-" + sectionId;
      var formEl = document.getElementById(productFormId);

      function getLiveFormEl() {
        return document.getElementById(productFormId);
      }

      function submitProductForm(variantId) {
        var attempt = 0;
        var maxAttempts = 6;

        function trySubmit() {
          var liveFormEl = getLiveFormEl();
          if (!liveFormEl) {
            if (attempt < maxAttempts) {
              attempt += 1;
              requestAnimationFrame(trySubmit);
            }
            return;
          }

          var idInput = liveFormEl.querySelector('input[name="id"]');
          if (idInput) {
            idInput.disabled = false;
            if (variantId) idInput.value = variantId;
          }

          // Ensure stale per-variant gating from previous selections does not block this add.
          liveFormEl.setAttribute("data-max-inventory-reached", "false");
          liveFormEl.setAttribute("data-error-message-position", "form");

          // Dropdown ATC always adds one item; avoid posting quantity 0 (Shopify 422).
          var qtyInput =
            liveFormEl.querySelector('input[name="quantity"]') ||
            sectionRoot.querySelector('[data-quantity-input][form="' + cssEscape(productFormId) + '"]');
          if (qtyInput) {
            var qtyVal = parseInt(qtyInput.value, 10);
            if (isNaN(qtyVal) || qtyVal < 1) {
              qtyInput.value = "1";
              try {
                qtyInput.dispatchEvent(new Event("change", { bubbles: true }));
              } catch (e) {
                /* no-op */
              }
            }
          }

          var submitBtn =
            liveFormEl.querySelector('button[type="submit"][name="add"]') ||
            liveFormEl.querySelector('button[type="submit"]');

          if (submitBtn && submitBtn.classList.contains("is-loading")) {
            if (attempt < maxAttempts) {
              attempt += 1;
              setTimeout(trySubmit, 120);
            }
            return;
          }

          if (submitBtn && submitBtn.disabled) {
            submitBtn.disabled = false;
          }

          // Prefer native submit flow so product-form handlers run consistently.
          if (typeof liveFormEl.requestSubmit === "function") {
            try {
              liveFormEl.requestSubmit(submitBtn || undefined);
              return;
            } catch (e) {
              /* fall through */
            }
          }

          if (submitBtn) {
            submitBtn.click();
            return;
          }

          if (attempt < maxAttempts) {
            attempt += 1;
            requestAnimationFrame(trySubmit);
          }
        }

        trySubmit();
      }

      function getLiveVariantIdInput() {
        return sectionRoot.querySelector('input[name="id"][form="' + cssEscape(productFormId) + '"]');
      }

      function getLiveVariantSelects() {
        return (
          sectionRoot.querySelector('variant-selects[data-section="' + cssEscape(sectionId) + '"]') ||
          sectionRoot.querySelector("variant-selects")
        );
      }

      var variantIdInput = getLiveVariantIdInput();
      var variantSelects = getLiveVariantSelects();

      var productDataEl = sectionRoot.querySelector("[data-product-json]");
      var productData = null;
      var variantById = {};

      try {
        if (productDataEl) {
          productData = JSON.parse(productDataEl.textContent || "{}");
        }
      } catch (e) {
        /* no-op */
      }

      if (productData && productData.variants) {
        productData.variants.forEach(function (v) {
          if (v && v.id) variantById[String(v.id)] = v;
        });
      }

      if (!toggle || !menu) return;

      var allOptions = menu.querySelectorAll(".ymee-variant-dropdown__option");
      var sheetState = null;
      var menuHomeParent = menu.parentElement;
      var menuHomeNext = menu.nextSibling;
      var escHandlerBound = false;
      var cartStateRequestId = 0;

      function updateOptionCartState(onDone) {
        if (!productData || !productData.variants || !window.theme || !theme.routes || !theme.routes.cart_url) return;

        cartStateRequestId += 1;
        var requestId = cartStateRequestId;

        fetch(theme.routes.cart_url + ".js", {
          headers: {
            Accept: "application/json",
          },
        })
          .then(function (response) {
            if (!response.ok) throw new Error("Unable to load cart state");
            return response.json();
          })
          .then(function (cartData) {
            if (requestId !== cartStateRequestId) return;

            var cartQtyByVariantId = {};
            var items = (cartData && cartData.items) || [];

            items.forEach(function (item) {
              var variantKey = String(item.variant_id || "");
              if (!variantKey) return;
              cartQtyByVariantId[variantKey] = (cartQtyByVariantId[variantKey] || 0) + Number(item.quantity || 0);
            });

            allOptions.forEach(function (optionEl) {
              var variantId = String(optionEl.getAttribute("data-variant-id") || "");
              var variant = variantById[variantId];
              if (!variant || !variant.available) return;

              var addBtn = optionEl.querySelector('.ymee-variant-dropdown__submit button[data-action="buy"]');
              var labelEl = addBtn && addBtn.querySelector("[data-ymee-option-atc-label]");
              if (!labelEl) return;

              var cartQty = Number(cartQtyByVariantId[variantId] || 0);
              var inventoryManagement = optionEl.getAttribute("data-inventory-management") || "";
              var inventoryPolicy = optionEl.getAttribute("data-inventory-policy") || "";
              var inventoryQuantity = Number(optionEl.getAttribute("data-inventory-quantity") || 0);
              var isCartSoldOut =
                inventoryManagement === "shopify" &&
                inventoryPolicy === "deny" &&
                inventoryQuantity >= 0 &&
                cartQty >= inventoryQuantity;

              optionEl.setAttribute("data-ymee-cart-soldout", isCartSoldOut ? "true" : "false");
              if (addBtn) {
                addBtn.disabled = isCartSoldOut;
                addBtn.setAttribute("aria-disabled", isCartSoldOut ? "true" : "false");
              }

              labelEl.textContent = isCartSoldOut
                ? window.ymeeOutOfStockText || "Out of stock"
                : window.ymeeAddToCartText || "Add to cart";
            });

            if (typeof onDone === "function") onDone();
          })
          .catch(function () {
            if (typeof onDone === "function") onDone();
            /* no-op */
          });
      }

      root._ymeeUpdateOptionCartState = updateOptionCartState;

      function filterRowsByColor() {
        var nonSizeOpts = getCurrentNonSizeOptions(sectionRoot, sizeOptionIndex);
        var seenSizes = {};

        allOptions.forEach(function (el) {
          var match = true;
          Object.keys(nonSizeOpts).forEach(function (idxStr) {
            var optKey = "data-option" + (parseInt(idxStr, 10) + 1);
            var elVal = (el.getAttribute(optKey) || "").trim();
            if (elVal !== nonSizeOpts[idxStr]) match = false;
          });

          var sizeVal = el.getAttribute("data-size-value") || "";

          if (match && !seenSizes[sizeVal]) {
            el.style.display = "";
            seenSizes[sizeVal] = true;
          } else {
            el.style.display = "none";
          }
        });
      }

      function getCurrentAllSelectedOptions() {
        var opts = {};

        var currentVariant = variantById[String(variantIdInput && variantIdInput.value)];
        if (currentVariant && currentVariant.options) {
          currentVariant.options.forEach(function (value, idx) {
            opts[idx] = value;
          });
        }

        sectionRoot.querySelectorAll("[data-ymee-color-picker]").forEach(function (pickerEl) {
          var pos = parseInt(pickerEl.getAttribute("data-option-position"), 10);
          if (isNaN(pos)) return;
          var checked = pickerEl.querySelector("[data-ymee-color-input]:checked");
          if (checked) opts[pos - 1] = checked.value;
        });

        if (variantSelects) {
          variantSelects.querySelectorAll(".selector-wrapper[data-option-position]").forEach(function (wrapper) {
            var pos = parseInt(wrapper.getAttribute("data-option-position"), 10);
            if (isNaN(pos)) return;

            var checked = wrapper.querySelector('input[type="radio"]:checked');
            if (checked) {
              opts[pos - 1] = checked.value;
              return;
            }

            var selectEl = wrapper.querySelector("select, [data-popout-input]");
            if (selectEl && selectEl.value) {
              opts[pos - 1] = selectEl.value;
            }
          });
        }

        return opts;
      }

      function updateColorPickerAvailability() {
        if (!productData || !productData.variants) return;

        var currentOpts = getCurrentAllSelectedOptions();

        sectionRoot.querySelectorAll("[data-ymee-color-picker]").forEach(function (pickerEl) {
          var optionPos = parseInt(pickerEl.getAttribute("data-option-position"), 10);
          if (isNaN(optionPos)) return;

          var optionIndex = optionPos - 1;

          pickerEl.querySelectorAll(".ymee-color-picker__item").forEach(function (itemEl) {
            var inputEl = itemEl.querySelector("[data-ymee-color-input]");
            if (!inputEl) return;

            var probeOptions = Object.assign({}, currentOpts);
            probeOptions[optionIndex] = inputEl.value;

            var isAvailable = productData.variants.some(function (variant) {
              if (!variant || !variant.available || !variant.options) return false;

              for (var idxStr in probeOptions) {
                if (!Object.prototype.hasOwnProperty.call(probeOptions, idxStr)) continue;
                if (variant.options[parseInt(idxStr, 10)] !== probeOptions[idxStr]) return false;
              }

              return true;
            });

            itemEl.classList.toggle("is-unavailable", !isAvailable);
          });
        });
      }

      function findVariantByOptions(selectedOptions) {
        if (!productData || !productData.variants) return null;

        for (var i = 0; i < productData.variants.length; i++) {
          var variant = productData.variants[i];
          if (!variant || !variant.options) continue;

          var match = true;
          for (var idxStr in selectedOptions) {
            if (!Object.prototype.hasOwnProperty.call(selectedOptions, idxStr)) continue;
            if (variant.options[parseInt(idxStr, 10)] !== selectedOptions[idxStr]) {
              match = false;
              break;
            }
          }

          if (match) return variant;
        }

        return null;
      }

      function getPreferredVisibleOptionEl() {
        var selectedOptions = getCurrentAllSelectedOptions();
        var requestedSize = selectedOptions[sizeOptionIndex] || "";

        if (requestedSize) {
          var bySize = menu.querySelector(
            '.ymee-variant-dropdown__option[data-size-value="' +
              cssEscape(requestedSize) +
              '"]:not([style*="display: none"])'
          );
          if (bySize) return bySize;
        }

        var targetVariant = findVariantByOptions(selectedOptions);
        if (targetVariant && targetVariant.id) {
          var byVariant = menu.querySelector(
            '.ymee-variant-dropdown__option[data-variant-id="' +
              cssEscape(String(targetVariant.id)) +
              '"]:not([style*="display: none"])'
          );
          if (byVariant) return byVariant;
        }

        return (
          menu.querySelector('.ymee-variant-dropdown__option:not(.is-oos):not([style*="display: none"])') ||
          menu.querySelector('.ymee-variant-dropdown__option:not([style*="display: none"])')
        );
      }

      function getSelectedOptionEl() {
        variantIdInput = getLiveVariantIdInput();
        if (variantIdInput && variantIdInput.value) {
          var byVariant = menu.querySelector(
            '.ymee-variant-dropdown__option[data-variant-id="' + cssEscape(variantIdInput.value) + '"]'
          );
          if (byVariant && byVariant.style.display !== "none") return byVariant;
        }

        return (
          menu.querySelector('.ymee-variant-dropdown__option.is-selected:not([style*="display: none"])') ||
          menu.querySelector('.ymee-variant-dropdown__option:not(.is-oos):not([style*="display: none"])') ||
          menu.querySelector('.ymee-variant-dropdown__option:not([style*="display: none"])')
        );
      }

      function clearSelectedVisual() {
        try {
          allOptions.forEach(function (el) {
            el.classList.remove("is-selected");
            el.setAttribute("aria-selected", "false");
          });
        } catch (e) {
          /* no-op */
        }
      }

      function setSelectedVisual(optionEl) {
        allOptions.forEach(function (el) {
          el.classList.toggle("is-selected", el === optionEl);
          el.setAttribute("aria-selected", el === optionEl ? "true" : "false");
        });
      }

      function updatePlaceholder(optionEl, userSelected) {
        if (!placeholderEl || !optionEl) return;
        if (!userSelected) return;
        var sizeVal = optionEl.getAttribute("data-size-value") || "";
        if (sizeVal) placeholderEl.textContent = (window.ymeeSizePrefixText || "Size: ") + " " + sizeVal;
      }

      function updateSheetFooterState() {
        if (!sheetState) return;
        var visualSelected = menu.querySelector(
          '.ymee-variant-dropdown__option.is-selected:not([style*="display: none"])'
        );

        if (isMobileViewport()) {
          // Update sheet footer ATC button
          if (sheetState.footerAddBtn) {
            if (
              visualSelected &&
              !visualSelected.classList.contains("is-oos") &&
              visualSelected.getAttribute("data-ymee-cart-soldout") !== "true"
            ) {
              sheetState.footerAddBtn.hidden = false;
              sheetState.footerAddBtn.disabled = false;
            } else {
              sheetState.footerAddBtn.hidden = true;
            }
          }
          // Also hide inline footer ATC if present
          if (footerAtcBtn) footerAtcBtn.hidden = true;
          if (!visualSelected) return;
        }
      }

      function hideFooterAtc() {
        if (footerAtcBtn) footerAtcBtn.hidden = true;
      }

      function closeSheet() {
        if (!sheetState) return;
        try {
          document.documentElement.classList.remove("ymee-variant-sheet-open");
        } catch (e) {
          /* no-op */
        }

        if (sheetState.backdrop) sheetState.backdrop.removeEventListener("click", closeMenu);
        if (sheetState.closeBtn) sheetState.closeBtn.removeEventListener("click", closeMenu);

        var sheetEl = sheetState.sheet;
        var backdropEl = sheetState.backdrop;
        var hideDone = false;
        var finishHide = function () {
          if (hideDone) return;
          hideDone = true;
          if (backdropEl) backdropEl.hidden = true;
          if (sheetEl) sheetEl.hidden = true;
        };

        if (sheetEl && typeof sheetEl.addEventListener === "function") {
          var onEnd = function (evt) {
            if (evt && evt.target !== sheetEl) return;
            sheetEl.removeEventListener("transitionend", onEnd);
            finishHide();
          };
          sheetEl.addEventListener("transitionend", onEnd);
          setTimeout(function () {
            sheetEl.removeEventListener("transitionend", onEnd);
            finishHide();
          }, 350);
        } else {
          finishHide();
        }

        if (menuHomeParent) {
          if (menuHomeNext && menuHomeNext.parentNode === menuHomeParent) {
            menuHomeParent.insertBefore(menu, menuHomeNext);
          } else {
            menuHomeParent.appendChild(menu);
          }
        }
        menu.hidden = true;
        sheetState = null;
      }

      function closeMenu() {
        if (sheetState) {
          closeSheet();
        } else {
          root.classList.remove("is-open");
          setTimeout(function () {
            if (!root.classList.contains("is-open")) {
              menu.hidden = true;
            }
          }, 300);
        }
        toggle.setAttribute("aria-expanded", "false");
      }

      function openSheet() {
        filterRowsByColor();

        // Grab sizing link reference before moving menu out of root
        var sizingLink = menu.querySelector("[data-ymee-sizing-help]") || root.querySelector("[data-ymee-sizing-help]");

        sheetState = createSheet(sectionId, root);
        if (!sheetState || !sheetState.body) return;

        if (sheetState.backdrop) sheetState.backdrop.hidden = false;
        if (sheetState.sheet) sheetState.sheet.hidden = false;

        sheetState.body.innerHTML = "";
        sheetState.body.appendChild(menu);
        menu.hidden = false;

        // Clone sizing link into sheet footer if available
        if (sizingLink && sheetState.footer) {
          var existingFooterLink = sheetState.footer.querySelector(".ymee-variant-sheet__footer-sizing-link");
          if (!existingFooterLink) {
            var footerLink = sizingLink.cloneNode(true);
            footerLink.className = "ymee-variant-sheet__footer-sizing-link";
            sheetState.footer.insertBefore(footerLink, sheetState.footer.firstChild);
          }
        }

        var alreadySelected = sectionRoot.getAttribute("data-ymee-variant-selected") === "true";
        if (alreadySelected) {
          var preselect = getSelectedOptionEl();
          if (preselect) setSelectedVisual(preselect);
          else clearSelectedVisual();
        } else {
          clearSelectedVisual();
        }

        updateSheetFooterState();

        try {
          document.documentElement.classList.remove("ymee-variant-sheet-open");
          requestAnimationFrame(function () {
            requestAnimationFrame(function () {
              document.documentElement.classList.add("ymee-variant-sheet-open");
            });
          });
        } catch (e) {
          /* no-op */
        }

        if (sheetState.backdrop) sheetState.backdrop.addEventListener("click", closeMenu);
        if (sheetState.closeBtn) sheetState.closeBtn.addEventListener("click", closeMenu);

        if (sheetState.footerAddBtn && !sheetState.footerAddBtn.dataset.ymeeBound) {
          sheetState.footerAddBtn.dataset.ymeeBound = "true";
          sheetState.footerAddBtn.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();

            var selected = getSelectedOptionEl();
            updateOptionCartState(function () {
              if (!selected || selected.getAttribute("data-ymee-cart-soldout") === "true") {
                updateSheetFooterState();
                return;
              }

              syncVariant(selected, { userSelected: true, skipVariantSelectorsSync: true });
              closeMenu();

              setTimeout(function () {
                submitProductForm(selected ? selected.getAttribute("data-variant-id") : null);
              }, 0);
            });
          });
        }

        if (!escHandlerBound) {
          escHandlerBound = true;
          document.addEventListener("keydown", function (evt) {
            if (!sheetState) return;
            if (evt.key === "Escape" || evt.key === "Esc") {
              closeMenu();
            }
          });
        }
      }

      function openMenu() {
        filterRowsByColor();
        updateColorPickerAvailability();
        updateOptionCartState();
        if (isMobileViewport()) {
          openSheet();
        } else {
          menu.hidden = false;
          requestAnimationFrame(function () {
            requestAnimationFrame(function () {
              root.classList.add("is-open");
            });
          });
        }
        toggle.setAttribute("aria-expanded", "true");
      }

      function syncVariant(optionEl, opts) {
        if (!optionEl) return;
        opts = opts || {};

        var variantId = optionEl.getAttribute("data-variant-id");

        if (opts.userSelected) {
          try {
            sectionRoot.setAttribute("data-ymee-variant-selected", "true");
          } catch (e) {
            /* no-op */
          }
        }

        updatePlaceholder(optionEl, opts.userSelected);
        setSelectedVisual(optionEl);

        variantIdInput = getLiveVariantIdInput();
        if (variantIdInput && variantId) {
          variantIdInput.disabled = false;
          if (String(variantIdInput.value) !== String(variantId)) {
            variantIdInput.value = variantId;
            variantIdInput.dispatchEvent(new Event("change", { bubbles: true }));
          }
        }

        variantSelects = getLiveVariantSelects();
        if (variantSelects && !opts.skipVariantSelectorsSync) {
          var sizeVal = optionEl.getAttribute("data-size-value") || "";
          var sizeWrapper = variantSelects.querySelector(".selector-wrapper--size");
          if (sizeWrapper && sizeVal) {
            var sizeRadios = sizeWrapper.querySelectorAll('input[type="radio"]');
            sizeRadios.forEach(function (radio) {
              if (radio.value === sizeVal && !radio.checked) {
                radio.checked = true;
                radio.dispatchEvent(new Event("change", { bubbles: true }));
              }
            });

            var sizeSelect = sizeWrapper.querySelector("select, [data-popout-input]");
            if (sizeSelect && sizeSelect.value !== sizeVal) {
              sizeSelect.value = sizeVal;
              sizeSelect.dispatchEvent(new Event("change", { bubbles: true }));
            }
          }
        }

        var variant = variantById[String(variantId)];
        if (variant) {
          document.dispatchEvent(new CustomEvent("theme:variant:change", { detail: { variant: variant } }));
        }

        var colorCode = getGalleryColorCode(sectionRoot, sectionId);
        // Only apply filter if we have a valid color code — an empty colorCode
        // would clear the existing filter (the picker may temporarily lose its
        // checked state when the theme replaces variant-selects DOM).
        if (colorCode) {
          applyGalleryFilterDeferred(sectionId, colorCode);
        }
      }

      var toggleIcon = toggle.querySelector(".ymee-variant-dropdown__toggle-icon");
      if (toggleIcon) {
        toggleIcon.addEventListener("click", function (e) {
          if (!isMobileViewport()) return;
          e.preventDefault();
          e.stopPropagation();
          var hamburger = document.querySelector('.header__mobile__hamburger[data-drawer-toggle="hamburger"]');
          if (hamburger) hamburger.click();
        });
      }

      toggle.addEventListener("click", function (e) {
        e.preventDefault();
        if (menu.hidden) openMenu();
        else closeMenu();
      });

      document.addEventListener("click", function (e) {
        if (sheetState) return;
        if (!root.contains(e.target)) closeMenu();
      });

      menu.addEventListener(
        "click",
        function (e) {
          var optionEl = e.target.closest(".ymee-variant-dropdown__option");
          if (!optionEl || optionEl.style.display === "none") return;

          var addBtn = e.target.closest(".ymee-variant-dropdown__submit button");
          if (addBtn) {
            e.preventDefault();
            e.stopPropagation();

            if (addBtn.disabled || addBtn.getAttribute("aria-disabled") === "true") {
              return;
            }

            updateOptionCartState(function () {
              if (optionEl.getAttribute("data-ymee-cart-soldout") === "true") {
                if (isMobileViewport() && sheetState) {
                  updateSheetFooterState();
                }
                return;
              }

              var addVariantId = optionEl.getAttribute("data-variant-id");
              syncVariant(optionEl, { userSelected: true, skipVariantSelectorsSync: true });
              closeMenu();

              setTimeout(function () {
                submitProductForm(addVariantId);
              }, 0);
            });
            return;
          }

          var actionBtn = e.target.closest("[data-action]");
          e.preventDefault();
          e.stopPropagation();

          syncVariant(optionEl, { userSelected: true });

          if (isMobileViewport() && sheetState) {
            updateSheetFooterState();
          }

          var action = actionBtn ? actionBtn.getAttribute("data-action") : null;

          if (action === "buy") {
            updateOptionCartState(function () {
              if (optionEl.getAttribute("data-ymee-cart-soldout") === "true") {
                if (isMobileViewport() && sheetState) {
                  updateSheetFooterState();
                }
                return;
              }

              syncVariant(optionEl, { userSelected: true, skipVariantSelectorsSync: true });
              closeMenu();
              submitProductForm(optionEl.getAttribute("data-variant-id"));
            });
            return;
          }

          if (action === "notify" || action === "inquire" || action === "available_soon") {
            closeMenu();
            var variantId = optionEl ? optionEl.getAttribute("data-variant-id") : "";
            var pid = actionBtn ? actionBtn.getAttribute("data-product-id") || "" : "";
            if (!pid && sectionRoot) {
              var bisBtn = sectionRoot.querySelector("[data-bis-drawer-open]");
              if (bisBtn) pid = bisBtn.getAttribute("data-product-id") || "";
              if (!pid) {
                var pf = sectionRoot.querySelector("product-form[data-product-id]");
                if (pf) pid = pf.getAttribute("data-product-id") || "";
              }
            }
            if (window.openBisDrawer) {
              window.openBisDrawer(action, variantId, pid);
            }
            return;
          }

          if (!isMobileViewport()) {
            closeMenu();
          }
        },
        true
      );

      menu.addEventListener("mouseover", function (e) {
        if (isMobileViewport()) return;
        var optionEl = e.target.closest(".ymee-variant-dropdown__option");
        if (!optionEl || !menu.contains(optionEl)) return;
        if (optionEl.style.display === "none") return;

        // Prevent multiple firings with a data attribute
        if (optionEl.dataset.hoverActive === "true") return;
        optionEl.dataset.hoverActive = "true";

        // Clear any existing selection first
        clearSelectedVisual();

        // Add is-selected to ALL hovered options (including is-oos)
        setSelectedVisual(optionEl);
      });

      menu.addEventListener("mouseout", function (e) {
        if (isMobileViewport()) return;
        var optionEl = e.target.closest(".ymee-variant-dropdown__option");
        if (optionEl) {
          optionEl.dataset.hoverActive = "false";
        }
        // Always clear when leaving any option
        clearSelectedVisual();
      });

      root.addEventListener("mouseleave", function (e) {
        // Only clear if we're not moving to a child element within the dropdown
        if (!e.relatedTarget || !root.contains(e.relatedTarget)) {
          clearSelectedVisual();
        }
      });

      /* Color picker change is handled by a single delegated listener on document (see bottom of IIFE) */

      if (variantIdInput) {
        var lastSyncedId = variantIdInput.value;

        function onExternalVariantChange() {
          variantIdInput = getLiveVariantIdInput();
          if (!variantIdInput) return;
          if (variantIdInput.value === lastSyncedId) return;
          lastSyncedId = variantIdInput.value;

          updateColorPickerAvailability();
          filterRowsByColor();

          var optionEl = menu.querySelector(
            '.ymee-variant-dropdown__option[data-variant-id="' + cssEscape(lastSyncedId) + '"]'
          );
          if (optionEl) {
            setSelectedVisual(optionEl);
            updatePlaceholder(optionEl, false);

            var colorCode = getColorFromPicker(sectionRoot);
            if (colorCode) {
              applyGalleryFilterDeferred(sectionId, colorCode);
            }
          }
        }

        var observer = new MutationObserver(onExternalVariantChange);
        observer.observe(sectionRoot, { childList: true, subtree: true, attributes: true, attributeFilter: ["value"] });
        sectionRoot.addEventListener("change", function (evt) {
          var target = evt && evt.target;
          if (!target || target.name !== "id") return;
          if (target.getAttribute("form") !== productFormId) return;
          onExternalVariantChange();
        });
      }

      filterRowsByColor();
      updateColorPickerAvailability();
      updateOptionCartState();
      var initial = getSelectedOptionEl();
      if (initial) {
        setSelectedVisual(initial);
        updatePlaceholder(initial, false);
      }

      // Apply initial gallery filter based on selected color
      var initColorCode = getGalleryColorCode(sectionRoot, sectionId);
      if (initColorCode) {
        applyGalleryFilterDeferred(sectionId, initColorCode);
      }
    });
  }

  document.addEventListener("theme:product:add", function () {
    scheduleReinit();
  });

  document.addEventListener("theme:cart:refresh", function () {
    scheduleReinit();
  });

  function initColorPickers(scope) {
    (scope || document).querySelectorAll("[data-ymee-color-picker]").forEach(function (picker) {
      var sectionId = picker.getAttribute("data-section-id");
      if (!sectionId) return;

      var sectionRoot =
        document.querySelector("#MainProduct--" + cssEscape(sectionId)) ||
        picker.closest('[data-section-id="' + cssEscape(sectionId) + '"]') ||
        document;

      var hasDropdown = sectionRoot.querySelector("[data-ymee-variant-dropdown]");
      if (hasDropdown) return;

      // Prevent tiny scroll jump on color-change variant updates for PDPs
      // that do not use the alt-based variant/common gallery system.
      if (!hasVariantAltMediaSystem(sectionRoot, sectionId)) {
        var productInfoEl =
          sectionRoot.closest("product-info") || sectionRoot.querySelector("product-info") || sectionRoot;
        if (productInfoEl && productInfoEl.tagName === "PRODUCT-INFO") {
          productInfoEl.setAttribute("data-variant-image-scroll", "false");
          productInfoEl.variantImageScroll = false;
        }
      }

      // Set initial selected state for color picker items
      var checkedInput = picker.querySelector("[data-ymee-color-input]:checked");
      if (checkedInput) {
        picker.querySelectorAll(".ymee-color-picker__item").forEach(function (item) {
          var itemInput = item.querySelector("[data-ymee-color-input]");
          item.classList.toggle("is-selected", itemInput === checkedInput);
        });

        // Show/hide values based on selected value
        var selectedValue = checkedInput.value;
        picker.querySelectorAll(".ymee-color-picker__value").forEach(function (valueEl) {
          if (valueEl.textContent === selectedValue) {
            valueEl.removeAttribute("hidden");
          } else {
            valueEl.setAttribute("hidden", "");
          }
        });
      }

      // Apply initial gallery filter for standalone mode (only once)
      if (!picker.dataset.ymeeGalleryFilterApplied) {
        var initStandaloneColor = getGalleryColorCode(sectionRoot, sectionId);
        if (initStandaloneColor) {
          picker.dataset.ymeeGalleryFilterApplied = "true";
          applyGalleryFilterDeferred(sectionId, initStandaloneColor);
        }
      }

      var variantSelects = sectionRoot.querySelector('variant-selects[data-section="' + cssEscape(sectionId) + '"]');

      if (variantSelects) {
        var formHolder = variantSelects.closest(".product__block.product__form__holder");
        if (formHolder) {
          formHolder.style.position = "absolute";
          formHolder.style.width = "1px";
          formHolder.style.height = "1px";
          formHolder.style.overflow = "hidden";
          formHolder.style.clip = "rect(0 0 0 0)";
          formHolder.style.clipPath = "inset(50%)";
        }
      }
    });
  }

  /* ── Sticky swatch click → close any open ymee-variant-sheet + reset size placeholder ── */
  document.addEventListener("click", function (e) {
    if (!e.target.closest(".product__sticky-swatch")) return;

    var openSheet = document.querySelector(".ymee-variant-sheet:not([hidden])");
    if (openSheet) {
      document.documentElement.classList.remove("ymee-variant-sheet-open");
      openSheet.hidden = true;
    }

    var swatch = e.target.closest(".product__sticky-swatch");
    var sectionRoot = swatch.closest('[id^="MainProduct--"]') || document;

    // Reset placeholder to default "choose size" text
    var placeholderEl = sectionRoot.querySelector("[data-ymee-variant-dropdown-placeholder]");
    var valueEl = sectionRoot.querySelector("[data-ymee-variant-dropdown-value]");
    if (placeholderEl) {
      placeholderEl.textContent = window.ymeeChooseSizeText || "";
      placeholderEl.removeAttribute("hidden");
    }
    if (valueEl) valueEl.hidden = true;

    // Hide footer ATC button
    var footerAtc = sectionRoot.querySelector("[data-ymee-footer-atc]");
    if (footerAtc) footerAtc.hidden = true;

    // Clear selected variant state
    sectionRoot.removeAttribute("data-ymee-variant-selected");
    sectionRoot.querySelectorAll(".ymee-variant-dropdown__option.is-selected").forEach(function (opt) {
      opt.classList.remove("is-selected");
    });
  });

  /* ── Delegated color-picker change handler ──────────────────────────
   * Bound ONCE on document – survives any product-info DOM replacement.
   * Handles both dropdown-mode and standalone-mode color pickers.
   */
  document.addEventListener(
    "change",
    function (e) {
      var input = e.target.closest("[data-ymee-color-input]");
      if (!input) return;

      /* ── Sticky-bar swatch → delegate to main ymee-color-picker ── */
      var stickyContainer = input.closest("[data-sticky-color-swatches]");
      if (stickyContainer) {
        var optPos = stickyContainer.getAttribute("data-option-position");
        var sectionRoot = stickyContainer.closest('[id^="MainProduct--"]') || document;
        var mainPicker = sectionRoot.querySelector('[data-ymee-color-picker][data-option-position="' + optPos + '"]');
        if (mainPicker) {
          var mainInput = mainPicker.querySelector('[data-ymee-color-input][value="' + cssEscape(input.value) + '"]');
          if (mainInput && !mainInput.checked) {
            mainInput.checked = true;
            mainInput.dispatchEvent(new Event("change", { bubbles: true }));
          }
        }
        // Update sticky swatch visual state
        stickyContainer.querySelectorAll(".product__sticky-swatch").forEach(function (sw) {
          var swInput = sw.querySelector("[data-ymee-color-input]");
          sw.classList.toggle("is-active", swInput === input);
        });
        return;
      }

      var picker = input.closest("[data-ymee-color-picker]");
      if (!picker) return;

      var sectionId = picker.getAttribute("data-section-id");
      if (!sectionId) return;

      var optionPos = parseInt(picker.getAttribute("data-option-position"), 10);

      var sectionRoot =
        document.querySelector("#MainProduct--" + cssEscape(sectionId)) ||
        picker.closest('[data-section-id="' + cssEscape(sectionId) + '"]') ||
        document;

      // Update selected state
      picker.querySelectorAll(".ymee-color-picker__item").forEach(function (item) {
        var itemInput = item.querySelector("[data-ymee-color-input]");
        item.classList.toggle("is-selected", itemInput === input);
      });

      // Show/hide values based on selected value
      var selectedValue = input.value;
      picker.querySelectorAll(".ymee-color-picker__value").forEach(function (valueEl) {
        if (valueEl.textContent === selectedValue) {
          valueEl.removeAttribute("hidden");
        } else {
          valueEl.setAttribute("hidden", "");
        }
      });

      // Sync sticky bar swatches
      var stickySwatches = sectionRoot.querySelector(
        '[data-sticky-color-swatches][data-option-position="' + optionPos + '"]'
      );
      if (stickySwatches) {
        stickySwatches.querySelectorAll(".product__sticky-swatch").forEach(function (sw) {
          var swInput = sw.querySelector("[data-ymee-color-input]");
          if (swInput) {
            var isMatch = swInput.value === input.value;
            swInput.checked = isMatch;
            sw.classList.toggle("is-active", isMatch);
          }
        });
      }

      var variantSelects =
        sectionRoot.querySelector('variant-selects[data-section="' + cssEscape(sectionId) + '"]') ||
        sectionRoot.querySelector("variant-selects");

      if (variantSelects && !isNaN(optionPos)) {
        var wrapper = variantSelects.querySelector('.selector-wrapper[data-option-position="' + optionPos + '"]');
        if (wrapper) {
          // Suppress scroll-to-media triggered by the theme's product-info
          // updateMedia by setting a global flag checked by our scrollTo wrapper.
          window.__ymeeSkipScrollTo = true;
          setTimeout(function () {
            window.__ymeeSkipScrollTo = false;
          }, 4000);

          var radio = wrapper.querySelector('input[type="radio"][value="' + cssEscape(input.value) + '"]');
          if (radio && !radio.checked) {
            radio.checked = true;
            radio.dispatchEvent(new Event("change", { bubbles: true }));
          }
          var selectEl = wrapper.querySelector("select, [data-popout-input]");
          if (selectEl && selectEl.value !== input.value) {
            selectEl.value = input.value;
            selectEl.dispatchEvent(new Event("change", { bubbles: true }));
          }
        }
        // Apply gallery filter on color change
        var galleryColorCode = getGalleryColorCode(sectionRoot, sectionId);
        applyGalleryFilterDeferred(sectionId, galleryColorCode);
        return;
      }

      var productDataEl = sectionRoot.querySelector("[data-product-json]");
      var productData = null;
      try {
        if (productDataEl) productData = JSON.parse(productDataEl.textContent || "{}");
      } catch (ex) {
        /* no-op */
      }

      if (!productData || !productData.variants) return;

      var colorOptIndex = isNaN(optionPos) ? -1 : optionPos - 1;
      var opts = {};
      sectionRoot.querySelectorAll("[data-ymee-color-picker]").forEach(function (p) {
        var pos = parseInt(p.getAttribute("data-option-position"), 10);
        var checked = p.querySelector("[data-ymee-color-input]:checked");
        if (checked && !isNaN(pos)) opts[pos - 1] = checked.value;
      });

      var matchedVariant = null;
      for (var i = 0; i < productData.variants.length; i++) {
        var v = productData.variants[i];
        var match = true;
        for (var k in opts) {
          if (v.options[parseInt(k, 10)] !== opts[k]) {
            match = false;
            break;
          }
        }
        if (match) {
          matchedVariant = v;
          break;
        }
      }

      if (matchedVariant) {
        var productFormId = "product-form-" + sectionId;
        var variantIdInput = sectionRoot.querySelector('input[name="id"][form="' + cssEscape(productFormId) + '"]');
        if (variantIdInput && String(variantIdInput.value) !== String(matchedVariant.id)) {
          variantIdInput.value = matchedVariant.id;
        }
        var variantIdInForm = sectionRoot.querySelector('product-form input[name="id"].product-variant-id');
        if (variantIdInForm && String(variantIdInForm.value) !== String(matchedVariant.id)) {
          variantIdInForm.value = matchedVariant.id;
        }
        if (matchedVariant.featured_media && matchedVariant.featured_media.id) {
          var productImagesEl = sectionRoot.querySelector(".product__images") || sectionRoot;
          var hasModelSlide = !!productImagesEl.querySelector('[data-embla-slide][data-media-type="model"]');
          if (!hasModelSlide) {
            var mediaId = sectionId + "-" + matchedVariant.featured_media.id;
            // Dispatch media select event with preventScroll flag
            productImagesEl.dispatchEvent(
              new CustomEvent("theme:media:select", {
                bubbles: true,
                detail: { id: mediaId, preventFocus: true, preventScroll: true },
              })
            );
          }
        }
        document.dispatchEvent(new CustomEvent("theme:variant:change", { detail: { variant: matchedVariant } }));

        // Apply gallery filter on color change
        var standaloneGalleryColorCode = getGalleryColorCode(sectionRoot, sectionId);
        applyGalleryFilterDeferred(sectionId, standaloneGalleryColorCode);
      }
    },
    true
  );

  /* ── Dynamic notify button visibility ───────────────────────────── */
  function updateNotifyButtonVisibility(variant) {
    var sectionRoot = document.querySelector('[id^="MainProduct--"]');
    if (!sectionRoot) return;

    // Skip products with size dropdown — the dropdown handles notify internally
    if (sectionRoot.querySelector("[data-ymee-variant-dropdown]")) return;

    var notifyBtn = sectionRoot.querySelector("[data-bis-drawer-open]");
    if (!notifyBtn) return;

    // Always prefer the currently selected variant id from the product form.
    // Color/option changes can emit intermediate variant events; reading the
    // latest selected id avoids transient notify/add-to-cart flicker.
    var selectedVariantId = "";
    var primaryVariantIdInput = sectionRoot.querySelector('input[name="id"]');
    if (primaryVariantIdInput && primaryVariantIdInput.value) {
      selectedVariantId = String(primaryVariantIdInput.value);
    }

    // If no variant is provided, or provided variant is stale, resolve from
    // current selected id + product JSON.
    if (!variant || (selectedVariantId && String(variant.id) !== selectedVariantId)) {
      var productDataEl = sectionRoot.querySelector("[data-product-json]");
      if (!productDataEl || !selectedVariantId) return;
      try {
        var productData = JSON.parse(productDataEl.textContent);
        variant = productData.variants.find(function (v) {
          return String(v.id) === selectedVariantId;
        });
      } catch (e) {
        return;
      }
    }

    if (!variant) return;

    var isOutOfStock = !variant.available;

    // Toggle visibility via a data attribute on the container.
    // CSS rules key off [data-notify-active] to swap ATC ↔ Notify.
    // This is immune to the theme's transient toggleSubmitButton()
    // calls that briefly set disabled on ATC during variant changes.
    var submitItem = notifyBtn.closest(".product__submit__item");
    if (submitItem) {
      if (isOutOfStock) {
        submitItem.setAttribute("data-notify-active", "");
      } else {
        submitItem.removeAttribute("data-notify-active");
      }
    }

    if (isOutOfStock) {
      notifyBtn.setAttribute("data-variant-id", variant.id);
    }
  }

  document.addEventListener("theme:variant:change", function (e) {
    updateNotifyButtonVisibility(e.detail && e.detail.variant);
  });

  // Also subscribe to the theme's pub/sub variantChange event.  This fires
  // AFTER product-info finishes its fetch + DOM updates (toggleSubmitButton,
  // innerHTML replacements, etc.), so it corrects any state that the theme's
  // built-in handler may have overwritten between our earlier
  // theme:variant:change dispatch and the fetch response.
  if (window.subscribe && window.theme && window.theme.PUB_SUB_EVENTS) {
    window.subscribe(window.theme.PUB_SUB_EVENTS.variantChange, function (event) {
      var variant = event && event.data && event.data.variant;
      updateNotifyButtonVisibility(variant || null);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    updateNotifyButtonVisibility(null);
  });

  /* ── Form-only wrapper: wire up icon click (hamburger) ─────────── */
  function initFormOnlyWrappers(scope) {
    (scope || document).querySelectorAll("[data-ymee-variant-dropdown-form-only]").forEach(function (root) {
      if (root.dataset.ymeeFormOnlyBound === "true") return;
      root.dataset.ymeeFormOnlyBound = "true";

      var toggleIcon = root.querySelector(".ymee-variant-dropdown__toggle-icon");
      if (toggleIcon) {
        toggleIcon.addEventListener("click", function (e) {
          if (!isMobileViewport()) return;
          e.preventDefault();
          e.stopPropagation();
          var hamburger = document.querySelector('.header__mobile__hamburger[data-drawer-toggle="hamburger"]');
          if (hamburger) hamburger.click();
        });
      }
    });
  }

  /* ── Reinit for dropdown (toggle/menu/sheet handlers) ────────────── */
  var reinitQueued = false;
  function scheduleReinit() {
    if (reinitQueued) return;
    reinitQueued = true;
    requestAnimationFrame(function () {
      reinitQueued = false;
      init(document);
      initColorPickers(document);
      initFormOnlyWrappers(document);
    });
  }

  function observeProductInfo() {
    document.querySelectorAll("product-info").forEach(function (pi) {
      if (pi.dataset.ymeeObserved) return;
      pi.dataset.ymeeObserved = "true";
      new MutationObserver(scheduleReinit).observe(pi, { childList: true, subtree: true });
    });
  }

  function refreshDropdownCartState(scope) {
    (scope || document).querySelectorAll("[data-ymee-variant-dropdown]").forEach(function (root) {
      if (typeof root._ymeeUpdateOptionCartState === "function") {
        root._ymeeUpdateOptionCartState();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      init(document);
      initColorPickers(document);
      initFormOnlyWrappers(document);
      observeProductInfo();
    });
  } else {
    init(document);
    initColorPickers(document);
    initFormOnlyWrappers(document);
    observeProductInfo();
  }

  document.addEventListener("shopify:section:load", function (e) {
    init(e.target);
    initColorPickers(e.target);
    initFormOnlyWrappers(e.target);
    observeProductInfo();
  });

  document.addEventListener("theme:product:add", function () {
    setTimeout(function () {
      refreshDropdownCartState(document);
    }, 0);
  });

  document.addEventListener("theme:cart:change", function () {
    refreshDropdownCartState(document);
  });

  document.addEventListener("theme:cart:refresh", function () {
    refreshDropdownCartState(document);
  });
})();
