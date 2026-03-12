(() => {
  const fallbackMedia = [
    {
      label: "Workshop portrait",
      image: null,
      fill: "linear-gradient(135deg, #5f5a71 0%, #241f29 65%, #0d0d12 100%)",
      x: 0,
      y: 18,
      w: 36,
      h: 46,
    },
    {
      label: "Street portrait",
      image: null,
      fill: "linear-gradient(180deg, #d8d8d5 0%, #8f8e88 50%, #4e4d4a 100%)",
      x: 43,
      y: 0,
      w: 24,
      h: 58,
    },
    {
      label: "Gold detail",
      image: null,
      fill: "linear-gradient(135deg, #ceb78c 0%, #89683f 50%, #20150f 100%)",
      x: 74,
      y: 8,
      w: 18,
      h: 26,
    },
  ];

  function normalizeMediaItem(item, index) {
    const fallback = fallbackMedia[index] || fallbackMedia[fallbackMedia.length - 1];
    const normalized = { ...fallback, ...(item || {}) };

    normalized.x = Number.isFinite(Number(normalized.x)) ? Number(normalized.x) : fallback.x;
    normalized.y = Number.isFinite(Number(normalized.y)) ? Number(normalized.y) : fallback.y;
    normalized.w = Number.isFinite(Number(normalized.w)) && Number(normalized.w) > 0 ? Number(normalized.w) : fallback.w;
    normalized.h = Number.isFinite(Number(normalized.h)) && Number(normalized.h) > 0 ? Number(normalized.h) : fallback.h;

    return normalized;
  }

  function toTwoLineCaption(copy) {
    const words = String(copy || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const midpoint = Math.ceil(words.length / 2);
    let first = words.slice(0, midpoint).join(" ");
    let second = words.slice(midpoint).join(" ");

    if (first.length > 54) {
      const firstWords = first.split(" ");
      while (firstWords.join(" ").length > 54 && firstWords.length > 4) {
        second = `${firstWords.pop()} ${second}`.trim();
      }
      first = firstWords.join(" ");
    }

    return [first, second];
  }

  function smoothScrollToY(targetY, duration) {
    const startY = window.scrollY || window.pageYOffset;
    const distance = targetY - startY;
    const startTime = performance.now();

    function easeInOutCubic(t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function step(currentTime) {
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const eased = easeInOutCubic(progress);
      window.scrollTo(0, startY + distance * eased);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    }

    window.requestAnimationFrame(step);
  }

  function initStorySection(section) {
    if (section.dataset.storyInitialized === "true") {
      return;
    }

    const dataNode = section.querySelector("[data-timeline-data]");
    const mediaLayout = section.querySelector("[data-media-layout]");
    const yearRail = section.querySelector("[data-year-rail]");
    const timelineMarkers = section.querySelector("[data-timeline-markers]");
    const mediaCardTemplate = section.querySelector("[data-media-card-template]");
    const timelineStage = section.querySelector("[data-stage]");
    const timelineCaption = section.querySelector("[data-timeline-caption]");
    const captionLineOne = section.querySelector("[data-caption-line-one]");
    const captionLineTwo = section.querySelector("[data-caption-line-two]");
    const historySection = section.querySelector(".history");
    const historyDrawingRing = section.querySelector(".history__ring--drawing");
    const historyPhotoRing = section.querySelector(".history__ring--photo");
    const heroCollage = section.querySelector(".hero-collage");
    const heroCollageItems = heroCollage ? [...heroCollage.querySelectorAll(".hero-collage__item")] : [];
    const scrollLink = section.querySelector(".scroll-link");
    const siteNavs = [...section.querySelectorAll(".site-nav")];
    const revealElements = [...section.querySelectorAll(".reveal-up")];
    const sectionNav = section.querySelector(".section-nav");
    const sectionNavTabs = sectionNav ? [...sectionNav.querySelectorAll(".section-nav__tab")] : [];
    const sectionNavHighlights = sectionNav ? [...sectionNav.querySelectorAll(".nav-highlight")] : [];

    let timelineEntries = [];

    if (dataNode) {
      try {
        timelineEntries = JSON.parse(dataNode.textContent || "[]");
      } catch (error) {
        console.error("Timeline data could not be parsed.", error);
      }
    }

    timelineEntries = timelineEntries
      .map((entry) => {
        const media = (entry.media || [])
          .map((item, index) => normalizeMediaItem(item, index))
          .filter((item) => item && item.w > 0 && item.h > 0);

        return {
          ...entry,
          id: String(entry.id || ""),
          year: String(entry.year || "").trim(),
          title: String(entry.title || "").trim(),
          copy: String(entry.copy || entry.title || entry.year || "").trim(),
          media: media.length ? media : fallbackMedia.map((item) => ({ ...item })),
        };
      })
      .filter((entry) => entry.year);

    let activeIndex = -1;
    let captionRevealTimer = null;
    const historyRotateStart = -18;
    const historyRotateEnd = 8;
    let activeSectionIndex = -1;
    let heroIntroComplete = false;

    function setSectionNavState(index) {
      sectionNavHighlights.forEach((highlight, highlightIndex) => {
        highlight.classList.toggle("is-active", highlightIndex === index);
      });

      sectionNavTabs.forEach((tab, tabIndex) => {
        tab.classList.toggle("is-active", tabIndex === index);
      });

      activeSectionIndex = index;
    }

    function renderYearRail() {
      if (!yearRail) {
        return;
      }

      yearRail.innerHTML = "";

      timelineEntries.forEach((entry, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = entry.year;
        button.dataset.index = String(index);
        button.dataset.blockId = entry.id;

        if (entry.year.toLowerCase() === "today") {
          button.classList.add("is-today");
        }

        button.addEventListener("click", () => {
          section
            .querySelector(`[data-step-index="${index}"]`)
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        });

        yearRail.append(button);
      });
    }

    function renderMarkers() {
      if (!timelineMarkers) {
        return;
      }

      timelineMarkers.innerHTML = "";

      timelineEntries.forEach((entry, index) => {
        const marker = document.createElement("div");
        marker.className = "timeline-step";
        marker.dataset.stepIndex = String(index);
        marker.dataset.blockId = entry.id || "";
        marker.setAttribute("aria-hidden", "true");
        timelineMarkers.append(marker);
      });
    }

    function updateYearRail(index) {
      if (!yearRail) {
        return;
      }

      const buttons = [...yearRail.querySelectorAll("button")];

      buttons.forEach((button, buttonIndex) => {
        button.classList.toggle("is-active", buttonIndex === index);
        button.classList.toggle("is-past", buttonIndex < index);
        button.classList.toggle("is-future", buttonIndex > index);
      });

      if (index < 0) {
        yearRail.style.setProperty("--rail-shift", "0px");
        return;
      }

      const activeButton = buttons[index];
      if (!activeButton) {
        return;
      }

      const railHeight = yearRail.offsetHeight;
      const activeCenter = activeButton.offsetTop + activeButton.offsetHeight / 2;
      const railCenter = railHeight / 2;
      const shift = railCenter - activeCenter;

      yearRail.style.setProperty("--rail-shift", `${shift}px`);
    }

    function renderCaption(entry) {
      if (!timelineCaption || !captionLineOne || !captionLineTwo) {
        return;
      }

      const anchor = entry.media[entry.media.length - 1];
      const [lineOne, lineTwo] = toTwoLineCaption(entry.copy);
      const lastImageDelay = Math.max(entry.media.length - 1, 0) * 320;
      const captionDelay = lastImageDelay + 260;

      if (captionRevealTimer) {
        window.clearTimeout(captionRevealTimer);
      }

      timelineCaption.classList.remove("is-visible");
      captionLineOne.textContent = lineOne;
      captionLineTwo.textContent = lineTwo;

      timelineCaption.style.left = `${anchor.x}%`;
      timelineCaption.style.top = `${Math.min(anchor.y + anchor.h + 4, 88)}%`;
      timelineCaption.style.width = `${Math.max(anchor.w, 24)}%`;

      captionRevealTimer = window.setTimeout(() => {
        timelineCaption.classList.add("is-visible");
        captionRevealTimer = null;
      }, captionDelay);
    }

    function renderMedia(mediaItems) {
      if (!mediaLayout || !mediaCardTemplate) {
        return;
      }

      const existingLayers = [...mediaLayout.querySelectorAll(".media-layer")];
      const currentLayer = existingLayers[existingLayers.length - 1] || null;
      const nextLayer = document.createElement("div");
      nextLayer.className = "media-layer";

      existingLayers.slice(0, -1).forEach((layer) => layer.remove());

      mediaItems.forEach((item, index) => {
        const card = mediaCardTemplate.content.firstElementChild.cloneNode(true);
        const art = card.querySelector(".media-art");

        card.style.left = `${item.x}%`;
        card.style.top = `${item.y}%`;
        card.style.width = `${item.w}%`;
        card.style.height = `${item.h}%`;
        card.style.opacity = "0";
        card.style.transform = "translateY(42px) scale(0.92)";
        card.style.filter = "blur(12px)";
        card.style.clipPath = "inset(14% 0 0 0)";

        if (item.image) {
          art.classList.add("has-image");
          art.style.backgroundImage = `url("${item.image}")`;
        } else {
          art.style.setProperty("--card-fill", item.fill);
        }

        nextLayer.append(card);

        requestAnimationFrame(() => {
          card.style.transitionDelay = `${index * 320}ms`;
          card.style.opacity = "1";
          card.style.transform = "translateY(0) scale(1)";
          card.style.filter = "blur(0)";
          card.style.clipPath = "inset(0 0 0 0)";
        });
      });

      mediaLayout.append(nextLayer);

      if (currentLayer) {
        currentLayer.classList.add("is-exiting");
        currentLayer.querySelectorAll(".media-card").forEach((card, index) => {
          card.style.transitionDelay = `${index * 120}ms`;
          card.style.opacity = "0";
          card.style.transform = "translateY(-24px) scale(1.03)";
          card.style.filter = "blur(10px)";
          card.style.clipPath = "inset(0 0 18% 0)";
        });

        window.setTimeout(() => {
          if (currentLayer.isConnected) {
            currentLayer.remove();
          }
        }, 1700);
      }
    }

    function setActiveEntry(index) {
      if (!timelineStage || !mediaLayout || !timelineCaption || !captionLineOne || !captionLineTwo) {
        return;
      }

      if (index < 0) {
        activeIndex = -1;
        timelineStage.classList.remove("is-active");
        mediaLayout.innerHTML = "";
        timelineCaption.classList.remove("is-visible");
        captionLineOne.textContent = "";
        captionLineTwo.textContent = "";
        updateYearRail(index);
        return;
      }

      const entry = timelineEntries[index];
      if (!entry || activeIndex === index) {
        updateYearRail(index);
        return;
      }

      activeIndex = index;
      timelineStage.classList.add("is-active");
      renderMedia(entry.media);
      renderCaption(entry);
      updateYearRail(index);
    }

    function updateActiveEntryOnScroll() {
      const triggerLine = window.innerHeight * 0.58;
      const steps = [...section.querySelectorAll(".timeline-step")];

      let nextIndex = -1;

      steps.forEach((step, index) => {
        const { top } = step.getBoundingClientRect();
        if (top <= triggerLine) {
          nextIndex = index;
        }
      });

      setActiveEntry(nextIndex);
    }

    function updateNavOffset() {
      const shift = Math.min(window.scrollY * 0.85, 180);
      siteNavs.forEach((nav) => {
        nav.style.setProperty("--nav-shift", `${shift}px`);
      });
    }

    function updateHeroCollageScroll() {
      if (!heroCollageItems.length || !heroIntroComplete) {
        return;
      }

      const progress = Math.max(0, Math.min(1, (window.scrollY || window.pageYOffset) / 240));

      heroCollageItems.forEach((item, index) => {
        const offset = index * 0.12;
        const localProgress = Math.max(0, Math.min(1, (progress - offset) / 0.55));
        const opacity = 1 - localProgress;
        const translateY = localProgress * -14;

        item.style.opacity = opacity.toFixed(3);
        item.style.transform = `translateY(${translateY.toFixed(2)}px)`;
      });
    }

    function updateScrollCue() {
      if (!scrollLink) {
        return;
      }

      scrollLink.classList.toggle("is-hidden", (window.scrollY || window.pageYOffset) > 0);
    }

    function updateHistoryRingRotation() {
      if (!historySection || !historyDrawingRing || !historyPhotoRing) {
        return;
      }

      const rect = historySection.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const startPoint = vh * 0.9;
      const endPoint = -rect.height * 0.35;
      let progress = (startPoint - rect.top) / (startPoint - endPoint);

      progress = Math.max(0, Math.min(1, progress));

      const angle = historyRotateStart + (historyRotateEnd - historyRotateStart) * progress;
      let fadeProgress = (progress - 0.05) / 0.3;
      let photoProgress = (progress - 0.32) / 0.28;

      fadeProgress = Math.max(0, Math.min(1, fadeProgress));
      photoProgress = Math.max(0, Math.min(1, photoProgress));

      historyDrawingRing.style.transform = `rotate(${angle.toFixed(2)}deg)`;
      historyPhotoRing.style.transform = `rotate(${(angle + 3).toFixed(2)}deg) scale(${(0.96 + photoProgress * 0.04).toFixed(3)})`;
      historyDrawingRing.style.opacity = (fadeProgress * (1 - photoProgress * 0.92)).toFixed(3);
      historyPhotoRing.style.opacity = (fadeProgress * photoProgress).toFixed(3);
    }

    function updateSectionNav() {
      if (!sectionNavTabs.length) {
        return;
      }

      const sections = sectionNavTabs
        .map((tab) => section.querySelector(`#${tab.dataset.section || ""}`))
        .filter(Boolean);
      const y = window.scrollY + 100;

      let found = -1;

      sections.forEach((target, index) => {
        if (target.getBoundingClientRect().top + window.scrollY <= y) {
          found = index;
        }
      });

      if (found !== activeSectionIndex) {
        setSectionNavState(found);
      }
    }

    function initScrollTracking() {
      let ticking = false;

      const onScroll = () => {
        if (ticking) {
          return;
        }

        ticking = true;

        requestAnimationFrame(() => {
          updateActiveEntryOnScroll();
          updateNavOffset();
          updateHeroCollageScroll();
          updateScrollCue();
          updateHistoryRingRotation();
          updateSectionNav();
          ticking = false;
        });
      };

      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", () => {
        updateActiveEntryOnScroll();
        updateYearRail(activeIndex);
        updateNavOffset();
        updateHeroCollageScroll();
        updateScrollCue();
        updateHistoryRingRotation();
        updateSectionNav();
      });

      updateActiveEntryOnScroll();
      updateNavOffset();
      updateHeroCollageScroll();
      updateScrollCue();
      updateHistoryRingRotation();
      updateSectionNav();
    }

    function initRevealAnimations() {
      if (!revealElements.length) {
        return;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) {
              return;
            }

            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          });
        },
        {
          threshold: 0.18,
          rootMargin: "0px 0px -8% 0px",
        }
      );

      revealElements.forEach((element) => observer.observe(element));
    }

    function initHeroCollage() {
      if (!heroCollage) {
        return;
      }

      const introAppearDuration = 1400;

      heroCollage.classList.add("is-intro");

      window.setTimeout(() => {
        heroCollage.classList.add("is-intro-visible");
      }, 60);

      window.setTimeout(() => {
        heroCollage.classList.remove("is-intro");
        heroCollage.classList.remove("is-intro-visible");
        heroIntroComplete = true;
        updateHeroCollageScroll();
      }, introAppearDuration);
    }

    function initSectionNav() {
      if (!sectionNavTabs.length) {
        return;
      }

      sectionNav.classList.add("nav-intro");

      window.setTimeout(() => {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            sectionNav.classList.add("nav-intro-run");
          });
        });
      }, 980);

      window.setTimeout(() => {
        sectionNav.classList.add("nav-ready");
      }, 1800);

      window.setTimeout(() => {
        sectionNav.classList.remove("nav-intro");
        sectionNav.classList.remove("nav-intro-run");
      }, 3060);

      sectionNavTabs.forEach((tab, index) => {
        tab.addEventListener("mouseenter", () => setSectionNavState(index));
        tab.addEventListener("mouseleave", updateSectionNav);
        tab.addEventListener("click", (event) => {
          event.preventDefault();

          const target = section.querySelector(`#${tab.dataset.section || ""}`);
          if (!target) {
            return;
          }

          setSectionNavState(index);

          const targetY = target.getBoundingClientRect().top + window.scrollY - 20;
          const distance = Math.abs(targetY - (window.scrollY || window.pageYOffset));
          const duration = Math.max(900, Math.min(1800, distance * 0.9));

          smoothScrollToY(targetY, duration);
        });
      });

      updateSectionNav();
    }

    if (timelineEntries.length) {
      renderYearRail();
      renderMarkers();
      setActiveEntry(-1);
    } else {
      section.querySelector(".timeline")?.classList.add("is-empty");
    }

    initScrollTracking();
    initRevealAnimations();
    initSectionNav();
    initHeroCollage();

    document.addEventListener("shopify:block:select", (event) => {
      const selectedBlockId =
        event.target?.closest?.("[data-block-id]")?.dataset?.blockId || event.detail?.blockId;
      const index = timelineEntries.findIndex((entry) => entry.id === selectedBlockId);

      if (index >= 0) {
        section
          .querySelector(`[data-step-index="${index}"]`)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
        setActiveEntry(index);
      }
    });

    section.dataset.storyInitialized = "true";
  }

  function initAllStorySections() {
    document.querySelectorAll(".rc-story").forEach(initStorySection);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAllStorySections);
  } else {
    initAllStorySections();
  }

  document.addEventListener("shopify:section:load", (event) => {
    event.target?.querySelectorAll?.(".rc-story").forEach(initStorySection);
  });
})();
