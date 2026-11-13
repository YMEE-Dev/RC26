/**
 * klaviyo-subscribe.js
 *
 * Intercepts footer newsletter form submissions and sends data to Klaviyo
 * Client API, then shows the existing thank-you state without page redirect.
 */
(function () {
  "use strict";

  // Every form render adds its own <script>; a second copy would POST each signup twice.
  if (window.rcKlaviyoSubscribeLoaded) return;
  window.rcKlaviyoSubscribeLoaded = true;

  var API_REVISION = "2024-10-15";
  var DOB_SELECTOR = "input[data-footer-newsletter-dob]";
  var CONSENT_FORM_SELECTOR = "[data-footer-newsletter-form], [data-gift-guide-subscribe]";
  var DEFAULT_ERROR = "Something went wrong. Please try again.";

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
    var forms = document.querySelectorAll(CONSENT_FORM_SELECTOR);
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

    postToKlaviyo("subscriptions", companyId, payload)
      .then(function () {
        identifyInKlaviyo(profile.email);
        showSuccess(form);
      })
      .catch(function (error) {
        showError(form, error.message || DEFAULT_ERROR);
      })
      .finally(function () {
        if (submitBtn) submitBtn.disabled = false;
      });
  });

  /* Gift guide, step 1: subscribe, then send the event that triggers the guide flow.
   * Re-subscribing someone already on the list fires no "added to list" trigger, hence
   * the event. No custom_source: Klaviyo overwrites $source on every subscription, so
   * existing subscribers would lose theirs; the source rides on the event instead.
   * The event also carries the language, so the flow can pick the IT or EN email. */
  document.addEventListener("submit", function (event) {
    var form = event.target;
    if (!form.hasAttribute("data-gift-guide-subscribe")) return;

    event.preventDefault();
    hideConsentError(form);
    hideError(form);

    var wrapper = form.closest("[data-gift-guide-form]");
    var config = readConfig(wrapper);
    var formData = new FormData(form);
    var email = getFieldValue(formData, "email");
    var language = getFieldValue(formData, "language");

    if (!config.companyId || !config.listId) {
      showError(form, "Newsletter is temporarily unavailable. Please try again later.");
      return;
    }
    if (!email) {
      showError(form, "Please enter a valid email address.");
      return;
    }
    if (!getFieldValue(formData, "consent")) {
      showConsentError(form);
      return;
    }

    var subscription = {
      data: {
        type: "subscription",
        attributes: {
          profile: {
            data: {
              type: "profile",
              attributes: { email: email, properties: { gift_guide_2026: true, language: language } }
            }
          }
        },
        relationships: { list: { data: { type: "list", id: config.listId } } }
      }
    };

    var submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    postToKlaviyo("subscriptions", config.companyId, subscription)
      .then(function () {
        identifyInKlaviyo(email);
        if (!config.eventName) return null;
        return postToKlaviyo("events", config.companyId, {
          data: {
            type: "event",
            attributes: {
              properties: { source: config.source, language: language },
              metric: { data: { type: "metric", attributes: { name: config.eventName } } },
              profile: { data: { type: "profile", attributes: { email: email } } }
            }
          }
        });
      })
      .then(function () {
        wrapper.setAttribute("data-email", email);
        showStep(wrapper, 2);
      })
      .catch(function (error) {
        showError(form, error.message || DEFAULT_ERROR);
      })
      .finally(function () {
        if (submitBtn) submitBtn.disabled = false;
      });
  });

  /* Gift guide, step 2: optional details. Only filled fields are sent, so a blank field
   * never clears existing data. No new subscription and no new event. */
  document.addEventListener("submit", function (event) {
    var form = event.target;
    if (!form.hasAttribute("data-gift-guide-profile")) return;

    event.preventDefault();
    hideError(form);

    var wrapper = form.closest("[data-gift-guide-form]");
    var config = readConfig(wrapper);
    var formData = new FormData(form);
    var attributes = { email: wrapper.getAttribute("data-email") || "" };
    var firstName = getFieldValue(formData, "first_name");
    var lastName = getFieldValue(formData, "last_name");
    var birthDate = getFieldValue(formData, "date_of_birth");

    if (firstName) attributes.first_name = firstName;
    if (lastName) attributes.last_name = lastName;
    if (birthDate) attributes.properties = { date_of_birth: birthDate };

    if (!attributes.email || (!firstName && !lastName && !birthDate)) {
      showStep(wrapper, 3);
      return;
    }

    var submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    postToKlaviyo("profiles", config.companyId, { data: { type: "profile", attributes: attributes } })
      .then(function () {
        showStep(wrapper, 3);
      })
      .catch(function (error) {
        showError(form, error.message || DEFAULT_ERROR);
      })
      .finally(function () {
        if (submitBtn) submitBtn.disabled = false;
      });
  });

  function readConfig(wrapper) {
    var read = function (name) {
      return ((wrapper && wrapper.getAttribute(name)) || "").trim();
    };
    return {
      companyId: read("data-klaviyo-company-id"),
      listId: read("data-klaviyo-list-id"),
      source: read("data-klaviyo-source"),
      eventName: read("data-klaviyo-event")
    };
  }

  function showStep(wrapper, step) {
    if (!wrapper) return;
    var target = null;
    wrapper.querySelectorAll("[data-gift-guide-step]").forEach(function (el) {
      var isTarget = el.getAttribute("data-gift-guide-step") === String(step);
      el.hidden = !isTarget;
      if (isTarget) target = el;
    });

    var scroller = wrapper.closest("[data-scroll-lock-scrollable]");
    if (scroller) scroller.scrollTop = 0;

    var heading = target && target.querySelector("[data-gift-guide-step-heading]");
    if (heading) heading.focus({ preventScroll: true });
  }

  /* Resolves on any 2xx (subscriptions/events answer 202); rejects with a user-facing message. */
  function postToKlaviyo(endpoint, companyId, body) {
    var controller = new AbortController();
    var timeoutId = setTimeout(function () {
      controller.abort();
    }, 8000);

    return fetch("https://a.klaviyo.com/client/" + endpoint + "/?company_id=" + encodeURIComponent(companyId), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        revision: API_REVISION
      },
      body: JSON.stringify(body),
      signal: controller.signal
    })
      .then(function (response) {
        if (response.ok) return null;
        return response.json().catch(function () {
          return null;
        }).then(function (responseBody) {
          throw new Error(extractError(responseBody) || DEFAULT_ERROR);
        });
      }, function (error) {
        throw new Error(error.name === "AbortError" ? "Request timed out. Please try again." : error.message);
      })
      .finally(function () {
        clearTimeout(timeoutId);
      });
  }

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

  /* Server-side subscribe doesn't tie the browser to the profile, so identify
   * explicitly; _klOnsite queues it if klaviyo.js hasn't initialised yet. */
  function identifyInKlaviyo(email) {
    if (!email) return;
    try {
      if (window.klaviyo && typeof window.klaviyo.identify === "function") {
        Promise.resolve(window.klaviyo.identify({ email: email })).catch(function () {});
        return;
      }
      window._klOnsite = window._klOnsite || [];
      window._klOnsite.push(["identify", { email: email }]);
    } catch (error) {
      // identification must never break an already-successful subscribe
    }
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

  function hideError(form) {
    var errorEl = form.querySelector("[data-footer-newsletter-error]");
    if (errorEl) errorEl.setAttribute("hidden", "hidden");
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
    if (!target.form || !target.form.matches(CONSENT_FORM_SELECTOR)) return;

    if (target.checked) {
      hideConsentError(target.form);
    }
  });

  document.addEventListener("invalid", function (event) {
    var target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.name !== "consent") return;
    if (!target.form || !target.form.matches(CONSENT_FORM_SELECTOR)) return;

    showConsentError(target.form);
  }, true);

  /* Only the calendar icon opens the picker: opening it on a click in the field
   * swallowed keystrokes, so a birth date couldn't be typed. */
  document.addEventListener("click", function (event) {
    var target = event.target;
    var trigger = target instanceof Element ? target.closest("[data-footer-newsletter-dob-trigger]") : null;
    if (!trigger) return;

    var wrapper = trigger.closest(".footer-newsletter-form__dob-field");
    var dobInput = wrapper ? wrapper.querySelector(DOB_SELECTOR) : null;
    if (dobInput instanceof HTMLInputElement) {
      activateBirthDateInput(dobInput);
    }
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
