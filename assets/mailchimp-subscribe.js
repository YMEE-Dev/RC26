/**
 * mailchimp-subscribe.js
 *
 * Intercepts footer newsletter form submissions, sends data to Mailchimp
 * via JSONP (bypasses CORS), then shows a thank-you state without a page redirect.
 *
 * Targets: <form data-footer-newsletter-form>
 * Success wrapper: [data-footer-newsletter-wrapper] — gets class `is-success`
 */
(function () {
  "use strict";

  document.addEventListener("submit", function (event) {
    var form = event.target;

    if (!form.hasAttribute("data-footer-newsletter-form")) return;

    // Prevent the default POST (which causes the 404 redirect)
    event.preventDefault();

    // Mailchimp requires the post-json endpoint for JSONP
    // Anchor the replace to avoid matching /subscribe/post-json or other suffixes
    var baseUrl = form.action.replace(/\/subscribe\/post(\?|$)/, "/subscribe/post-json$1");

    if (!baseUrl || baseUrl.indexOf("list-manage.com") === -1) {
      console.warn("[mailchimp-subscribe] Invalid or missing Mailchimp action URL on form.");
      return;
    }

    var callbackName = "mc_cb_" + Date.now();

    // Serialize all form fields (u, id, EMAIL, FNAME, LNAME, LANGUAGE, CONSENT, tags…)
    var params = new URLSearchParams(new FormData(form));
    params.set("c", callbackName);

    var jsonpUrl = baseUrl + "?" + params.toString();

    var script = document.createElement("script");

    function cleanup() {
      if (window[callbackName]) delete window[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    window[callbackName] = function (data) {
      cleanup();

      if (data && data.result === "success") {
        showSuccess(form);
      } else {
        // Mailchimp returns HTML in data.msg on errors (e.g. already subscribed)
        var msg = data && data.msg ? data.msg.replace(/<[^>]+>/g, "") : "Something went wrong. Please try again.";
        showError(form, msg);
      }
    };

    script.src = jsonpUrl;
    document.head.appendChild(script);

    // Fallback: clean up if callback never fires (network error, etc.)
    setTimeout(cleanup, 8000);
  });

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
})();
