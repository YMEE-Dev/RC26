(function () {
  "use strict";

  var MODES = {
    notify: {
      titleKey: "notify_title",
      subtitleKey: "notify_subtitle",
      submitKey: "submit_notify",
      showProduct: true,
      showInquireFields: false,
    },
    inquire: {
      titleKey: "inquire_title",
      subtitleKey: "inquire_subtitle",
      submitKey: "submit_inquire",
      showProduct: false,
      showInquireFields: true,
    },
    available_soon: {
      titleKey: "available_soon_title",
      subtitleKey: "available_soon_subtitle",
      submitKey: "submit_available_soon",
      showProduct: true,
      showInquireFields: false,
    },
  };

  // Translations are injected from the Liquid template via a global object
  var translations = window.__bisDrawerTranslations || {};

  function getTranslation(key) {
    return translations[key] || key;
  }

  function initBisDrawer() {
    var sideDrawer = document.querySelector("#side-drawer-bis-form");
    if (!sideDrawer) return;

    var drawer = sideDrawer.querySelector("[data-bis-drawer]");
    if (!drawer) return;

    var formView = drawer.querySelector("[data-bis-form-view]");
    var successView = drawer.querySelector("[data-bis-success-view]");
    var titleEl = drawer.querySelector("[data-bis-title]");
    var subtitleEl = drawer.querySelector("[data-bis-subtitle]");
    var productCard = drawer.querySelector("[data-bis-product-card]");
    var productImageEl = drawer.querySelector("[data-bis-product-image]");
    var productTitleEl = drawer.querySelector("[data-bis-product-title]");
    var variantTitleEl = drawer.querySelector("[data-bis-variant-title]");
    var productTitleInput = drawer.querySelector("[data-bis-product-title-input]");
    var form = drawer.querySelector("[data-bis-form]");
    var formTypeInput = drawer.querySelector("[data-bis-form-type]");
    var variantIdInput = drawer.querySelector("[data-bis-variant-id]");
    var productIdInput = drawer.querySelector("[data-bis-product-id]");
    var submitText = drawer.querySelector("[data-bis-submit-text]");
    var submitBtn = drawer.querySelector("[data-bis-submit]");
    var loader = drawer.querySelector("[data-bis-loader]");
    var errorEl = drawer.querySelector("[data-bis-error]");
    var inquireFields = drawer.querySelectorAll("[data-bis-inquire-fields]");
    var requiredLabel = drawer.querySelector("[data-bis-required-label]");
    var successTitle = drawer.querySelector("[data-bis-success-title]");
    var successSubtitle = drawer.querySelector("[data-bis-success-subtitle]");

    var currentMode = "notify";

    // Resolve product data from the page's product JSON
    function getProductData() {
      var sectionRoot = document.querySelector('[id^="MainProduct--"]');
      if (!sectionRoot) return null;
      var jsonEl = sectionRoot.querySelector("[data-product-json]");
      if (!jsonEl) return null;
      try {
        return JSON.parse(jsonEl.textContent);
      } catch (e) {
        return null;
      }
    }

    function updateProductCard(variantId) {
      var product = getProductData();
      if (!product) return;

      // Update product title
      if (productTitleEl) productTitleEl.textContent = product.title || "";
      if (productTitleInput) productTitleInput.value = product.title || "";

      // Update product image — use variant image if available, else featured
      var variant = null;
      if (variantId && product.variants) {
        variant = product.variants.find(function (v) {
          return String(v.id) === String(variantId);
        });
      }

      var imageUrl = null;
      if (variant && variant.featured_image && variant.featured_image.src) {
        imageUrl = variant.featured_image.src;
      } else if (product.featured_image) {
        imageUrl = typeof product.featured_image === "string" ? product.featured_image : product.featured_image.src;
      } else if (product.images && product.images.length > 0) {
        imageUrl = typeof product.images[0] === "string" ? product.images[0] : product.images[0].src;
      }

      if (productImageEl && imageUrl) {
        // Ensure we get a reasonable size
        var sizedUrl = imageUrl.replace(/(\.(jpg|jpeg|png|webp|gif))/, "_600x$1");
        // If Shopify CDN URL, use width param instead
        if (imageUrl.includes("cdn.shopify.com")) {
          sizedUrl = imageUrl.split("?")[0] + "?width=600";
        }
        productImageEl.innerHTML =
          '<img src="' + sizedUrl + '" alt="' + (product.title || "").replace(/"/g, "&quot;") + '" loading="lazy">';
      }

      // Update variant title
      if (variantTitleEl) {
        var variantName = "";
        if (variant && variant.title && variant.title !== "Default Title") {
          variantName = variant.title;
        }
        variantTitleEl.textContent = variantName;
      }
    }

    function setMode(mode, variantId, productId) {
      var config = MODES[mode] || MODES.notify;
      currentMode = mode;

      // Update form type
      if (formTypeInput) formTypeInput.value = mode;

      // Update variant/product IDs
      if (variantIdInput && variantId) variantIdInput.value = variantId;
      if (productIdInput && productId) productIdInput.value = productId;

      // Update title & subtitle
      if (titleEl) titleEl.textContent = getTranslation(config.titleKey);
      if (subtitleEl) {
        subtitleEl.textContent = getTranslation(config.subtitleKey);
        subtitleEl.style.display = "";
      }

      // Update product card with dynamic data
      updateProductCard(variantId);

      // Show/hide product card
      if (productCard) {
        productCard.style.display = config.showProduct ? "" : "none";
      }

      // Show/hide inquire-only fields
      inquireFields.forEach(function (el) {
        el.style.display = config.showInquireFields ? "" : "none";
        // Toggle required on inquire inputs
        var inputs = el.querySelectorAll("input, textarea");
        inputs.forEach(function (input) {
          if (input.name === "privacy") {
            input.required = config.showInquireFields;
          } else if (input.type !== "hidden") {
            input.required = config.showInquireFields;
          }
        });
      });

      // Hide duplicate "required" label above email when inquire section already has one
      if (requiredLabel) {
        requiredLabel.style.display = config.showInquireFields ? "none" : "";
      }

      // Update submit button text
      if (submitText) submitText.textContent = getTranslation(config.submitKey);

      // Reset states
      resetForm();
      showFormView();
    }

    function resetForm() {
      if (form) form.reset();
      if (errorEl) {
        errorEl.style.display = "none";
        errorEl.textContent = "";
      }
      if (submitBtn) submitBtn.disabled = false;
      if (loader) loader.style.display = "none";
      if (submitText) submitText.style.display = "";
    }

    function showFormView() {
      if (formView) formView.style.display = "";
      if (successView) successView.style.display = "none";
    }

    function showSuccessView() {
      if (formView) formView.style.display = "none";
      if (successView) successView.style.display = "";
      if (successTitle) successTitle.textContent = getTranslation("success_title");
      if (successSubtitle) successSubtitle.textContent = getTranslation("success_subtitle");
    }

    function openDrawer(mode, variantId, productId) {
      // Always open our custom side drawer for all modes
      // AMP integration happens on form submit (if AMP API is available)
      setMode(mode, variantId, productId);
      sideDrawer.dispatchEvent(new CustomEvent("theme:drawer:open", { bubbles: true }));
    }

    // Reset form view when drawer opens (in case it was left on success)
    sideDrawer.addEventListener("theme:drawer:open", function () {
      // Don't reset if we just set the mode
    });

    // Form submission
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();

        var email = drawer.querySelector("[data-bis-email]");
        if (!email || !email.value) {
          if (errorEl) {
            errorEl.textContent = "Please enter your email address.";
            errorEl.style.display = "";
          }
          return;
        }

        // For inquire mode, check privacy
        if (currentMode === "inquire") {
          var privacy = drawer.querySelector("[data-bis-privacy]");
          if (privacy && !privacy.checked) {
            if (errorEl) {
              errorEl.textContent = "Please accept the Privacy Policy.";
              errorEl.style.display = "";
            }
            return;
          }
        }

        // Show loader
        if (submitBtn) submitBtn.disabled = true;
        if (submitText) submitText.style.display = "none";
        if (loader) loader.style.display = "";
        if (errorEl) errorEl.style.display = "none";

        // Collect form data
        var formData = {
          email: email.value,
          variant_id: variantIdInput ? variantIdInput.value : "",
          product_id: productIdInput ? productIdInput.value : "",
          form_type: currentMode,
        };

        if (currentMode === "inquire") {
          var firstName = drawer.querySelector('[name="first_name"]');
          var lastName = drawer.querySelector('[name="last_name"]');
          var message = drawer.querySelector('[name="message"]');
          formData.first_name = firstName ? firstName.value : "";
          formData.last_name = lastName ? lastName.value : "";
          formData.message = message ? message.value : "";
        }

        // Try AMP integration for notify/available_soon modes
        // Re-check at submit time since AMP may load asynchronously
        var ampSuccess = triggerAmpRegistration(formData);

        if (!ampSuccess) {
          // Fallback: submit via Shopify contact form
          console.info("[BIS Drawer] AMP not available for mode '" + currentMode + "', using contact form fallback");
          submitViaContactForm(formData);
        }
      });
    }

    function isAmpAvailable() {
      return (
        (window.BIS && typeof window.BIS.create === "function") ||
        (window.BISPopup && typeof window.BISPopup.create === "function")
      );
    }

    function triggerAmpRegistration(formData) {
      // For inquire mode, AMP doesn't manage these — always use contact form
      if (formData.form_type === "inquire") {
        return false;
      }

      // For notify / available_soon — use AMP BIS if available
      if (window.BIS && typeof window.BIS.create === "function") {
        window.BIS.create(formData.email, formData.variant_id, formData.product_id, {
          callback: function (data) {
            if (data && data.status === "OK") {
              showSuccessView();
            } else {
              if (errorEl) {
                errorEl.textContent = (data && data.message) || "Something went wrong. Please try again.";
                errorEl.style.display = "";
              }
              if (submitBtn) submitBtn.disabled = false;
              if (submitText) submitText.style.display = "";
              if (loader) loader.style.display = "none";
            }
          },
        });
        return true;
      }

      if (window.BISPopup && typeof window.BISPopup.create === "function") {
        window.BISPopup.create(formData.email, formData.variant_id, {
          callback: function () {
            showSuccessView();
          },
        });
        return true;
      }

      return false;
    }

    function submitViaContactForm(formData) {
      // Fallback: POST to Shopify contact form endpoint
      var body = new FormData();
      body.append("form_type", "contact");
      body.append("utf8", "\u2713");
      body.append("contact[email]", formData.email);
      body.append(
        "contact[body]",
        "BIS Request (" +
          formData.form_type +
          ")\n" +
          "Product ID: " +
          formData.product_id +
          "\n" +
          "Variant ID: " +
          formData.variant_id +
          (formData.first_name ? "\nName: " + formData.first_name + " " + (formData.last_name || "") : "") +
          (formData.message ? "\nMessage: " + formData.message : "")
      );

      fetch("/contact", {
        method: "POST",
        body: body,
      })
        .then(function () {
          showSuccessView();
        })
        .catch(function () {
          if (errorEl) {
            errorEl.textContent = "Something went wrong. Please try again.";
            errorEl.style.display = "";
          }
          if (submitBtn) submitBtn.disabled = false;
          if (submitText) submitText.style.display = "";
          if (loader) loader.style.display = "none";
        });
    }

    // Expose global function for triggers
    window.openBisDrawer = openDrawer;

    // Listen for trigger clicks
    document.addEventListener("click", function (e) {
      var trigger = e.target.closest("[data-bis-drawer-open]");
      if (!trigger) return;

      e.preventDefault();
      var mode = trigger.getAttribute("data-bis-drawer-open") || "notify";
      var variantId = trigger.getAttribute("data-variant-id") || "";
      var productId = trigger.getAttribute("data-product-id") || "";
      openDrawer(mode, variantId, productId);
    });

    // Auto-open from URL parameter (e.g. ?bis_action=inquire from PLP)
    try {
      var params = new URLSearchParams(window.location.search);
      var bisAction = params.get("bis_action");
      if (bisAction && MODES[bisAction]) {
        var vid = variantIdInput ? variantIdInput.value : "";
        var pidVal = productIdInput ? productIdInput.value : "";
        setTimeout(function () {
          openDrawer(bisAction, vid, pidVal);
        }, 500);
        // Clean up URL
        if (window.history && window.history.replaceState) {
          params.delete("bis_action");
          var cleanUrl = window.location.pathname + (params.toString() ? "?" + params.toString() : "");
          window.history.replaceState({}, "", cleanUrl);
        }
      }
    } catch (e) {
      // URL parsing not supported
    }

    // AMP availability check — log on init and re-check after a delay
    // (AMP script may load asynchronously after DOMContentLoaded)
    function logAmpStatus() {
      var ampReady = isAmpAvailable();
      console.info(
        "[BIS Drawer] AMP Back in Stock API " + (ampReady ? "detected ✓" : "not detected — using contact form fallback")
      );
    }
    logAmpStatus();
    setTimeout(logAmpStatus, 3000);
  }

  // Init on DOMContentLoaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initBisDrawer);
  } else {
    initBisDrawer();
  }
})();
