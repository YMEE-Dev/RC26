/*
 * Stack-fade — Module B (fullPage.js-style)
 *
 * Lock triggers:
 *   • onWheelSnap  — intercepts wheel events when section top is within ±10 px (pre-emptive)
 *   • onScrollCheck — crossing-detection fallback: fires whenever section top crosses 0,
 *                     even if a single scroll tick jumps the section top by >10 px
 *
 * Unlock visual fix:
 *   scrollTo is called BEFORE clearing inline styles so the section is already
 *   off-screen when transform resets to 0 — prevents flash of slide 0.
 *
 * Disabled under prefers-reduced-motion.
 */

(() => {
  if (window.__rcStackFadeInit) return;
  window.__rcStackFadeInit = true;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const SECTION_SELECTOR =
    '[data-section-type="sticky-scroll-desktop"],[data-section-type="sticky-scroll-mobile"]';
  const BLOCK_SELECTOR = '.sticky-scroll__block, .sticky-scroll-mobile__block';

  const SNAP_DURATION_MS = 700;
  const WHEEL_MIN_DELTA  = 3;
  const SWIPE_MIN_PX     = 30;
  const SWIPE_MAX_MS     = 700;
  const DISABLE_ANIMATION = false;

  const EASING = 'cubic-bezier(0.645,0.045,0.355,1.0)';

  const setupSection = (section) => {
    if (section.__rcStackFadeAttached) return;
    section.__rcStackFadeAttached = true;

    const wrapper  = section.querySelector('.sticky-scroll__wrapper, .sticky-scroll-mobile__wrapper');
    const blocksEl = section.querySelector('.sticky-scroll__blocks, .sticky-scroll-mobile__blocks');
    const blocks   = Array.from(section.querySelectorAll(BLOCK_SELECTOR));
    const innerEls = Array.from(section.querySelectorAll('.sticky-scroll__block-inner'));

    /* Mobile pairs adjacent image_block + text_block into a single slide unit
       so image and content are both visible in the viewport at once.          */
    const isMobile       = section.matches('[data-section-type="sticky-scroll-mobile"]');
    const blocksPerSlide = isMobile ? 2 : 1;
    const slideCount     = Math.ceil(blocks.length / blocksPerSlide);

    if (!wrapper || !blocksEl || slideCount < 2) return;

    let idx           = 0;
    let locked        = false;
    let animating     = false;
    let cooldown      = false;
    let watching      = false;
    let ph            = null;
    let sectionTop    = 0;
    let naturalHeight = 0;   /* section height measured before fixed styles are applied */
    let lastTop       = null; /* previous section top — used for down-from-above crossing */
    let lastBottom    = null; /* previous section bottom — used for up-from-below crossing */
    let touchY        = null;
    let touchT        = 0;

    /* ── State application ──────────────────────────────────────────────────
       Each block belongs to a slide (slideIdx = floor(i / blocksPerSlide)).
       For a block in slide s at current idx:
         • --block-y:     0vh if s <= idx (in-place),     100vh if s > idx (off-screen below)
         • --stack-cover: 1   if s <  idx (covered),       0     if s >= idx (sharp)
       100vh translateY pushes both half-height mobile blocks fully off-screen
       regardless of their top:0%/50% start position.                         */
    const applyState = () => {
      blocks.forEach((b, i) => {
        const slideIdx = Math.floor(i / blocksPerSlide);
        b.style.setProperty('--block-y',     slideIdx >  idx ? '100vh' : '0vh');
        b.style.setProperty('--stack-cover', slideIdx <  idx ? '1'     : '0');
      });
    };

    /* ── Lock ─────────────────────────────────────────────────────────────── */
    const lock = (startIdx = 0) => {
      if (locked || cooldown) return;
      locked        = true;
      idx           = startIdx;
      naturalHeight = section.offsetHeight; /* capture before fixed styles change it */
      sectionTop    = window.scrollY + section.getBoundingClientRect().top;

      ph               = document.createElement('div');
      ph.style.cssText = `height:${naturalHeight}px;`;
      section.insertAdjacentElement('afterend', ph);

      /* Marker for CSS — all rc-stack-fade.css rules are scoped to this
         attribute so the section renders natively when not engaged.        */
      section.setAttribute('data-rc-stack-fade-locked', '');

      section.style.cssText =
        'position:fixed;top:0;left:0;width:100vw;height:100vh;overflow:hidden;z-index:200;padding:0;';
      wrapper.style.cssText =
        "position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center;overflow:hidden;";
      blocksEl.style.cssText = "position:relative;width:100%;height:100%;";

      /* Each block: absolute, stacked by z-index, transformed via CSS vars.
         Z-index = slideIdx so paired mobile blocks (image + text) share a
         layer and overlay older slides as a unit.
         On mobile: blocks within a pair stack vertically — first at top:0,
         height:50%; second at top:50%, height:50%.
         On desktop: each block fills the viewport (top:0, height:100%).      */
      blocks.forEach((b, i) => {
        const slideIdx = Math.floor(i / blocksPerSlide);
        b.style.setProperty("--sticky-z-index", slideIdx);
      });
      innerEls.forEach((el) => {
        el.style.height = "100%";
      });

      /* Apply initial state without transitions to avoid flashing wrong slides */
      section.setAttribute("data-rc-stack-fade-no-transition", "");
      applyState();

      /* Enable transitions on next frame if animations enabled */
      requestAnimationFrame(() => {
        if (!DISABLE_ANIMATION) {
          section.removeAttribute("data-rc-stack-fade-no-transition");
        }
      });

      window.addEventListener('wheel',      onWheel,      { passive: false });
      window.addEventListener('touchstart', onTouchStart, { passive: true  });
      window.addEventListener('touchend',   onTouchEnd,   { passive: true  });
    };

    /* ── Unlock ────────────────────────────────────────────────────────────── */
    const unlock = (exitDir) => {
      if (!locked) return;
      locked    = false;
      animating = false;
      cooldown  = true;
      lastTop = null;
      lastBottom = null;

      window.removeEventListener('wheel',      onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend',   onTouchEnd);

      /* Final scroll target after all DOM mutations settle.
         Margin must exceed onWheelSnap's ±10px lock zone — otherwise a
         post-cooldown wheel gesture re-snaps the lock immediately, trapping
         the user in the slider. 30px gives clear runway above the threshold. */
      const EXIT_MARGIN = 30;
      const finalTarget = exitDir > 0
        ? sectionTop + naturalHeight + EXIT_MARGIN
        : Math.max(0, sectionTop - EXIT_MARGIN);

      /* Disable scroll-anchoring AND smooth-scroll behavior during the swap.
         • overflow-anchor: none — stops the browser re-anchoring scroll to
           keep visible content stable when the section returns to flow.
           (Safari ignores scroll anchoring entirely, so it's a no-op there.)
         • scroll-behavior: auto — overrides theme.css `scroll-behavior:smooth`
           so window.scrollTo is synchronous on all browsers, including those
           that don't yet support the behavior:'instant' option (older Safari,
           Chrome <102). Without this, scrollTo animates and gets interrupted
           by the DOM mutations below, leaving scrollY where it started.       */
      const docEl = document.documentElement;
      const prevAnchor   = docEl.style.overflowAnchor;
      const prevBehavior = docEl.style.scrollBehavior;
      docEl.style.overflowAnchor = 'none';
      docEl.style.scrollBehavior = 'auto';

      /* First scrollTo while section is still position:fixed — section stays
         pinned at top:0 regardless of scrollY, so there is no visible jump.
         behavior:'instant' overrides theme.css `scroll-behavior: smooth` —
         without it scrollTo is animated and gets interrupted by the DOM
         mutations below, leaving scrollY where it started.                   */
      if (ph) ph.style.height = `${naturalHeight + window.innerHeight + 10}px`;
      window.scrollTo({ top: finalTarget, left: 0, behavior: 'instant' });

      /* Invalidate crossing references — prevents stale values
         (left by onWheelSnap) from triggering a false re-lock after cooldown. */
      lastTop = null;
      lastBottom = null;

      section.style.cssText  = '';
      wrapper.style.cssText  = '';
      blocksEl.style.cssText = '';
      blocks.forEach((b) => {
        /* Explicitly remove custom properties — some browsers leave them set
           after removing the data attribute, which would re-apply blur/scale. */
        b.style.removeProperty("--block-y");
        b.style.removeProperty("--stack-cover");
        b.style.removeProperty("--sticky-z-index");
      });
      innerEls.forEach((el) => { el.style.height = ''; });

      section.removeAttribute('data-rc-stack-fade-locked');
      section.removeAttribute("data-rc-stack-fade-no-transition");

      if (ph) { ph.remove(); ph = null; }

      /* Re-assert scroll target after DOM mutations — corrects any drift
         from layout shifts even with overflow-anchor disabled.              */
      window.scrollTo({ top: finalTarget, left: 0, behavior: 'instant' });

      /* Restore inline overrides on next frame so layout is settled first. */
      requestAnimationFrame(() => {
        docEl.style.overflowAnchor = prevAnchor;
        docEl.style.scrollBehavior = prevBehavior;
      });

      setTimeout(() => { cooldown = false; }, 400);
    };

    /* ── Slide navigation ─────────────────────────────────────────────────── */
    const goTo = (next) => {
      if (animating) return;
      if (next < 0)             { unlock(-1); return; }
      if (next >= slideCount)   { unlock(+1); return; }
      if (next === idx) return;

      if (!DISABLE_ANIMATION) {
        animating = true;
        idx = next;

        applyState();

        setTimeout(() => {
          animating = false;
        }, SNAP_DURATION_MS + 100);
      } else {
        idx = next;
        applyState();
      }
    };

    /* ── Wheel (locked) ───────────────────────────────────────────────────── */
    const onWheel = (e) => {
      e.preventDefault();
      if (animating || Math.abs(e.deltaY) < WHEEL_MIN_DELTA) return;
      goTo(idx + (e.deltaY > 0 ? 1 : -1));
    };

    /* ── Touch ────────────────────────────────────────────────────────────── */
    const onTouchStart = (e) => {
      touchY = e.touches[0].clientY;
      touchT = Date.now();
    };
    const onTouchEnd = (e) => {
      if (touchY === null) return;
      const dy      = touchY - e.changedTouches[0].clientY;
      const elapsed = Date.now() - touchT;
      touchY = null;
      if (Math.abs(dy) < SWIPE_MIN_PX || elapsed > SWIPE_MAX_MS || animating) return;
      goTo(idx + (dy > 0 ? 1 : -1));
    };

    /* ── Wheel snap (pre-lock, passive:false so we can preventDefault) ─────
       Two snap zones:
         • Down-from-above: section's TOP edge within ±10 px of viewport top
         • Up-from-below:   section's BOTTOM edge within ±10 px of viewport bottom
       Symmetric with onScrollCheck's two crossing triggers.                   */
    const onWheelSnap = (e) => {
      if (locked || cooldown) return;
      if (Math.abs(e.deltaY) < WHEEL_MIN_DELTA) return;
      const rect = section.getBoundingClientRect();
      const top    = rect.top;
      const bottom = rect.bottom;
      const vh     = window.innerHeight;
      const inTopZone    = Math.abs(top) <= 10;
      const inBottomZone = Math.abs(bottom - vh) <= 10;
      if (!inTopZone && !inBottomZone) return;
      e.preventDefault();
      lock(e.deltaY < 0 ? slideCount - 1 : 0);
    };

    /* ── Scroll watcher: crossing-detection lock ──────────────────────────
       Fires on every scroll event and tracks direction via lastTop/lastBottom.
       Catches fast scrollers who jump past the ±10 px wheel-snap window.

       Asymmetric triggers handle tall sections (>viewport) correctly:
         • Down-from-above: section's TOP edge crosses viewport top (top → 0)
         • Up-from-below:   section's BOTTOM edge crosses viewport bottom
                            (bottom → vh). Firing on top→0 would force the user
                            to scroll up through the entire section's height
                            (sticky CSS showing last block) before autoscroll
                            engages — feels like "scrolling the slider twice."  */
    const onScrollCheck = () => {
      if (locked || cooldown || animating) return;
      const rect       = section.getBoundingClientRect();
      const top        = rect.top;
      const bottom     = rect.bottom;
      const vh         = window.innerHeight;
      const prevTop    = lastTop;
      const prevBottom = lastBottom;

      if (prevTop !== null && prevBottom !== null) {
        /* Down-from-above: top edge enters viewport from above */
        if (prevTop > 0 && top <= 0)        { lock(0);                return; }
        /* Up-from-below: bottom edge enters viewport from below */
        if (prevBottom < vh && bottom >= vh) { lock(slideCount - 1); return; }
      }
      /* Slow-scroll safety nets */
      if (Math.abs(top) <= 1)               { lock(0);                return; }
      if (Math.abs(bottom - vh) <= 1)       { lock(slideCount - 1); return; }

      lastTop = top;
      lastBottom = bottom;
    };

    const startWatch = () => {
      if (watching || DISABLE_ANIMATION) return;
      watching   = true;
      lastTop    = null;
      lastBottom = null;
      window.addEventListener('scroll', onScrollCheck, { passive: true });
      window.addEventListener('wheel',  onWheelSnap,   { passive: false });
      requestAnimationFrame(onScrollCheck);
    };

    const stopWatch = () => {
      if (!watching) return;
      watching   = false;
      lastTop    = null;
      lastBottom = null;
      window.removeEventListener('scroll', onScrollCheck);
      window.removeEventListener('wheel',  onWheelSnap);
      if (locked) unlock(0);
    };

    new IntersectionObserver(
      (entries) => entries.forEach((e) => (e.isIntersecting ? startWatch() : stopWatch())),
      { rootMargin: '100% 0px 100% 0px' }
    ).observe(section);
  };

  const init = () => document.querySelectorAll(SECTION_SELECTOR).forEach(setupSection);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  document.addEventListener('shopify:section:load', ({ target }) => {
    if (target?.matches?.(SECTION_SELECTOR)) setupSection(target);
    else target?.querySelectorAll?.(SECTION_SELECTOR).forEach(setupSection);
  });
})();
