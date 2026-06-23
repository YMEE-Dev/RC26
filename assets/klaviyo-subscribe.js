/**
 * klaviyo-subscribe.js
 *
 * Intercepts footer newsletter form submissions and sends data to Klaviyo
 * Client API, then shows the existing thank-you state without page redirect.
 */
(function () {
  "use strict";

  var API_REVISION = "2024-10-15";
  var DOB_SELECTOR = "input[data-footer-newsletter-dob]";

  function syncBirthDatePlaceholder(input) {
    if (!(input instanceof HTMLInputElement)) return;
    var wrapper = input.closest(".footer-newsletter-form__dob-field");
    if (!wrapper) return;
    wrapper.classList.toggle("has-value", Boolean(input.value));
  }

  function initBirthDateInputs() {
    var inputs = document.querySelectorAll(DOB_SELECTOR);
    inputs.forEach(function (input) {
      syncBirthDatePlaceholder(input);
    });
  }

  function activateBirthDateInput(input) {
    if (!(input instanceof HTMLInputElement)) return;
    if (typeof input.showPicker === "function") {
      try {
        input.showPicker();
      } catch (error) {
        // no-op: some browsers gate showPicker behind user gestures
        // (mobile opens the native picker on tap regardless)
      }
    }
  }

  function initConsentErrors() {
    var forms = document.querySelectorAll("[data-footer-newsletter-form]");
    forms.forEach(function (form) {
      hideConsentError(form);
    });
  }

  document.addEventListener("submit", function (event) {
    var form = event.target;
    if (!form.hasAttribute("data-footer-newsletter-form")) return;

    event.preventDefault();
    hideConsentError(form);

    var companyId = (form.getAttribute("data-klaviyo-company-id") || "").trim();
    var listId = (form.getAttribute("data-klaviyo-list-id") || "").trim();
    var source = (form.getAttribute("data-klaviyo-source") || "").trim();

    if (!companyId || !listId) {
      showError(form, "Newsletter is temporarily unavailable. Please try again later.");
      return;
    }

    var formData = new FormData(form);
    var hasConsent = !!getFieldValue(formData, "consent");

    var profile = {
      email: getFieldValue(formData, "email"),
      first_name: getFieldValue(formData, "first_name"),
      last_name: getFieldValue(formData, "last_name"),
      properties: {
        language: getFieldValue(formData, "language"),
        date_of_birth: getFieldValue(formData, "date_of_birth")
      }
    };

    if (!profile.email) {
      showError(form, "Please enter a valid email address.");
      return;
    }

    if (!hasConsent) {
      showConsentError(form);
      return;
    }

    if (source) {
      profile.properties.source = source;
    }

    var payload = {
      data: {
        type: "subscription",
        attributes: {
          custom_source: source || "Footer Newsletter",
          profile: {
            data: {
              type: "profile",
              attributes: profile
            }
          }
        },
        relationships: {
          list: {
            data: {
              type: "list",
              id: listId
            }
          }
        }
      }
    };

    var submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    var controller = new AbortController();
    var timeoutId = setTimeout(function () {
      controller.abort();
    }, 8000);

    fetch("https://a.klaviyo.com/client/subscriptions/?company_id=" + encodeURIComponent(companyId), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        revision: API_REVISION
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    })
      .then(function (response) {
        clearTimeout(timeoutId);
        if (response.ok || response.status === 202) {
          showSuccess(form);
          return null;
        }
        return response.json().catch(function () {
          return null;
        }).then(function (body) {
          throw new Error(extractError(body) || "Something went wrong. Please try again.");
        });
      })
      .catch(function (error) {
        clearTimeout(timeoutId);
        if (error.name === "AbortError") {
          showError(form, "Request timed out. Please try again.");
        } else {
          showError(form, error.message || "Something went wrong. Please try again.");
        }
      })
      .finally(function () {
        if (submitBtn) submitBtn.disabled = false;
      });
  });

  function getFieldValue(formData, fieldName) {
    var normalizedName = String(fieldName || "").toLowerCase();
    var entries = Array.from(formData.entries());
    for (var i = 0; i < entries.length; i += 1) {
      var name = String(entries[i][0] || "").toLowerCase();
      if (name === normalizedName) {
        return String(entries[i][1] || "").trim();
      }
    }
    return "";
  }

  function extractError(body) {
    if (!body || !Array.isArray(body.errors) || !body.errors.length) return "";
    var detail = body.errors[0] && body.errors[0].detail;
    return typeof detail === "string" ? detail : "";
  }

  function showSuccess(form) {
    var wrapper = form.closest("[data-footer-newsletter-wrapper]");
    if (!wrapper) return;
    wrapper.classList.add("is-success");

    var successEl = wrapper.querySelector("[data-footer-newsletter-success]");
    if (successEl) {
      successEl.removeAttribute("aria-hidden");
      successEl.removeAttribute("hidden");
    }
  }

  function showError(form, message) {
    var errorEl = form.querySelector("[data-footer-newsletter-error]");
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.removeAttribute("hidden");
    }
  }

  function showConsentError(form) {
    var consentErrorEl = form.querySelector("[data-footer-newsletter-consent-error]");
    if (consentErrorEl) {
      consentErrorEl.removeAttribute("hidden");
    }
  }

  function hideConsentError(form) {
    var consentErrorEl = form.querySelector("[data-footer-newsletter-consent-error]");
    if (consentErrorEl) {
      consentErrorEl.setAttribute("hidden", "hidden");
    }
  }

  document.addEventListener("change", function (event) {
    var target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.name !== "consent") return;
    if (!target.form || !target.form.hasAttribute("data-footer-newsletter-form")) return;

    if (target.checked) {
      hideConsentError(target.form);
    }
  });

  document.addEventListener("invalid", function (event) {
    var target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.name !== "consent") return;
    if (!target.form || !target.form.hasAttribute("data-footer-newsletter-form")) return;

    showConsentError(target.form);
  }, true);

  document.addEventListener("click", function (event) {
    var target = event.target;
    var trigger = target instanceof Element ? target.closest("[data-footer-newsletter-dob-trigger]") : null;
    if (trigger) {
      var wrapper = trigger.closest(".footer-newsletter-form__dob-field");
      var dobInput = wrapper ? wrapper.querySelector(DOB_SELECTOR) : null;
      if (dobInput instanceof HTMLInputElement) {
        activateBirthDateInput(dobInput);
      }
      return;
    }

    if (!(target instanceof HTMLInputElement)) return;
    if (!target.matches(DOB_SELECTOR)) return;

    activateBirthDateInput(target);
  });

  document.addEventListener("change", function (event) {
    var target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (!target.matches(DOB_SELECTOR)) return;

    syncBirthDatePlaceholder(target);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      initConsentErrors();
      initBirthDateInputs();
    });
  } else {
    initConsentErrors();
    initBirthDateInputs();
  }
})();
