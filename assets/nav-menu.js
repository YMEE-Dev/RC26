/* =========================================================================
   Roberto Coin — hardcoded navigation behaviour (replaces Qikify Smart Menu)
   Desktop: 180ms hover-intent mega-menu, fade-as-one, image crossfade reveal,
            cursor parallax. Mobile/tablet: drill-down slide stack + scroll tint.
   ========================================================================= */
(function () {
  'use strict';

  var DWELL = 180;
  var FADE = 300;
  var root = document.querySelector('.rc-nav');
  if (!root) return;

  var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = window.matchMedia && window.matchMedia('(hover: none), (pointer: coarse)').matches;
  var motionOK = !prefersReduced && !coarse;

  /* ---------------------------------------------------------------------
     SHARED — search / newsletter / close helpers
     --------------------------------------------------------------------- */
  function openSearch() {
    // Open the theme's real search popdown (relocated into .rc-nav). Native <details> toggle.
    var summary = document.querySelector('[data-rc-search-summary]') ||
                  document.querySelector('header-search-popdown details > summary');
    if (summary) { summary.click(); return; }
    var url = root.getAttribute('data-search-url') || '/search';
    window.location.href = url;
  }
  function openNewsletter(e) {
    // Open the theme's footer newsletter drawer via its public open() API.
    var drawerEl = document.querySelector('footer-newsletter-drawer');
    if (drawerEl && typeof drawerEl.open === 'function') {
      if (e) e.preventDefault();
      drawerEl.open();
      return;
    }
    // Fallback: fire a documented event + focus the footer signup input.
    document.dispatchEvent(new CustomEvent('rc:newsletter-open'));
    var input = document.querySelector('[data-rc-newsletter-target] input, .footer__newsletter input[type="email"], form[action*="/contact#"] input[type="email"]');
    if (input) { if (e) e.preventDefault(); input.focus({ preventScroll: false }); input.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  }
  document.querySelectorAll('[data-rc-search]').forEach(function (el) {
    el.addEventListener('click', function (e) { e.preventDefault(); openSearch(); });
  });
  document.querySelectorAll('[data-rc-newsletter]').forEach(function (el) {
    el.addEventListener('click', function (e) { openNewsletter(e); });
  });

  /* =====================================================================
     DESKTOP mega-menu
     ===================================================================== */
  var desktop = root.querySelector('.rc-desktop');
  var panelsWrap = root.querySelector('[data-rc-panels]');

  if (desktop && panelsWrap) {
    var triggers = root.querySelectorAll('[data-rc-trigger]');
    var panels = {};
    panelsWrap.querySelectorAll('[data-panel]').forEach(function (p) { panels[p.getAttribute('data-panel')] = p; });

    var openKey = null;     // active (drives fade-in)
    var shownKey = null;    // rendered (persists through fade-out)
    var hiTimer = null, closeTimer = null, revealTimer = null;

    function showPanel(key) {
      shownKey = key;
      Object.keys(panels).forEach(function (k) {
        panels[k].setAttribute('data-shown', k === key ? '1' : '0');
      });
      // reset reveal image to this panel's default
      resetReveal();
    }
    function markActiveTrigger(key) {
      triggers.forEach(function (t) {
        t.setAttribute('data-active', t.getAttribute('data-rc-trigger') === key ? '1' : '0');
      });
    }
    function openNow(key) {
      clearTimeout(hiTimer); clearTimeout(closeTimer); clearTimeout(revealTimer);
      if (!panels[key]) return;
      openKey = key;
      root.setAttribute('data-open', '1');
      markActiveTrigger(key);
      showPanel(key);
    }
    function hoverIntent(key) {
      clearTimeout(hiTimer);
      hiTimer = setTimeout(function () { if (key) openNow(key); else close(); }, DWELL);
    }
    function cancelIntent() { clearTimeout(hiTimer); }
    function close() {
      clearTimeout(hiTimer); clearTimeout(revealTimer);
      if (!openKey) return;
      openKey = null;
      root.setAttribute('data-open', '0');
      markActiveTrigger(null);
      clearTimeout(closeTimer);
      closeTimer = setTimeout(function () { if (!openKey) showPanel(null); }, FADE);
    }

    triggers.forEach(function (t) {
      var key = t.getAttribute('data-rc-trigger');
      t.addEventListener('mouseenter', function () { hoverIntent(key); });
      t.addEventListener('mouseleave', function () { cancelIntent(); });
      t.addEventListener('focus', function () { openNow(key); });
      t.addEventListener('click', function (e) { e.preventDefault(); openNow(key); });
    });

    // closing surfaces: logo / utility / bag / search icon + leaving the desktop header zone
    root.querySelectorAll('[data-rc-close]').forEach(function (el) {
      el.addEventListener('mouseenter', close);
      el.addEventListener('focus', close);
    });
    desktop.addEventListener('mouseleave', close);
    // leaving the veil region (downwards onto the homepage strip) closes too
    panelsWrap.addEventListener('mouseleave', function () { hoverIntent(null); });
    panelsWrap.addEventListener('mouseenter', function () { clearTimeout(hiTimer); clearTimeout(closeTimer); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    // scrolling while a panel is open closes it — the header slides away on scroll,
    // so the trigger link disappears and an open panel would be left detached
    window.addEventListener('scroll', function () { if (openKey) close(); }, { passive: true });

    /* ---- image crossfade reveal (Jewelry featured voices) ---- */
    var jewelPanel = panels['jewelry'];
    var frontLayer = jewelPanel && jewelPanel.querySelector('[data-rc-img-front]');
    var backLayer = jewelPanel && jewelPanel.querySelector('[data-rc-img-back]');
    var frontVisible = true;
    var curImg = frontLayer ? frontLayer.getAttribute('data-default') : '';

    function setImage(src) {
      if (!frontLayer || !backLayer || !src || src === curImg) return;
      curImg = src;
      if (frontVisible) {
        backLayer.style.backgroundImage = "url('" + src + "')";
        backLayer.style.backgroundPosition = 'center';
        requestAnimationFrame(function () { frontLayer.style.opacity = '0'; backLayer.style.opacity = '1'; });
        frontVisible = false;
      } else {
        frontLayer.style.backgroundImage = "url('" + src + "')";
        frontLayer.style.backgroundPosition = 'center';
        requestAnimationFrame(function () { frontLayer.style.opacity = '1'; backLayer.style.opacity = '0'; });
        frontVisible = true;
      }
    }
    function resetReveal() {
      if (!frontLayer) return;
      var def = frontLayer.getAttribute('data-default');
      setImage(def);
    }
    if (jewelPanel) {
      jewelPanel.querySelectorAll('[data-rc-reveal]').forEach(function (a) {
        a.addEventListener('mouseenter', function () {
          clearTimeout(revealTimer);
          var img = a.getAttribute('data-rc-reveal');
          revealTimer = setTimeout(function () { setImage(img); }, DWELL);
        });
        a.addEventListener('mouseleave', function () {
          clearTimeout(revealTimer);
          revealTimer = setTimeout(resetReveal, DWELL);
        });
      });
    }

    /* ---- cursor parallax across the open menu ---- */
    if (motionOK) {
      var px = 0, py = 0, tx = 0, ty = 0, MAX = 32;
      panelsWrap.addEventListener('mousemove', function (e) {
        var r = panelsWrap.getBoundingClientRect();
        tx = (((e.clientX - r.left) / r.width) - 0.5) * 2 * MAX;
        ty = (((e.clientY - r.top) / r.height) - 0.5) * 2 * MAX;
      });
      panelsWrap.addEventListener('mouseleave', function () { tx = 0; ty = 0; });
      (function tick() {
        requestAnimationFrame(tick);
        var active = !!openKey;
        var dx = active ? tx : 0, dy = active ? ty : 0;
        px += (dx - px) * 0.07; py += (dy - py) * 0.07;
        if (!shownKey) return;
        var p = panels[shownKey];
        if (!p) return;
        var t = 'translate(' + px.toFixed(2) + 'px,' + py.toFixed(2) + 'px)';
        p.querySelectorAll('[data-rc-parallax]').forEach(function (el) { el.style.transform = t; });
      })();
    }
  }

  /* =====================================================================
     MOBILE / TABLET drawer
     ===================================================================== */
  var drawer = root.querySelector('[data-rc-drawer]');
  if (drawer) {
    var scroller = drawer.querySelector('[data-rc-scroll]');
    var header = drawer.querySelector('[data-rc-drawer-header]');
    var panelsM = {};
    drawer.querySelectorAll('[data-node]').forEach(function (p) { panelsM[p.getAttribute('data-node')] = p; });
    var stack = ['root'];
    var animating = false;

    function activeNode() { return stack[stack.length - 1]; }
    function showNode(node) {
      Object.keys(panelsM).forEach(function (k) {
        var el = panelsM[k];
        if (k === node) { el.hidden = false; el.setAttribute('data-active', '1'); }
        else { el.hidden = true; el.removeAttribute('data-active'); el.removeAttribute('data-anim'); }
      });
    }
    function updateScrollTint() {
      if (!scroller) return;
      var scrolled = scroller.scrollTop > (scroller.clientWidth - 104);
      drawer.setAttribute('data-scrolled', scrolled ? '1' : '0');
    }
    function slide(node, dir) {
      var el = panelsM[node];
      if (!el) return;
      animating = true;
      if (scroller) scroller.scrollTop = 0;
      showNode(node);
      el.setAttribute('data-anim', dir === 'back' ? 'back-start' : 'fwd-start');
      requestAnimationFrame(function () { requestAnimationFrame(function () {
        el.setAttribute('data-anim', 'in');
        setTimeout(function () { el.removeAttribute('data-anim'); animating = false; }, 500);
      }); });
      updateScrollTint();
    }
    function drill(node) { if (animating || !panelsM[node]) return; stack.push(node); slide(node, 'fwd'); }
    function back() { if (animating || stack.length <= 1) return; stack.pop(); slide(activeNode(), 'back'); }

    function openDrawer() {
      stack = ['root'];
      showNode('root');
      if (scroller) scroller.scrollTop = 0;
      drawer.setAttribute('data-open', '1');
      drawer.setAttribute('aria-hidden', 'false');
      // mark the nav as "overlay open" too, so every page-scheme dark rule
      // (guarded by .rc-nav:not([data-open="1"])) switches off — the drawer's
      // icons/text stay white regardless of the header observer.
      root.setAttribute('data-open', '1');
      document.documentElement.classList.add('rc-drawer-open');
      updateScrollTint();
    }
    function closeDrawer() {
      drawer.setAttribute('data-open', '0');
      drawer.setAttribute('aria-hidden', 'true');
      root.setAttribute('data-open', '0');
      document.documentElement.classList.remove('rc-drawer-open');
    }

    drawer.querySelectorAll('[data-rc-drill]').forEach(function (b) {
      b.addEventListener('click', function () { drill(b.getAttribute('data-rc-drill')); });
    });
    drawer.querySelectorAll('[data-rc-back]').forEach(function (b) {
      b.addEventListener('click', back);
    });
    drawer.querySelectorAll('[data-rc-drawer-close]').forEach(function (b) {
      b.addEventListener('click', closeDrawer);
    });
    // cart toggle inside the drawer: close the drawer so the cart drawer (lower
    // z-index than this full-screen overlay) isn't left hidden behind it. The
    // theme's own [data-cart-toggle] handler still opens the cart on the same click.
    drawer.querySelectorAll('[data-cart-toggle]').forEach(function (b) {
      b.addEventListener('click', closeDrawer);
    });
    if (scroller) scroller.addEventListener('scroll', updateScrollTint, { passive: true });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDrawer(); });

    // external open triggers (hamburger added in header integration)
    document.querySelectorAll('[data-rc-drawer-open]').forEach(function (b) {
      b.addEventListener('click', function (e) { e.preventDefault(); openDrawer(); });
    });
    // expose for theme code / hamburger reuse
    root.rcOpenDrawer = openDrawer;
    root.rcCloseDrawer = closeDrawer;
  }

  /* =====================================================================
     LIGHT/DARK SWITCHER — reuses the theme's header-observer section markers.
     A section opts in with [data-header-observer-mode="dark"] to request dark
     nav text/logo where it sits under the transparent bar. Default stays light
     (white) so the bar is unchanged over dark heroes. Colors live in CSS keyed
     on .rc-nav[data-scheme]. Decoupled from the (fragile) legacy header JS.
     ===================================================================== */
  (function initScheme() {
    var sections = [].slice.call(document.querySelectorAll('[data-header-observer-mode]'));
    if (!sections.length) return;

    // Server-rendered default from the header's header_default_mode (captured
    // before update() mutates data-scheme). Used when no observer section sits
    // under the bar — e.g. an article whose only marked section is at the bottom,
    // where hardcoding 'light' would wrongly flip a dark-default page to light.
    var defaultMode = root.getAttribute('data-scheme') === 'dark' ? 'dark' : 'light';

    function headerHeight() {
      var bar = root.querySelector('.rc-d-bar__grid');
      if (bar && bar.offsetParent !== null) return bar.offsetHeight;
      var mbar = root.querySelector('.rc-mobile-bar');
      return mbar ? mbar.offsetHeight : 104;
    }
    function activeMode() {
      var center = headerHeight() / 2;
      for (var i = 0; i < sections.length; i++) {
        var r = sections[i].getBoundingClientRect();
        if (r.top <= center && r.bottom >= center) {
          return sections[i].getAttribute('data-header-observer-mode') === 'dark' ? 'dark' : 'light';
        }
      }
      return defaultMode;
    }
    var raf = null;
    function update() {
      raf = null;
      var mode = activeMode();
      if (root.getAttribute('data-scheme') !== mode) root.setAttribute('data-scheme', mode);
    }
    function schedule() { if (raf === null) raf = window.requestAnimationFrame(update); }

    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
  })();

  /* =====================================================================
     HEADER SCROLL HIDE/REVEAL — recycled from the theme.
     The theme's <header-component> (HeaderComponent in theme.js) already toggles
     `body.header-scroll-hide` on scroll, with intent buffering and per-template
     rules (collection/blog stay hidden while scrolled; spotlight/timeline stay
     visible). It still runs on the hidden legacy header, so we let it be the
     single source of truth — our CSS keys the RC nav's slide on that same class.
     The landing entrance is a pure-CSS keyframe (rcHeaderFrom*, same timing as
     the theme's header-init-animation), so no JS is needed for it.
     ===================================================================== */

  /* =====================================================================
     SCROLL-REVEAL FROST — rebuilt for the RC nav.
     The theme's reveal blur (isScrollRevealBlurVisible) writes CSS vars onto the
     hidden legacy header, so it's inert here. We reproduce its intent with a
     `data-stuck` flag on .rc-nav = "scrolled past the bar". CSS frosts the bar
     when the header is shown (not header-scroll-hide) while stuck. This is a
     distinct signal from header-scroll-hide (which the theme owns), not a copy.
     ===================================================================== */
  (function initScrollFrost() {
    function headerHeight() {
      var bar = root.querySelector('.rc-d-bar__grid');
      if (bar && bar.offsetParent !== null) return bar.offsetHeight;
      var mbar = root.querySelector('.rc-mobile-bar');
      return (mbar && mbar.offsetHeight) || 104;
    }
    var raf = null;
    function update() {
      raf = null;
      var stuck = window.pageYOffset > headerHeight() ? '1' : '0';
      if (root.getAttribute('data-stuck') !== stuck) root.setAttribute('data-stuck', stuck);
    }
    function schedule() { if (raf === null) raf = window.requestAnimationFrame(update); }
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
  })();
})();
