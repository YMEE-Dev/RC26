(function () {
  "use strict";

  var MODES = {
    notify: {
      titleKey: "notify_title",
      subtitleKey: "notify_subtitle",
      submitKey: "submit_notify",
      successTitleKey: "success_notify_title",
      successSubtitleKey: "success_notify_subtitle",
      showProduct: true,
      showInquireFields: false,
      useBisSubscription: true,
    },
    inquire: {
      titleKey: "inquire_title",
      subtitleKey: "inquire_subtitle",
      submitKey: "submit_inquire",
      successTitleKey: "success_inquire_title",
      successSubtitleKey: "success_inquire_subtitle",
      showProduct: false,
      showInquireFields: true,
      klaviyoMetric: "Product Inquiry",
    },
    available_soon: {
      titleKey: "available_soon_title",
      subtitleKey: "available_soon_subtitle",
      submitKey: "submit_available_soon",
      successTitleKey: "success_available_soon_title",
      successSubtitleKey: "success_available_soon_subtitle",
      showProduct: true,
      showInquireFields: false,
      klaviyoMetric: "Available Soon",
    },
  };

  // Translations are injected from the Liquid template via a global object
  var translations = window.__bisDrawerTranslations || {};
  var KLAVIYO_API_KEY = window.__klaviyoPublicKey || "";

  function decodeHtml(str) {
    if (typeof str !== "string") {
      return str || "";
    }

    var decoded = str;
    var previous = null;
    var txt = document.createElement("textarea");

    while (decoded !== previous) {
      previous = decoded;
      txt.innerHTML = decoded;
      decoded = txt.value;
    }

    return decoded;
  }

  function getTranslation(key) {
    return decodeHtml(translations[key] || key);
  }

  function submitBisSubscription(email, variantId) {
    if (!KLAVIYO_API_KEY) {
      console.error("[BIS Drawer] Klaviyo public API key is not configured.");
      return Promise.reject(new Error("Missing Klaviyo API key"));
    }

    var payload = {
      data: {
        type: "back-in-stock-subscription",
        attributes: {
          profile: {
            data: {
              type: "profile",
              attributes: {
                email: email,
              },
            },
          },
          channels: ["EMAIL"],
        },
        relationships: {
          variant: {
            data: {
              type: "catalog-variant",
              id: "$shopify:::$default:::" + variantId,
            },
          },
        },
      },
    };

    var url =
      "https://a.klaviyo.com/client/back-in-stock-subscriptions/?company_id=" + encodeURIComponent(KLAVIYO_API_KEY);

    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        revision: "2024-10-15",
      },
      body: JSON.stringify(payload),
    }).then(function (response) {
      if (response.ok || response.status === 202) {
        return response;
      }
      throw new Error("Klaviyo BIS API returned status " + response.status);
    });
  }

  function submitToKlaviyo(metricName, email, properties) {
    if (!KLAVIYO_API_KEY) {
      console.error("[BIS Drawer] Klaviyo public API key is not configured.");
      return Promise.reject(new Error("Missing Klaviyo API key"));
    }

    var payload = {
      data: {
        type: "event",
        attributes: {
          profile: {
            data: {
              type: "profile",
              attributes: {
                email: email,
              },
            },
          },
          metric: {
            data: {
              type: "metric",
              attributes: {
                name: metricName,
              },
            },
          },
          properties: properties,
          time: new Date().toISOString(),
        },
      },
    };

    var url = "https://a.klaviyo.com/client/events/?company_id=" + encodeURIComponent(KLAVIYO_API_KEY);

    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        revision: "2024-10-15",
      },
      body: JSON.stringify(payload),
    }).then(function (response) {
      if (response.ok || response.status === 202) {
        return response;
      }
      throw new Error("Klaviyo API returned status " + response.status);
    });
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

      // Stamp mode as class on root for CSS targeting
      Object.keys(MODES).forEach(function (m) {
        drawer.classList.remove("bis-mode--" + m);
      });
      drawer.classList.add("bis-mode--" + mode);

      // Update form type
      if (formTypeInput) formTypeInput.value = mode;

      // Update variant/product IDs
      if (variantIdInput && variantId) variantIdInput.value = variantId;
      if (productIdInput && productId) productIdInput.value = productId;

      // Update title & subtitle
      if (titleEl) titleEl.textContent = getTranslation(config.titleKey);
      if (subtitleEl) {
        subtitleEl.innerHTML = getTranslation(config.subtitleKey);
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

    function setSubmitting(isSubmitting) {
      if (!submitBtn) return;
      submitBtn.disabled = isSubmitting;
      submitBtn.classList.toggle("is-loading", isSubmitting);
    }

    function resetForm() {
      if (form) form.reset();
      if (errorEl) {
        errorEl.style.display = "none";
        errorEl.textContent = "";
      }
      setSubmitting(false);
    }

    function showFormView() {
      if (formView) formView.style.display = "";
      if (successView) successView.style.display = "none";
    }

    function showSuccessView() {
      var config = MODES[currentMode] || MODES.notify;
      if (formView) formView.style.display = "none";
      if (successView) successView.style.display = "";
      if (successTitle) successTitle.textContent = getTranslation(config.successTitleKey);
      if (successSubtitle) successSubtitle.textContent = getTranslation(config.successSubtitleKey);
    }

    function openDrawer(mode, variantId, productId) {
      setMode(mode, variantId, productId);
      sideDrawer.dispatchEvent(new CustomEvent("theme:drawer:open", { bubbles: true }));
    }

    // Form submission via Klaviyo
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
        setSubmitting(true);
        if (errorEl) errorEl.style.display = "none";

        var config = MODES[currentMode] || MODES.notify;
        var product = getProductData();
        var productTitle = productTitleInput ? productTitleInput.value : "";
        var variantId = variantIdInput ? variantIdInput.value : "";
        var productId = productIdInput ? productIdInput.value : "";

        // Build Klaviyo event properties
        var properties = {
          form_type: currentMode,
          product_title: productTitle,
          product_id: productId,
          variant_id: variantId,
          product_url: window.location.href,
        };

        // Add variant info if available
        if (product && product.variants) {
          var variant = product.variants.find(function (v) {
            return String(v.id) === String(variantId);
          });
          if (variant) {
            properties.variant_title = variant.title || "";
            properties.variant_sku = variant.sku || "";
            if (variant.price) {
              properties.variant_price = (variant.price / 100).toFixed(2);
            }
          }
        }

        // Add product image
        if (product) {
          var imgSrc = null;
          if (product.featured_image) {
            imgSrc = typeof product.featured_image === "string" ? product.featured_image : product.featured_image.src;
          }
          if (imgSrc) {
            properties.product_image = imgSrc.includes("cdn.shopify.com")
              ? imgSrc.split("?")[0] + "?width=600"
              : imgSrc;
          }
        }

        // Add inquire-specific fields
        if (currentMode === "inquire") {
          var firstName = drawer.querySelector('[name="first_name"]');
          var lastName = drawer.querySelector('[name="last_name"]');
          var message = drawer.querySelector('[name="message"]');
          properties.first_name = firstName ? firstName.value : "";
          properties.last_name = lastName ? lastName.value : "";
          properties.message = message ? message.value : "";
        }

        var submitPromise;
        if (config.useBisSubscription) {
          // Use Klaviyo's native Back in Stock Subscription API for notify mode
          submitPromise = submitBisSubscription(email.value, variantId);
        } else {
          submitPromise = submitToKlaviyo(config.klaviyoMetric, email.value, properties);
        }

        submitPromise
          .then(function () {
            showSuccessView();
          })
          .catch(function (err) {
            console.error("[BIS Drawer] Klaviyo submission error:", err);
            if (errorEl) {
              errorEl.textContent = "Something went wrong. Please try again.";
              errorEl.style.display = "";
            }
            setSubmitting(false);
          });
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

    console.info("[BIS Drawer] Klaviyo integration active" + (KLAVIYO_API_KEY ? " ✓" : " — API key missing!"));
  }

  // Init on DOMContentLoaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initBisDrawer);
  } else {
    initBisDrawer();
  }
})();
