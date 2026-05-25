/*
 * Stack-fade — Module B
 *
 * Two responsibilities:
 *
 *   1. Drives --stack-cover (per block) and --section-cover (per section) so the
 *      CSS in rc-stack-fade.css can run scale-down (back slide) and full-viewport
 *      darkening (during transition).
 *
 *   2. Snap-to-slide on wheel/swipe: while the section is "engaged" (first block
 *      pinned, last block not yet past), a single wheel tick or swipe advances
 *      exactly one slide. Smooth-scrolls to the target block's natural top via
 *      window.scrollTo({ behavior: 'smooth' }), so the cover ratios animate
 *      cleanly during the snap.
 *
 * Snap engages only inside the section's range. Above the section and after the
 * last slide, the wheel passes through to normal page scroll.
 */

(() => {
  if (window.__rcStackFadeInit) return;
  window.__rcStackFadeInit = true;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const SECTION_SELECTOR =
    '[data-section-type="sticky-scroll-desktop"],[data-section-type="sticky-scroll-mobile"]';
  const BLOCK_SELECTOR = '.sticky-scroll__block, .sticky-scroll-mobile__block';

  /* Snap config */
  const SNAP_COOLDOWN_MS = 850;            /* min gap between snaps (covers smooth-scroll duration) */
  const WHEEL_TRIGGER_DELTA = 5;           /* filter inertia micro-events */
  const WHEEL_ACCUMULATE_THRESHOLD = 30;   /* total deltaY for a "small scroll" to snap */
  const WHEEL_ACCUMULATE_RESET_MS = 300;   /* ms of wheel inactivity before accumulator resets */
  const SWIPE_THRESHOLD_PX = 30;           /* min swipe distance */
  const SWIPE_MAX_MS = 700;           /* max swipe duration */
  const TOP_ENGAGE_THRESHOLD = 10;    /* first block must be within this many px of viewport top */
  const BOTTOM_RELEASE_THRESHOLD = 100; /* last block's bottom must be at least this many px below top */

  const setupSection = (section) => {
    if (section.__rcStackFadeAttached) return;
    section.__rcStackFadeAttached = true;

    const blocks = Array.from(section.querySelectorAll(BLOCK_SELECTOR));
    if (blocks.length < 2) return;

    let scheduled = false;
    let active = false;
    let lastSnapTime = 0;
    let touchStartY = null;
    let touchStartTime = 0;
    let wheelAccumulator = 0;
    let wheelAccumTimer = null;

    /* ── Cover-ratio updates ───────────────────────────────────────────────── */
    /* Use layout coordinates (offsetTop) rather than getBoundingClientRect so the
       cover ratio isn't affected by the transform: scale we apply to the back slide. */
    const updateCovers = () => {
      scheduled = false;
      const viewportH = window.innerHeight || document.documentElement.clientHeight;
      const scrollY = window.scrollY || window.pageYOffset;
      for (let i = 0; i < blocks.length - 1; i++) {
        const nextTop = blocks[i + 1].offsetTop;
        /* Cover ratio = how far the next block's natural top has risen into the viewport,
           normalized to a viewport height. 0 when next block is at viewport bottom,
           1 when next block has reached viewport top. */
        let ratio = (viewportH + scrollY - nextTop) / viewportH;
        if (ratio < 0) ratio = 0;
        else if (ratio > 1) ratio = 1;
        blocks[i].style.setProperty('--stack-cover', ratio.toFixed(3));
      }
    };

    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(updateCovers);
    };

    /* ── Snap helpers ──────────────────────────────────────────────────────── */
    const findActiveBlockIdx = () => {
      const scrollY = window.scrollY;
      for (let i = blocks.length - 1; i >= 0; i--) {
        if (blocks[i].offsetTop <= scrollY + 10) return i;
      }
      return 0;
    };

    const snapToIdx = (idx) => {
      if (idx < 0 || idx >= blocks.length) return false;
      const targetY = blocks[idx].offsetTop;
      if (Math.abs(window.scrollY - targetY) < 5) return false;
      window.scrollTo({ top: targetY, behavior: 'smooth' });
      return true;
    };

    const isSnapEngaged = () => {
      const firstTop = blocks[0].getBoundingClientRect().top;
      const lastBottom = blocks[blocks.length - 1].getBoundingClientRect().bottom;
      return firstTop <= TOP_ENGAGE_THRESHOLD && lastBottom > BOTTOM_RELEASE_THRESHOLD;
    };

    /* ── Wheel handler ─────────────────────────────────────────────────────── */
    const onWheel = (e) => {
      if (!isSnapEngaged()) return;
      if (Math.abs(e.deltaY) < WHEEL_TRIGGER_DELTA) return;

      const now = Date.now();
      if (now - lastSnapTime < SNAP_COOLDOWN_MS) {
        e.preventDefault();
        return;
      }

      const direction = e.deltaY > 0 ? 1 : -1;
      const currentIdx = findActiveBlockIdx();
      const targetIdx = currentIdx + direction;

      /* At section boundary — let scroll pass through so user can exit */
      if (targetIdx < 0 || targetIdx >= blocks.length) {
        wheelAccumulator = 0;
        clearTimeout(wheelAccumTimer);
        return;
      }

      /* Accumulate delta; snap fires once the gesture crosses the threshold.
         Mouse-wheel clicks (≥100 deltaY) snap immediately; trackpad requires
         a short deliberate scroll gesture (~80px total). */
      e.preventDefault();
      wheelAccumulator += e.deltaY;
      clearTimeout(wheelAccumTimer);
      wheelAccumTimer = setTimeout(() => { wheelAccumulator = 0; }, WHEEL_ACCUMULATE_RESET_MS);

      if (Math.abs(wheelAccumulator) < WHEEL_ACCUMULATE_THRESHOLD) return;

      wheelAccumulator = 0;
      clearTimeout(wheelAccumTimer);

      if (snapToIdx(targetIdx)) {
        lastSnapTime = now;
      }
    };

    /* ── Touch handler (swipe to advance) ──────────────────────────────────── */
    const onTouchStart = (e) => {
      if (!isSnapEngaged()) {
        touchStartY = null;
        return;
      }
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
    };

    const onTouchEnd = (e) => {
      if (touchStartY === null) return;
      const elapsed = Date.now() - touchStartTime;
      const deltaY = touchStartY - e.changedTouches[0].clientY;
      touchStartY = null;

      if (Math.abs(deltaY) < SWIPE_THRESHOLD_PX || elapsed > SWIPE_MAX_MS) return;
      if (!isSnapEngaged()) return;

      const now = Date.now();
      if (now - lastSnapTime < SNAP_COOLDOWN_MS) return;

      const currentIdx = findActiveBlockIdx();
      const targetIdx = deltaY > 0 ? currentIdx + 1 : currentIdx - 1;

      if (snapToIdx(targetIdx)) {
        lastSnapTime = now;
      }
    };

    /* ── Lifecycle ─────────────────────────────────────────────────────────── */
    const enter = () => {
      if (active) return;
      active = true;
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule, { passive: true });
      window.addEventListener('wheel', onWheel, { passive: false });
      window.addEventListener('touchstart', onTouchStart, { passive: true });
      window.addEventListener('touchend', onTouchEnd, { passive: true });
      schedule();
    };

    const leave = () => {
      if (!active) return;
      active = false;
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) enter();
          else leave();
        });
      },
      { rootMargin: '50% 0px 50% 0px' }
    );
    observer.observe(section);
  };

  const init = () => {
    const sections = document.querySelectorAll(SECTION_SELECTOR);
    sections.forEach(setupSection);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  /* Re-init when theme editor swaps a section in */
  document.addEventListener('shopify:section:load', (event) => {
    const section = event.target;
    if (section && section.matches && section.matches(SECTION_SELECTOR)) {
      setupSection(section);
    } else if (section && section.querySelector) {
      const nested = section.querySelectorAll(SECTION_SELECTOR);
      nested.forEach(setupSection);
    }
  });
})();
