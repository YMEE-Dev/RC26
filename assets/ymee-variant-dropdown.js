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
    footerAddBtn.innerHTML = '<span>Add to bag</span>';

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
    var productImagesEl = document.querySelector('#MainProduct--' + cssEscape(sectionId) + ' product-images, #MainProduct--' + cssEscape(sectionId) + ' .product__images');
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

    var activeMediaId = productImagesEl.getAttribute('data-active-media') || '';
    if (visibleMediaIds.length && activeMediaId && visibleMediaIds.indexOf(activeMediaId) === -1) {
      productImagesEl.dispatchEvent(
        new CustomEvent('theme:media:select', {
          detail: { id: visibleMediaIds[0] },
        })
      );
    }

    productImagesEl.querySelectorAll('.pdp-embla').forEach(function (emblaRoot) {
      if (emblaRoot._emblaInstance && typeof emblaRoot._emblaInstance.reInit === 'function') {
        try { emblaRoot._emblaInstance.reInit(); } catch (e) { /* no-op */ }
      }
    });
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
          if (sizeVal) placeholderEl.textContent = (window.ymeeSizePrefixText || 'Size: ') + sizeVal;
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
            menu.hidden = true;
          }
          toggle.setAttribute('aria-expanded', 'false');
        }

        function openSheet() {
          filterRowsByColor();
          sheetState = createSheet(sectionId, formEl || sectionRoot);
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
                try {
                  if (formEl && typeof formEl.requestSubmit === 'function') {
                    formEl.requestSubmit();
                    return;
                  }
                } catch (err) { /* no-op */ }
                try {
                  var realSubmit = formEl
                    ? formEl.querySelector('button[type="submit"], input[type="submit"]')
                    : null;
                  if (realSubmit && typeof realSubmit.click === 'function') realSubmit.click();
                } catch (err2) { /* no-op */ }
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
                try {
                  if (formEl && typeof formEl.requestSubmit === 'function') {
                    formEl.requestSubmit();
                    return;
                  }
                } catch (err) { /* no-op */ }
                try {
                  var realSubmit = formEl
                    ? formEl.querySelector('button[type="submit"], input[type="submit"]')
                    : null;
                  if (realSubmit && typeof realSubmit.click === 'function') realSubmit.click();
                } catch (err2) { /* no-op */ }
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
              if (formEl && typeof formEl.requestSubmit === 'function') {
                formEl.requestSubmit();
              }
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

          syncVariant(optionEl);
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
