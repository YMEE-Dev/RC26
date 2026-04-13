(() => {
  const TEMPLATE_CLASS = 'main-content--article-the-ultimate-explorer-of-beauty';
  const root = document.querySelector(`.${TEMPLATE_CLASS}`);
  if (!root) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const sectionTargets = new WeakMap();

  const collectTargets = (sectionRoot) => {
    const explicit = Array.from(sectionRoot.querySelectorAll('[data-brand-fade]')).filter(
      (el) => el instanceof HTMLElement
    );
    if (explicit.length) return explicit;

    const candidates = Array.from(
      sectionRoot.querySelectorAll('h1,h2,h3,h4,h5,h6,p,blockquote,figure,ul,ol,video,img,a.button,button,.btn')
    ).filter((el) => el instanceof HTMLElement);

    const filtered = candidates.filter((el) => {
      if (el.closest('.swiper, .swiper-wrapper, .swiper-slide')) return false;
      if (el.closest('nav')) return false;
      if (el.tagName === 'IMG' && el.closest('figure')) return false;
      return true;
    });

    return filtered.slice(0, 14);
  };

  const prepareSection = (sectionRoot) => {
    if (!(sectionRoot instanceof HTMLElement)) return;
    if (sectionTargets.has(sectionRoot)) return;

    const targets = collectTargets(sectionRoot);
    sectionTargets.set(sectionRoot, targets);

    targets.forEach((element, index) => {
      element.classList.add('rc-inview-fade');
      element.style.setProperty('--rc-inview-delay', `${Math.min(index * 0.12, 0.9)}s`);
    });
  };

  const revealSection = (sectionRoot) => {
    const targets = sectionTargets.get(sectionRoot);
    if (!targets) return;

    requestAnimationFrame(() => {
      targets.forEach((element) => element.classList.add('is-visible'));
    });
  };

  const init = () => {
    const sections = Array.from(root.querySelectorAll('.shopify-section')).filter(
      (el) => el instanceof HTMLElement
    );
    if (sections.length === 0) return;

    sections.forEach(prepareSection);

    if (prefersReducedMotion.matches) {
      sections.forEach(revealSection);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          revealSection(entry.target);
          observer.unobserve(entry.target);
        });
      },
      { root: null, rootMargin: '0px 0px -10% 0px', threshold: 0.12 }
    );

    sections.forEach((sectionRoot) => observer.observe(sectionRoot));
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
