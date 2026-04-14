(() => {
  const TEMPLATE_CLASS = 'main-content--page-rc-timeline';
  const root = document.querySelector(`.${TEMPLATE_CLASS}`);
  if (!root) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const seen = new WeakSet();

  const isEligible = (element) => {
    if (!(element instanceof HTMLElement)) return false;
    if (seen.has(element)) return false;
    if (element.closest('.rc-story')) return false;
    if (element.closest('.section-nav')) return false;
    if (element.closest('.swiper, .swiper-wrapper, .swiper-slide')) return false;
    return true;
  };

  const getTargets = () => {
    const explicit = Array.from(root.querySelectorAll('[data-brand-fade]')).filter(isEligible);

    const fallback = [];
    const sections = Array.from(root.querySelectorAll('.shopify-section')).filter(
      (el) => el instanceof HTMLElement && !el.querySelector('.rc-story')
    );

    sections.forEach((section) => {
      if (section.querySelector('[data-brand-fade]')) return;

      const candidates = Array.from(
        section.querySelectorAll('h1,h2,h3,h4,h5,h6,p,blockquote,figure,ul,ol,video,img,a.button,button,.btn,.caption,.rte')
      ).filter(isEligible);

      fallback.push(...candidates.slice(0, 10));
    });

    return [...explicit, ...fallback].slice(0, 140);
  };

  const targets = getTargets();
  if (!targets.length) return;

  targets.forEach((element, index) => {
    seen.add(element);
    element.classList.add('rc-inview-fade');
    element.style.setProperty('--rc-inview-delay', `${Math.min(index * 0.08, 0.5)}s`);
  });

  const reveal = (element) => {
    requestAnimationFrame(() => element.classList.add('is-visible'));
  };

  if (prefersReducedMotion.matches) {
    targets.forEach(reveal);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        reveal(entry.target);
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.14, rootMargin: '0px 0px -10% 0px' }
  );

  targets.forEach((element) => observer.observe(element));
})();
