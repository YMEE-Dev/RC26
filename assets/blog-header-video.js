(() => {
  const selectors = {
    section: '[data-section-type="blog-brand"]',
    fadeTarget: '[data-brand-fade]',
    openButton: '[data-brand-video-open]',
    modal: '[data-brand-video-modal]',
    closeButton: '[data-brand-video-close]',
    modalPlayer: '.blog-brand__video-modal-player',
    modalClose: '.blog-brand__video-modal-close',
    inlineVideo: '.blog-brand__video--inline',
    modalVideo: '.blog-brand__video--modal'
  };

  const initializedSections = new WeakSet();

  const safePlay = (media) => {
    if (!media || typeof media.play !== 'function') return;

    const playPromise = media.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {});
    }
  };

  const getSectionRoots = (root = document) => {
    if (root.matches && root.matches(selectors.section)) {
      return [root];
    }

    return Array.from(root.querySelectorAll(selectors.section));
  };

  const initFadeTargets = (root) => {
    root.querySelectorAll(selectors.fadeTarget).forEach((element) => {
      if (element.dataset.brandFadeReady === 'true') return;

      element.dataset.brandFadeReady = 'true';

      if (element.dataset.brandFadeDelay) {
        element.style.setProperty('--brand-fade-delay', `${element.dataset.brandFadeDelay}s`);
      }

      element.classList.add('brand-fade-init');
      requestAnimationFrame(() => element.classList.add('brand-fade-visible'));
    });
  };

  const initVideoModal = (root) => {
    const openButton = root.querySelector(selectors.openButton);
    const modal = root.querySelector(selectors.modal);

    if (!openButton || !modal) return;

    const inlineVideo = root.querySelector(selectors.inlineVideo);
    const modalVideo = modal.querySelector(selectors.modalVideo);
    const closeButtons = modal.querySelectorAll(selectors.closeButton);
    const closeButton = modal.querySelector(selectors.modalClose);
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const transitionDuration = prefersReducedMotion.matches ? 0 : 400;
    let closeTimer = null;
    let previousBodyOverflow = '';

    const setExpandedState = (isExpanded) => {
      openButton.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
      modal.setAttribute('aria-hidden', isExpanded ? 'false' : 'true');
    };

    const resumeInlineVideo = () => {
      if (!inlineVideo) return;
      inlineVideo.muted = true;
      safePlay(inlineVideo);
    };

    const closeModal = () => {
      if (modal.hidden || modal.classList.contains('is-closing')) return;

      modal.classList.remove('is-open');
      modal.classList.add('is-closing');
      setExpandedState(false);
      document.body.style.overflow = previousBodyOverflow;

      window.clearTimeout(closeTimer);
      closeTimer = window.setTimeout(() => {
        modal.hidden = true;
        modal.classList.remove('is-closing');

        if (modalVideo) {
          modalVideo.pause();

          try {
            modalVideo.currentTime = 0;
          } catch {
          }
        }

        resumeInlineVideo();
        openButton.focus();
      }, transitionDuration);
    };

    openButton.addEventListener('click', () => {
      window.clearTimeout(closeTimer);
      previousBodyOverflow = document.body.style.overflow;
      modal.hidden = false;
      modal.classList.remove('is-closing');
      setExpandedState(true);

      requestAnimationFrame(() => {
        modal.classList.add('is-open');
      });

      document.body.style.overflow = 'hidden';

      if (inlineVideo) {
        inlineVideo.pause();
      }

      if (modalVideo) {
        modalVideo.muted = false;
        safePlay(modalVideo);
      }

      if (closeButton) {
        closeButton.focus();
      }
    });

    closeButtons.forEach((button) => {
      button.addEventListener('click', closeModal);
    });

    modal.addEventListener('click', (event) => {
      if (!(event.target instanceof Element)) return;

      const clickedInsidePlayer = event.target.closest(selectors.modalPlayer);
      const clickedCloseButton = event.target.closest(selectors.modalClose);

      if (!clickedInsidePlayer && !clickedCloseButton) {
        closeModal();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !modal.hidden) {
        closeModal();
      }
    });

    setExpandedState(false);
    resumeInlineVideo();
  };

  const initSection = (root) => {
    if (!root || initializedSections.has(root)) return;

    initializedSections.add(root);
    initFadeTargets(root);
    initVideoModal(root);
  };

  const initAllSections = (root = document) => {
    getSectionRoots(root).forEach(initSection);
  };

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      () => {
        initAllSections();
      },
      { once: true }
    );
  } else {
    initAllSections();
  }

  document.addEventListener('shopify:section:load', (event) => {
    initAllSections(event.target);
  });
})();
