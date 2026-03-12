/**
 * SIZE-only dropdown. Metal color / other options use the default theme picker.
 * Desktop: inline dropdown overlay.  Mobile: bottom-sheet.
 * Listens for color changes from the default picker and filters dropdown rows.
 * Includes gallery filtering logic (still-life by Y/W/R, model always visible).
 */
(function () {
  function cssEscape(val) {
    if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(val);
    return String(val).replace(/[^a-zA-Z0-9_\-]/g, function (ch) {
      return '\\' + ch;
    });
  }

  function isMobileViewport() {
    try {
      return window.matchMedia && window.matchMedia('(max-width: 1024px)').matches;
    } catch (e) {
      return false;
    }
  }

  function createSheet(sectionId, mountParent) {
    var selector = '[data-ymee-variant-sheet]';
    if (sectionId) selector = '[data-ymee-variant-sheet][data-ymee-variant-sheet-for="' + cssEscape(sectionId) + '"]';

    var existing = document.querySelector(selector);
    if (existing) {
      var existingBackdrop = null;
      try {
        existingBackdrop = document.querySelector(
          '[data-ymee-variant-sheet-backdrop][data-ymee-variant-sheet-for="' + cssEscape(sectionId) + '"]'
        );
      } catch (e) {
        existingBackdrop = document.querySelector('[data-ymee-variant-sheet-backdrop]');
      }
      return {
        sheet: existing,
        body: existing.querySelector('[data-ymee-variant-sheet-body]'),
        footer: existing.querySelector('[data-ymee-variant-sheet-footer]'),
        footerAddBtn: existing.querySelector('[data-ymee-variant-sheet-footer-add]'),
        footerAccelSlot: existing.querySelector('[data-ymee-variant-sheet-footer-accelerated-slot]'),
        closeBtn: existing.querySelector('[data-ymee-variant-sheet-close]'),
        backdrop: existingBackdrop,
      };
    }

    var backdrop = document.createElement('div');
    backdrop.className = 'ymee-variant-sheet-backdrop';
    backdrop.setAttribute('data-ymee-variant-sheet-backdrop', '');
    if (sectionId) backdrop.setAttribute('data-ymee-variant-sheet-for', sectionId);
    backdrop.hidden = true;

    var sheet = document.createElement('div');
    sheet.className = 'ymee-variant-sheet';
    sheet.setAttribute('data-ymee-variant-sheet', '');
    if (sectionId) sheet.setAttribute('data-ymee-variant-sheet-for', sectionId);
    sheet.hidden = true;

    var header = document.createElement('div');
    header.className = 'ymee-variant-sheet__header';

    var title = document.createElement('div');
    title.className = 'ymee-variant-sheet__title';
    title.textContent = window.ymeeSelectSizeText || 'Choose size';

    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'ymee-variant-sheet__close';
    closeBtn.innerHTML = '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 1L1 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M1 1L13 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    closeBtn.setAttribute('data-ymee-variant-sheet-close', '');

    header.appendChild(title);
    header.appendChild(closeBtn);

    var body = document.createElement('div');
    body.className = 'ymee-variant-sheet__body';
    body.setAttribute('data-ymee-variant-sheet-body', '');

    var footer = document.createElement('div');
    footer.className = 'ymee-variant-sheet__footer';
    footer.setAttribute('data-ymee-variant-sheet-footer', '');

    var footerActions = document.createElement('div');
    footerActions.className = 'ymee-variant-sheet__footer-actions';

    var footerAddBtn = document.createElement('button');
    footerAddBtn.type = 'button';
    footerAddBtn.className = 'ymee-variant-sheet__footer-add';
    footerAddBtn.setAttribute('data-ymee-variant-sheet-footer-add', '');
    footerAddBtn.innerHTML = '<span class="btn__text"><svg class="btn__icon" xmlns="http://www.w3.org/2000/svg" width="17" height="19" viewBox="0 0 17 19" fill="none"><path d="M16.666 15.4434L15.3643 5.02638C15.3379 4.76563 15.1035 4.55763 14.8438 4.55763H11.458V3.125C11.458 1.40625 10.0518 0 8.333 0C6.61425 0 5.208 1.40625 5.208 3.125V4.55763H1.82225C1.5615 4.55763 1.32713 4.76563 1.30175 5.02638L0 15.4434V15.4951C0 17.2139 1.40625 18.6201 3.125 18.6201H13.542C15.2608 18.6201 16.667 17.2139 16.667 15.4951C16.666 15.4697 16.666 15.4434 16.666 15.4434ZM6.25 3.12587C6.25 1.98038 7.1875 1.04288 8.333 1.04288C9.4785 1.04288 10.416 1.98038 10.416 3.12587V4.55753H6.25V3.12587ZM13.541 17.5789H3.125C1.9795 17.5789 1.06738 16.6677 1.042 15.5212L2.29103 5.59925H5.20803V7.68225C4.86915 7.86487 4.66115 8.20275 4.66115 8.59337C4.66115 9.16662 5.1299 9.63538 5.70315 9.63538C6.2764 9.63538 6.74515 9.16662 6.74515 8.59337C6.74515 8.22912 6.53714 7.89025 6.25003 7.70762V5.59923H10.417V7.68222C10.0782 7.86484 9.87015 8.20272 9.87015 8.59335C9.87015 9.1666 10.3389 9.63535 10.9122 9.63535C11.4854 9.63535 11.9542 9.1666 11.9542 8.59335C11.9542 8.2291 11.7461 7.89022 11.459 7.7076L11.458 5.5992H14.3751L15.6251 15.5212C15.5987 16.6667 14.6875 17.5789 13.541 17.5789ZM5.963 8.59438C5.963 8.75063 5.85851 8.85513 5.70225 8.85513C5.54599 8.85513 5.4415 8.75063 5.4415 8.59438C5.4415 8.43812 5.54599 8.33363 5.70225 8.33363C5.85948 8.33363 5.963 8.43812 5.963 8.59438ZM11.172 8.59438C11.172 8.75063 11.0675 8.85513 10.9113 8.85513C10.755 8.85513 10.6505 8.75063 10.6505 8.59438C10.6505 8.43812 10.755 8.33363 10.9113 8.33363C11.0675 8.33363 11.172 8.43812 11.172 8.59438Z" fill="currentColor"/></svg> Add to bag</span>';

    var footerAccelSlot = document.createElement('div');
    footerAccelSlot.className = 'ymee-variant-sheet__footer-accelerated-slot';
    footerAccelSlot.setAttribute('data-ymee-variant-sheet-footer-accelerated-slot', '');

    footerActions.appendChild(footerAddBtn);
    footerActions.appendChild(footerAccelSlot);
    footer.appendChild(footerActions);

    sheet.appendChild(header);
    sheet.appendChild(body);
    sheet.appendChild(footer);

    var parent = mountParent && mountParent.appendChild ? mountParent : document.body;
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
    if (!value) return '';
    var text = String(value).toLowerCase();
    if (text.indexOf('yellow') !== -1 || text.indexOf('yg') !== -1) return 'y';
    if (text.indexOf('white') !== -1 || text.indexOf('wg') !== -1) return 'w';
    if (text.indexOf('rose') !== -1 || text.indexOf('rg') !== -1) return 'r';

    var tokenMatch = text.match(/(?:^|[^a-z])(y|w|r)(?:[^a-z]|$)/i);
    return tokenMatch ? tokenMatch[1].toLowerCase() : '';
  }

  function getVariantColorCode(variant) {
    if (!variant) return '';
    var candidates = [variant.title, variant.option1, variant.option2, variant.option3];
    for (var i = 0; i < candidates.length; i++) {
      var code = normalizeColorCode(candidates[i]);
      if (code) return code;
    }
    return '';
  }

  function applyGalleryFilter(sectionId, colorCode) {
    var productImagesEl = document.querySelector(
      '#MainProduct--' +
        cssEscape(sectionId) +
        ' product-images, #MainProduct--' +
        cssEscape(sectionId) +
        ' .product__images'
    );
    if (!productImagesEl) return;

    var visibleMediaIds = [];

    var slides = productImagesEl.querySelectorAll('[data-embla-slide]');
    if (!slides.length) {
      slides = productImagesEl.querySelectorAll('[data-slide]');
    }

    slides.forEach(function (slide) {
      var mediaEl = slide.querySelector('[data-media-id]') || slide;
      var mediaId = mediaEl.getAttribute('data-media-id') || '';
      var mediaKind = (mediaEl.getAttribute('data-media-kind') || 'other').toLowerCase();
      var mediaColor = (mediaEl.getAttribute('data-media-color') || '').toLowerCase();
      var isVisible = true;

      if (mediaKind === 'still' && colorCode) {
        isVisible = mediaColor === colorCode;
      }

      slide.classList.toggle('pdp-embla__slide--filtered-out', !isVisible);
      slide.classList.toggle('product__slide--filtered-out', !isVisible);
      if (isVisible && mediaId) {
        visibleMediaIds.push(mediaId);
      }
    });

    productImagesEl.querySelectorAll('[data-thumb-link], .product__thumb a').forEach(function (thumbLink) {
      var thumbMediaId = thumbLink.getAttribute('data-media-id') || '';
      var thumbItem = thumbLink.closest('.product__thumb');
      if (!thumbItem) return;

      var thumbVisible = !thumbMediaId || visibleMediaIds.indexOf(thumbMediaId) !== -1;
      thumbItem.classList.toggle('pdp-thumb--filtered-out', !thumbVisible);
    });

    // ReInit Embla first so snap points reflect filtered slides
    productImagesEl.querySelectorAll('.pdp-embla').forEach(function (emblaRoot) {
      if (emblaRoot._emblaInstance && typeof emblaRoot._emblaInstance.reInit === 'function') {
        try {
          emblaRoot._emblaInstance.reInit();
        } catch (e) {}
      }
    });

    var activeMediaId = productImagesEl.getAttribute('data-active-media') || '';
    if (visibleMediaIds.length && activeMediaId && visibleMediaIds.indexOf(activeMediaId) === -1) {
      // Prefer first non-model visible media; fall back to visibleMediaIds[0]
      var preferredId = visibleMediaIds[0];
      var slides = productImagesEl.querySelectorAll("[data-embla-slide]");
      for (var si = 0; si < visibleMediaIds.length; si++) {
        var mid = visibleMediaIds[si];
        var found = false;
        slides.forEach(function (slide) {
          if (found) return;
          var mediaEl = slide.querySelector('[data-media-id="' + mid + '"]');
          if (mediaEl && slide.getAttribute("data-media-type") !== "model") {
            preferredId = mid;
            found = true;
          }
        });
        if (found) break;
      }
      productImagesEl.dispatchEvent(
        new CustomEvent("theme:media:select", {
          detail: { id: preferredId },
        })
      );
    }
  }

  function getCurrentNonSizeOptions(sectionRoot, sizeOptionIndex) {
    var result = {};

    var colorPickers = sectionRoot.querySelectorAll('[data-ymee-color-picker]');
    colorPickers.forEach(function (picker) {
      var pos = parseInt(picker.getAttribute('data-option-position'), 10);
      if (isNaN(pos)) return;
      var idx = pos - 1;
      if (idx === sizeOptionIndex) return;

      var checked = picker.querySelector('input[type="radio"]:checked');
      if (checked) {
        result[idx] = checked.value;
      }
    });

    if (Object.keys(result).length === 0) {
      var variantSelectsEl = sectionRoot.querySelector('variant-selects');
      if (variantSelectsEl) {
        var wrappers = variantSelectsEl.querySelectorAll('.selector-wrapper[data-option-position]');
        wrappers.forEach(function (wrapper) {
          var pos = parseInt(wrapper.getAttribute('data-option-position'), 10);
          if (isNaN(pos)) return;
          var idx = pos - 1;
          if (idx === sizeOptionIndex) return;

          var checked = wrapper.querySelector('input[type="radio"]:checked');
          if (checked) {
            result[idx] = checked.value;
            return;
          }
          var selectEl = wrapper.querySelector('select');
          if (selectEl) {
            result[idx] = selectEl.value;
          }
        });
      }
    }

    return result;
  }

  function init(scope) {
    (scope || document)
      .querySelectorAll('[data-ymee-variant-dropdown]')
      .forEach(function (root) {
        if (root.dataset.ymeeBound === 'true') return;
        root.dataset.ymeeBound = 'true';

        var sectionId = root.getAttribute('data-section-id');
        if (!sectionId) return;

        var sizeOptionIndex = parseInt(root.getAttribute('data-size-option-index'), 10);
        if (isNaN(sizeOptionIndex) || sizeOptionIndex < 0) return;

        var sectionRoot =
          document.querySelector('#MainProduct--' + cssEscape(sectionId)) ||
          root.closest('[data-section-id="' + cssEscape(sectionId) + '"]') ||
          document;

        sectionRoot.setAttribute('data-ymee-variant-dropdown-enabled', 'true');

        var toggle = root.querySelector('.ymee-variant-dropdown__toggle');
        var menu = root.querySelector('.ymee-variant-dropdown__menu');
        var placeholderEl = root.querySelector('[data-ymee-variant-dropdown-placeholder]');

        var productFormId = 'product-form-' + sectionId;
        var formEl = document.getElementById(productFormId);

        function getLiveFormEl() {
          return document.getElementById(productFormId);
        }

        function submitProductForm() {
          var liveFormEl = getLiveFormEl();
          if (!liveFormEl) return;

          try {
            if (typeof liveFormEl.requestSubmit === 'function') {
              liveFormEl.requestSubmit();
              return;
            }
          } catch (err) { /* no-op */ }

          try {
            var realSubmit = liveFormEl.querySelector('button[type="submit"], input[type="submit"]');
            if (realSubmit && typeof realSubmit.click === 'function') realSubmit.click();
          } catch (err2) { /* no-op */ }
        }

        function getLiveVariantIdInput() {
          return sectionRoot.querySelector('input[name="id"][form="' + cssEscape(productFormId) + '"]');
        }

        function getLiveVariantSelects() {
          return (
            sectionRoot.querySelector('variant-selects[data-section="' + cssEscape(sectionId) + '"]') ||
            sectionRoot.querySelector('variant-selects')
          );
        }

        var variantIdInput = getLiveVariantIdInput();
        var variantSelects = getLiveVariantSelects();

        var productDataEl = sectionRoot.querySelector('[data-product-json]');
        var productData = null;
        var variantById = {};

        try {
          if (productDataEl) {
            productData = JSON.parse(productDataEl.textContent || '{}');
          }
        } catch (e) { /* no-op */ }

        if (productData && productData.variants) {
          productData.variants.forEach(function (v) {
            if (v && v.id) variantById[String(v.id)] = v;
          });
        }

        if (!toggle || !menu) return;

        var allOptions = menu.querySelectorAll('.ymee-variant-dropdown__option');
        var sheetState = null;
        var menuHomeParent = menu.parentElement;
        var menuHomeNext = menu.nextSibling;
        var escHandlerBound = false;

        function filterRowsByColor() {
          var nonSizeOpts = getCurrentNonSizeOptions(sectionRoot, sizeOptionIndex);
          var seenSizes = {};

          allOptions.forEach(function (el) {
            var match = true;
            Object.keys(nonSizeOpts).forEach(function (idxStr) {
              var optKey = 'data-option' + (parseInt(idxStr, 10) + 1);
              var elVal = (el.getAttribute(optKey) || '').trim();
              if (elVal !== nonSizeOpts[idxStr]) match = false;
            });

            var sizeVal = el.getAttribute('data-size-value') || '';

            if (match && !seenSizes[sizeVal]) {
              el.style.display = '';
              seenSizes[sizeVal] = true;
            } else {
              el.style.display = 'none';
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

          sectionRoot.querySelectorAll('[data-ymee-color-picker]').forEach(function (pickerEl) {
            var pos = parseInt(pickerEl.getAttribute('data-option-position'), 10);
            if (isNaN(pos)) return;
            var checked = pickerEl.querySelector('[data-ymee-color-input]:checked');
            if (checked) opts[pos - 1] = checked.value;
          });

          if (variantSelects) {
            variantSelects.querySelectorAll('.selector-wrapper[data-option-position]').forEach(function (wrapper) {
              var pos = parseInt(wrapper.getAttribute('data-option-position'), 10);
              if (isNaN(pos)) return;

              var checked = wrapper.querySelector('input[type="radio"]:checked');
              if (checked) {
                opts[pos - 1] = checked.value;
                return;
              }

              var selectEl = wrapper.querySelector('select, [data-popout-input]');
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

          sectionRoot.querySelectorAll('[data-ymee-color-picker]').forEach(function (pickerEl) {
            var optionPos = parseInt(pickerEl.getAttribute('data-option-position'), 10);
            if (isNaN(optionPos)) return;

            var optionIndex = optionPos - 1;

            pickerEl.querySelectorAll('.ymee-color-picker__item').forEach(function (itemEl) {
              var inputEl = itemEl.querySelector('[data-ymee-color-input]');
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

              itemEl.classList.toggle('is-unavailable', !isAvailable);
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
          var requestedSize = selectedOptions[sizeOptionIndex] || '';

          if (requestedSize) {
            var bySize = menu.querySelector(
              '.ymee-variant-dropdown__option[data-size-value="' + cssEscape(requestedSize) + '"]:not([style*="display: none"])'
            );
            if (bySize) return bySize;
          }

          var targetVariant = findVariantByOptions(selectedOptions);
          if (targetVariant && targetVariant.id) {
            var byVariant = menu.querySelector(
              '.ymee-variant-dropdown__option[data-variant-id="' + cssEscape(String(targetVariant.id)) + '"]:not([style*="display: none"])'
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
            if (byVariant && byVariant.style.display !== 'none') return byVariant;
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
              el.classList.remove('is-selected');
              el.setAttribute('aria-selected', 'false');
            });
          } catch (e) { /* no-op */ }
        }

        function setSelectedVisual(optionEl) {
          allOptions.forEach(function (el) {
            el.classList.toggle('is-selected', el === optionEl);
            el.setAttribute('aria-selected', el === optionEl ? 'true' : 'false');
          });
        }

        function updatePlaceholder(optionEl, userSelected) {
          if (!placeholderEl || !optionEl) return;
          if (!userSelected) return;
          var sizeVal = optionEl.getAttribute('data-size-value') || '';
          if (sizeVal) placeholderEl.textContent = (window.ymeeSizePrefixText || 'Size: ') + ' ' + sizeVal;
        }

        function updateSheetFooterState() {
          if (!sheetState) return;
          var visualSelected = menu.querySelector('.ymee-variant-dropdown__option.is-selected:not([style*="display: none"])');

          if (isMobileViewport()) {
            if (sheetState.footer) sheetState.footer.hidden = !visualSelected;
            if (!visualSelected) {
              if (sheetState.footerAddBtn) sheetState.footerAddBtn.disabled = true;
              return;
            }
          }

          var selected = visualSelected || getSelectedOptionEl();
          if (!selected) return;

          if (sheetState.footerAddBtn) {
            sheetState.footerAddBtn.disabled = !!selected.classList.contains('is-oos');
          }
        }

        function closeSheet() {
          if (!sheetState) return;
          try {
            document.documentElement.classList.remove('ymee-variant-sheet-open');
          } catch (e) { /* no-op */ }
          if (sheetState.backdrop) sheetState.backdrop.removeEventListener('click', closeMenu);
          if (sheetState.closeBtn) sheetState.closeBtn.removeEventListener('click', closeMenu);

          var sheetEl = sheetState.sheet;
          var backdropEl = sheetState.backdrop;
          var hideDone = false;
          var finishHide = function () {
            if (hideDone) return;
            hideDone = true;
            if (backdropEl) backdropEl.hidden = true;
            if (sheetEl) sheetEl.hidden = true;
          };

          if (sheetEl && typeof sheetEl.addEventListener === 'function') {
            var onEnd = function (evt) {
              if (evt && evt.target !== sheetEl) return;
              sheetEl.removeEventListener('transitionend', onEnd);
              finishHide();
            };
            sheetEl.addEventListener('transitionend', onEnd);
            setTimeout(function () {
              sheetEl.removeEventListener('transitionend', onEnd);
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
            root.classList.remove('is-open');
            setTimeout(function() {
              if (!root.classList.contains('is-open')) {
                menu.hidden = true;
              }
            }, 300);
          }
          toggle.setAttribute('aria-expanded', 'false');
        }

        function openSheet() {
          filterRowsByColor();
          sheetState = createSheet(sectionId, sectionRoot);
          if (!sheetState || !sheetState.body) return;

          if (sheetState.backdrop) sheetState.backdrop.hidden = false;
          if (sheetState.sheet) sheetState.sheet.hidden = false;

          sheetState.body.innerHTML = '';
          sheetState.body.appendChild(menu);
          menu.hidden = false;

          var alreadySelected = sectionRoot.getAttribute('data-ymee-variant-selected') === 'true';
          if (alreadySelected) {
            var preselect = getSelectedOptionEl();
            if (preselect) setSelectedVisual(preselect);
            else clearSelectedVisual();
          } else {
            clearSelectedVisual();
          }

          updateSheetFooterState();

          try {
            document.documentElement.classList.remove('ymee-variant-sheet-open');
            requestAnimationFrame(function () {
              requestAnimationFrame(function () {
                document.documentElement.classList.add('ymee-variant-sheet-open');
              });
            });
          } catch (e) { /* no-op */ }

          if (sheetState.backdrop) sheetState.backdrop.addEventListener('click', closeMenu);
          if (sheetState.closeBtn) sheetState.closeBtn.addEventListener('click', closeMenu);

          if (sheetState.footerAddBtn && !sheetState.footerAddBtn.dataset.ymeeBound) {
            sheetState.footerAddBtn.dataset.ymeeBound = 'true';
            sheetState.footerAddBtn.addEventListener('click', function (e) {
              if (!isMobileViewport()) return;
              e.preventDefault();
              e.stopPropagation();

              var selected = getSelectedOptionEl();
              if (selected) syncVariant(selected, { userSelected: true });
              closeMenu();

              setTimeout(function () {
                submitProductForm();
              }, 0);
            });
          }

          if (!escHandlerBound) {
            escHandlerBound = true;
            document.addEventListener('keydown', function (evt) {
              if (!sheetState) return;
              if (evt.key === 'Escape' || evt.key === 'Esc') {
                closeMenu();
              }
            });
          }
        }

        function openMenu() {
          filterRowsByColor();
          updateColorPickerAvailability();
          if (isMobileViewport()) {
            openSheet();
          } else {
            menu.hidden = false;
            requestAnimationFrame(function() {
              requestAnimationFrame(function() {
                root.classList.add('is-open');
              });
            });
          }
          toggle.setAttribute('aria-expanded', 'true');
        }

        function syncVariant(optionEl, opts) {
          if (!optionEl) return;
          opts = opts || {};

          var variantId = optionEl.getAttribute('data-variant-id');

          if (opts.userSelected) {
            try { sectionRoot.setAttribute('data-ymee-variant-selected', 'true'); } catch (e) { /* no-op */ }
          }

          updatePlaceholder(optionEl, opts.userSelected);
          setSelectedVisual(optionEl);

          variantIdInput = getLiveVariantIdInput();
          if (variantIdInput && variantId) {
            if (String(variantIdInput.value) !== String(variantId)) {
              variantIdInput.value = variantId;
              variantIdInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }

          variantSelects = getLiveVariantSelects();
          if (variantSelects) {
            var sizeVal = optionEl.getAttribute('data-size-value') || '';
            var sizeWrapper = variantSelects.querySelector('.selector-wrapper--size');
            if (sizeWrapper && sizeVal) {
              var sizeRadios = sizeWrapper.querySelectorAll('input[type="radio"]');
              sizeRadios.forEach(function (radio) {
                if (radio.value === sizeVal && !radio.checked) {
                  radio.checked = true;
                  radio.dispatchEvent(new Event('change', { bubbles: true }));
                }
              });

              var sizeSelect = sizeWrapper.querySelector('select, [data-popout-input]');
              if (sizeSelect && sizeSelect.value !== sizeVal) {
                sizeSelect.value = sizeVal;
                sizeSelect.dispatchEvent(new Event('change', { bubbles: true }));
              }
            }
          }

          var variant = variantById[String(variantId)];
          if (variant) {
            document.dispatchEvent(
              new CustomEvent('theme:variant:change', { detail: { variant: variant } })
            );
          }

          var colorCode = getVariantColorCode(variant);
          applyGalleryFilter(sectionId, colorCode);
        }

        toggle.addEventListener('click', function (e) {
          e.preventDefault();
          if (menu.hidden) openMenu();
          else closeMenu();
        });

        document.addEventListener('click', function (e) {
          if (sheetState) return;
          if (!root.contains(e.target)) closeMenu();
        });

        menu.addEventListener(
          'click',
          function (e) {
            var optionEl = e.target.closest('.ymee-variant-dropdown__option');
            if (!optionEl || optionEl.style.display === 'none') return;

            var addBtn = e.target.closest('.ymee-variant-dropdown__submit button');
            if (addBtn) {
              e.preventDefault();
              e.stopPropagation();
              syncVariant(optionEl, { userSelected: true });
              closeMenu();

              setTimeout(function () {
                submitProductForm();
              }, 0);
              return;
            }

            var actionBtn = e.target.closest('[data-action]');
            e.preventDefault();
            e.stopPropagation();

            syncVariant(optionEl, { userSelected: true });

            if (isMobileViewport() && sheetState) {
              updateSheetFooterState();
            }

            var action = actionBtn ? actionBtn.getAttribute('data-action') : null;

            if (action === 'buy') {
              closeMenu();
              submitProductForm();
              return;
            }

            if (action === 'notify') {
              closeMenu();
              var notifyBtn = sectionRoot.querySelector('[data-popup-open]');
              if (notifyBtn) notifyBtn.click();
              return;
            }

            if (!isMobileViewport()) {
              closeMenu();
            }
          },
          true
        );

        menu.addEventListener('mouseover', function (e) {
          if (isMobileViewport()) return;
          var optionEl = e.target.closest('.ymee-variant-dropdown__option');
          if (!optionEl || !menu.contains(optionEl)) return;
          if (optionEl.style.display === 'none') return;
          if (optionEl.classList.contains('is-oos')) return;
          if (e.relatedTarget && optionEl.contains(e.relatedTarget)) return;

          setSelectedVisual(optionEl);
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

              var variant = variantById[String(lastSyncedId)];
              var colorCode = getVariantColorCode(variant);
              applyGalleryFilter(sectionId, colorCode);
            }
          }

          var observer = new MutationObserver(onExternalVariantChange);
          observer.observe(sectionRoot, { childList: true, subtree: true, attributes: true, attributeFilter: ['value'] });
          sectionRoot.addEventListener('change', function (evt) {
            var target = evt && evt.target;
            if (!target || target.name !== 'id') return;
            if (target.getAttribute('form') !== productFormId) return;
            onExternalVariantChange();
          });
        }

        filterRowsByColor();
        updateColorPickerAvailability();
        var initial = getSelectedOptionEl();
        if (initial) {
          setSelectedVisual(initial);
          updatePlaceholder(initial, false);
        }
      });
  }

  function initColorPickers(scope) {
    (scope || document)
      .querySelectorAll('[data-ymee-color-picker]')
      .forEach(function (picker) {
        var sectionId = picker.getAttribute('data-section-id');
        if (!sectionId) return;

        var sectionRoot =
          document.querySelector('#MainProduct--' + cssEscape(sectionId)) ||
          picker.closest('[data-section-id="' + cssEscape(sectionId) + '"]') ||
          document;

        var hasDropdown = sectionRoot.querySelector('[data-ymee-variant-dropdown]');
        if (hasDropdown) return;

        // Set initial selected state for color picker items
        var checkedInput = picker.querySelector('[data-ymee-color-input]:checked');
        if (checkedInput) {
          picker.querySelectorAll('.ymee-color-picker__item').forEach(function (item) {
            var itemInput = item.querySelector('[data-ymee-color-input]');
            item.classList.toggle('is-selected', itemInput === checkedInput);
          });

          // Show/hide values based on selected value
          var selectedValue = checkedInput.value;
          picker.querySelectorAll('.ymee-color-picker__value').forEach(function (valueEl) {
            if (valueEl.textContent === selectedValue) {
              valueEl.removeAttribute('hidden');
            } else {
              valueEl.setAttribute('hidden', '');
            }
          });
        }

        var variantSelects = sectionRoot.querySelector('variant-selects[data-section="' + cssEscape(sectionId) + '"]');

        if (variantSelects) {
          var formHolder = variantSelects.closest('.product__block.product__form__holder');
          if (formHolder) {
            formHolder.style.position = 'absolute';
            formHolder.style.width = '1px';
            formHolder.style.height = '1px';
            formHolder.style.overflow = 'hidden';
            formHolder.style.clip = 'rect(0 0 0 0)';
            formHolder.style.clipPath = 'inset(50%)';
          }
        }
      });
  }

  /* ── Delegated color-picker change handler ──────────────────────────
   * Bound ONCE on document – survives any product-info DOM replacement.
   * Handles both dropdown-mode and standalone-mode color pickers.
   */
  document.addEventListener('change', function (e) {
    var input = e.target.closest('[data-ymee-color-input]');
    if (!input) return;

    var picker = input.closest('[data-ymee-color-picker]');
    if (!picker) return;

    var sectionId = picker.getAttribute('data-section-id');
    if (!sectionId) return;

    var optionPos = parseInt(picker.getAttribute('data-option-position'), 10);

    var sectionRoot =
      document.querySelector('#MainProduct--' + cssEscape(sectionId)) ||
      picker.closest('[data-section-id="' + cssEscape(sectionId) + '"]') ||
      document;

    // Gentle scroll to top on color click
    var startPosition = window.pageYOffset || window.scrollY || 0;
    var startTime = null;
    var duration = 300; // ms

    function easeInOutCubic(t) {
      return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    }

    function animateScroll(currentTime) {
      if (startTime === null) startTime = currentTime;
      var timeElapsed = currentTime - startTime;
      var run = easeInOutCubic(Math.min(timeElapsed / duration, 1));
      window.scrollTo(0, startPosition * (1 - run));
      if (timeElapsed < duration) {
        requestAnimationFrame(animateScroll);
      }
    }
    requestAnimationFrame(animateScroll);

    // Update selected state
    picker.querySelectorAll('.ymee-color-picker__item').forEach(function (item) {
      var itemInput = item.querySelector('[data-ymee-color-input]');
      item.classList.toggle('is-selected', itemInput === input);
    });

    // Show/hide values based on selected value
    var selectedValue = input.value;
    picker.querySelectorAll('.ymee-color-picker__value').forEach(function (valueEl) {
      if (valueEl.textContent === selectedValue) {
        valueEl.removeAttribute('hidden');
      } else {
        valueEl.setAttribute('hidden', '');
      }
    });

    var variantSelects =
      sectionRoot.querySelector('variant-selects[data-section="' + cssEscape(sectionId) + '"]') ||
      sectionRoot.querySelector('variant-selects');

    if (variantSelects && !isNaN(optionPos)) {
      var wrapper = variantSelects.querySelector(
        '.selector-wrapper[data-option-position="' + optionPos + '"]'
      );
      if (wrapper) {
        var radio = wrapper.querySelector(
          'input[type="radio"][value="' + cssEscape(input.value) + '"]'
        );
        if (radio && !radio.checked) {
          radio.checked = true;
          radio.dispatchEvent(new Event('change', { bubbles: true }));
        }
        var selectEl = wrapper.querySelector('select, [data-popout-input]');
        if (selectEl && selectEl.value !== input.value) {
          selectEl.value = input.value;
          selectEl.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
      return;
    }

    var productDataEl = sectionRoot.querySelector('[data-product-json]');
    var productData = null;
    try {
      if (productDataEl) productData = JSON.parse(productDataEl.textContent || '{}');
    } catch (ex) { /* no-op */ }

    if (!productData || !productData.variants) return;

    var colorOptIndex = isNaN(optionPos) ? -1 : optionPos - 1;
    var opts = {};
    sectionRoot.querySelectorAll('[data-ymee-color-picker]').forEach(function (p) {
      var pos = parseInt(p.getAttribute('data-option-position'), 10);
      var checked = p.querySelector('[data-ymee-color-input]:checked');
      if (checked && !isNaN(pos)) opts[pos - 1] = checked.value;
    });

    var matchedVariant = null;
    for (var i = 0; i < productData.variants.length; i++) {
      var v = productData.variants[i];
      var match = true;
      for (var k in opts) {
        if (v.options[parseInt(k, 10)] !== opts[k]) { match = false; break; }
      }
      if (match) { matchedVariant = v; break; }
    }

    if (matchedVariant) {
      var productFormId = 'product-form-' + sectionId;
      var variantIdInput = sectionRoot.querySelector('input[name="id"][form="' + cssEscape(productFormId) + '"]');
      if (variantIdInput && String(variantIdInput.value) !== String(matchedVariant.id)) {
        variantIdInput.value = matchedVariant.id;
        variantIdInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      var variantIdInForm = sectionRoot.querySelector('product-form input[name="id"].product-variant-id');
      if (variantIdInForm && String(variantIdInForm.value) !== String(matchedVariant.id)) {
        variantIdInForm.value = matchedVariant.id;
      }
      if (matchedVariant.featured_media && matchedVariant.featured_media.id) {
        var mediaId = sectionId + '-' + matchedVariant.featured_media.id;
        var productImagesEl = sectionRoot.querySelector('.product__images') || sectionRoot;
        productImagesEl.dispatchEvent(
          new CustomEvent('theme:media:select', { bubbles: true, detail: { id: mediaId } })
        );
      }
      document.dispatchEvent(
        new CustomEvent('theme:variant:change', { detail: { variant: matchedVariant } })
      );
    }
  }, true);

  /* ── Reinit for dropdown (toggle/menu/sheet handlers) ────────────── */
  var reinitQueued = false;
  function scheduleReinit() {
    if (reinitQueued) return;
    reinitQueued = true;
    requestAnimationFrame(function () {
      reinitQueued = false;
      init(document);
      initColorPickers(document);
    });
  }

  function observeProductInfo() {
    document.querySelectorAll('product-info').forEach(function (pi) {
      if (pi.dataset.ymeeObserved) return;
      pi.dataset.ymeeObserved = 'true';
      new MutationObserver(scheduleReinit).observe(pi, { childList: true, subtree: true });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      init(document);
      initColorPickers(document);
      observeProductInfo();
    });
  } else {
    init(document);
    initColorPickers(document);
    observeProductInfo();
  }

  document.addEventListener('shopify:section:load', function (e) {
    init(e.target);
    initColorPickers(e.target);
    observeProductInfo();
  });
})();
