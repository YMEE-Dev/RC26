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
  if (document.body.dataset.rcAnimations === 'false') return;

  const SECTION_SELECTOR = '[data-section-type="sticky-scroll-desktop"]';
  const BLOCK_SELECTOR = '.sticky-scroll__block';

  const SNAP_DURATION_MS = 700;
  const WHEEL_MIN_DELTA  = 3;
  const SWIPE_MIN_PX     = 30;
  const SWIPE_MAX_MS     = 700;

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

    /* Per-section animation toggle — controlled via theme customizer.
       Reads the data attribute written by the Liquid template.          */
    const DISABLE_ANIMATION = section.dataset.rcAnimation === 'false';

    /* Section padding — lock triggers adjusted so the block (not the section
       top edge) is at the viewport edge at the moment of lock.               */
    const pt = parseFloat(getComputedStyle(section).paddingTop)    || 0;
    const pb = parseFloat(getComputedStyle(section).paddingBottom) || 0;

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

      /* Set all CSS variables BEFORE enabling locked CSS rules so that when
         data-rc-stack-fade-locked makes blocks position:absolute the correct
         --block-y / --stack-cover values are already in place — prevents the
         brief flash of the last (highest z-index) slide at lock time.        */
      blocks.forEach((b, i) => {
        const slideIdx = Math.floor(i / blocksPerSlide);
        b.style.setProperty("--sticky-z-index", slideIdx);
      });
      section.setAttribute("data-rc-stack-fade-no-transition", "");
      applyState();

      /* Marker for CSS — all rc-stack-fade.css rules are scoped to this
         attribute so the section renders natively when not engaged.        */
      section.setAttribute('data-rc-stack-fade-locked', '');

      /* Use offsetWidth (= document content width, excludes scrollbar) instead
         of 100vw (= full viewport including scrollbar) to avoid the ~15 px
         rightward shift of wrapper centering on non-overlay-scrollbar systems. */
      const sectionW = section.offsetWidth;
      section.style.cssText =
        `position:fixed;top:0;left:0;width:${sectionW}px;height:100vh;overflow:hidden;z-index:200;padding:0;`;
      wrapper.style.cssText = 'position:relative;height:100%;';
      blocksEl.style.cssText = "position:relative;width:100%;height:100%;";

      innerEls.forEach((el) => {
        el.style.height = "100%";
      });

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

      setTimeout(() => {
        cooldown = false;
        if (locked || animating) return;
        /* If the user scrolled past the trigger zone during cooldown,
           crossing detection will have missed it — catch it here with a
           directional position check based on which way we just exited. */
        const rect2 = section.getBoundingClientRect();
        const vh2   = window.innerHeight;
        if (exitDir > 0 && rect2.bottom >= vh2 + pb) { lock(slideCount - 1); return; }
        if (exitDir < 0 && rect2.top   <= -pt)       { lock(0); }
      }, 400);
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
      const inTopZone    = Math.abs(top + pt) <= 10;
      const inBottomZone = Math.abs(bottom - vh - pb) <= 10;
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
      const rect       = section.getBoundingClientRect();
      const top        = rect.top;
      const bottom     = rect.bottom;
      const vh         = window.innerHeight;
      const prevTop    = lastTop;
      const prevBottom = lastBottom;

      /* Always update — even during cooldown — so crossing detection has
         accurate prev values the moment cooldown expires.                 */
      lastTop    = top;
      lastBottom = bottom;

      if (locked || cooldown || animating) return;

      if (prevTop !== null && prevBottom !== null) {
        /* Down-from-above: block top crosses viewport top (section.top = -pt) */
        if (prevTop > -pt && top <= -pt)              { lock(0);               return; }
        /* Up-from-below: block bottom crosses viewport bottom (section.bottom = vh + pb) */
        if (prevBottom < vh + pb && bottom >= vh + pb) { lock(slideCount - 1); return; }
      }
      /* Slow-scroll safety nets */
      if (Math.abs(top + pt) <= 1)               { lock(0);               return; }
      if (Math.abs(bottom - vh - pb) <= 1)       { lock(slideCount - 1); return; }
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
