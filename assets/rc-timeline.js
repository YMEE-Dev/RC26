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
      scale: 100,
    },
    {
      label: "Street portrait",
      image: null,
      fill: "linear-gradient(180deg, #d8d8d5 0%, #8f8e88 50%, #4e4d4a 100%)",
      x: 43,
      y: 0,
      w: 24,
      h: 58,
      scale: 100,
    },
    {
      label: "Gold detail",
      image: null,
      fill: "linear-gradient(135deg, #ceb78c 0%, #89683f 50%, #20150f 100%)",
      x: 74,
      y: 8,
      w: 18,
      h: 26,
      scale: 100,
    },
  ];

  function normalizeMediaItem(item, index) {
    const fallback = fallbackMedia[index] || fallbackMedia[fallbackMedia.length - 1];
    const normalized = { ...fallback, ...(item || {}) };

    normalized.x = Number.isFinite(Number(normalized.x)) ? Number(normalized.x) : fallback.x;
    normalized.y = Number.isFinite(Number(normalized.y)) ? Number(normalized.y) : fallback.y;
    normalized.w = Number.isFinite(Number(normalized.w)) && Number(normalized.w) > 0 ? Number(normalized.w) : fallback.w;
    normalized.h = Number.isFinite(Number(normalized.h)) && Number(normalized.h) > 0 ? Number(normalized.h) : fallback.h;
    normalized.scale =
      Number.isFinite(Number(normalized.scale)) && Number(normalized.scale) > 0 ? Number(normalized.scale) : fallback.scale;
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

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function initStorySection(section) {
    if (section.dataset.storyInitialized === "true") {
      return;
    }

    document.body.classList.add("has-rc-story");

    const cleanupFns = [];
    const timeoutIds = new Set();
    const intervalIds = new Set();
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let destroyed = false;
    let revealObserver = null;

    const addCleanup = (fn) => {
      cleanupFns.push(fn);
    };

    const addManagedEvent = (target, type, handler, options) => {
      if (!target) {
        return;
      }

      target.addEventListener(type, handler, options);
      addCleanup(() => target.removeEventListener(type, handler, options));
    };

    const scheduleTimeout = (callback, delay) => {
      const timeoutId = window.setTimeout(() => {
        timeoutIds.delete(timeoutId);
        callback();
      }, delay);

      timeoutIds.add(timeoutId);
      return timeoutId;
    };

    const scheduleInterval = (callback, delay) => {
      const intervalId = window.setInterval(callback, delay);
      intervalIds.add(intervalId);
      return intervalId;
    };

    const clearScheduledWork = () => {
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timeoutIds.clear();
      intervalIds.forEach((intervalId) => window.clearInterval(intervalId));
      intervalIds.clear();
    };

    const scrollToY = (targetY, duration) => {
      if (prefersReducedMotion.matches) {
        window.scrollTo(0, targetY);
        return;
      }

      smoothScrollToY(targetY, duration);
    };

    const dataNode = section.querySelector("[data-timeline-data]");
    const mediaLayout = section.querySelector("[data-media-layout]");
    const yearRail = section.querySelector("[data-year-rail]");
    const timelineMarkers = section.querySelector("[data-timeline-markers]");
    const mediaCardTemplate = section.querySelector("[data-media-card-template]");
    const timelineStage = section.querySelector("[data-stage]");
    const timelineRoot = section.querySelector(".timeline");
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
    const sectionNavMobileMain = sectionNav ? sectionNav.querySelector(".section-nav__mobile-main") : null;
    const sectionNavMobileMenu = sectionNav ? sectionNav.querySelector(".section-nav__mobile-flower-trigger") : null;
    const sectionNavMobileDropdown = sectionNav ? sectionNav.querySelector(".section-nav__mobile-dropdown") : null;
    const sectionNavMobileLabel = sectionNav ? sectionNav.querySelector(".section-nav__mobile-label") : null;
    const sectionNavMobileLinks = sectionNav ? [...sectionNav.querySelectorAll(".section-nav__mobile-link")] : [];
    const mobileNavControls = [sectionNavMobileMain, sectionNavMobileMenu].filter(Boolean);

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
          .map((item, index) => ({
            ...normalizeMediaItem(item, index),
            slot: index + 1,
          }))
          .filter((item) => item && item.w > 0 && item.h > 0);
        const yearValue = String(entry.year || "").trim();

        return {
          ...entry,
          id: String(entry.id || ""),
          year: yearValue,
          title: String(entry.title || "").trim(),
          captionX: Number.isFinite(Number(entry.caption_x)) ? Number(entry.caption_x) : 74,
          captionY: Number.isFinite(Number(entry.caption_y)) ? Number(entry.caption_y) : 38,
          copy: String(entry.copy || entry.title || entry.year || "").trim(),
          media,
        };
      })
      .filter((entry) => entry.year);

    let activeIndex = -1;
    let captionRevealTimer = null;
    const historyRotateStart = -18;
    const historyRotateEnd = 8;
    let activeSectionIndex = -1;
    let heroIntroComplete = false;
    let mobileNavOpen = false;
    let heroSlideshowShowingAlt = false;
    let sectionNavIntroPlayed = false;
    let lastScrollY = window.scrollY || window.pageYOffset;

    const heroAltLayoutPresets = [
      [
        // top-left
        { top: "14px", left: "5%", width: "172px", height: "220px", scale: "100%" },
        // top-right
        { top: "30px", right: "-4%", width: "190px", height: "172px", scale: "40%" },
        // bottom-left
        { bottom: "0px", left: "0%", width: "190px", height: "200px", scale: "30%" },
        // bottom-right
        { bottom: "-50px", right: "0%", width: "214px", height: "206px", scale: "40%" },
      ],
    ];

    function setMobileMenuOpen(open) {
      if (!sectionNav || !sectionNavMobileDropdown) {
        return;
      }

      mobileNavOpen = !!open;
      sectionNav.classList.toggle("is-mobile-open", mobileNavOpen);
      sectionNavMobileDropdown.hidden = !mobileNavOpen;
      sectionNavMobileDropdown.setAttribute("aria-hidden", mobileNavOpen ? "false" : "true");
      mobileNavControls.forEach((control) => {
        control.setAttribute("aria-expanded", mobileNavOpen ? "true" : "false");
      });
    }

    function setSectionNavState(index) {
      sectionNavHighlights.forEach((highlight, highlightIndex) => {
        highlight.classList.toggle("is-active", highlightIndex === index);
      });

      sectionNavTabs.forEach((tab, tabIndex) => {
        tab.classList.toggle("is-active", tabIndex === index);
      });

      if (sectionNavMobileLabel && sectionNavTabs[index]) {
        sectionNavMobileLabel.textContent = sectionNavTabs[index].textContent.trim();
      }

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

        addManagedEvent(button, "click", () => {
          if (window.innerWidth <= 820) {
            const steps = [...section.querySelectorAll(".timeline-step")];
            const targetStep = steps[index];
            if (targetStep) {
              const triggerLine = (window.innerHeight || document.documentElement.clientHeight) * 0.9;
              const stepAbsoluteTop = targetStep.getBoundingClientRect().top + (window.scrollY || window.pageYOffset);
              scrollToY(Math.max(0, stepAbsoluteTop - triggerLine + 1), 500);
            } else {
              if (timelineRoot) {
                const timelineTop = timelineRoot.getBoundingClientRect().top + (window.scrollY || window.pageYOffset);
                const currentY = window.scrollY || window.pageYOffset;
                if (currentY < timelineTop - 24) {
                  scrollToY(timelineTop - 12, 550);
                }
              }
              setActiveEntry(index);
            }
            return;
          }

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

      if (window.innerWidth <= 820) {
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

      const layoutMedia = buildTimelineMediaLayout(entry);
      const [lineOne, lineTwo] = toTwoLineCaption(entry.copy);
      const lastImageDelay = Math.max(layoutMedia.length - 1, 0) * 320;
      const captionDelay = lastImageDelay + 260;

      if (captionRevealTimer) {
        window.clearTimeout(captionRevealTimer);
      }

      timelineCaption.classList.remove("is-visible");
      captionLineOne.textContent = lineOne;
      captionLineTwo.textContent = lineTwo;

      if (window.innerWidth <= 820) {
        timelineCaption.style.left = "";
        timelineCaption.style.top = "";
        timelineCaption.style.width = "";
      } else {
        timelineCaption.style.left = `${entry.captionX}%`;
        timelineCaption.style.top = `${entry.captionY}%`;
        timelineCaption.style.width = "24%";
      }

      if (prefersReducedMotion.matches) {
        timelineCaption.classList.add("is-visible");
        return;
      }

      captionRevealTimer = scheduleTimeout(() => {
        timelineCaption.classList.add("is-visible");
        captionRevealTimer = null;
      }, captionDelay);
    }

    function getTimelineLayoutVariant(year) {
      const yearText = String(year || "").trim().toLowerCase();
      const yearNumber = parseInt(yearText.replace(/[^\d]/g, ""), 10);
      if (Number.isFinite(yearNumber)) {
        return Math.abs(yearNumber) % 4;
      }
      let seed = 0;
      for (let i = 0; i < yearText.length; i += 1) {
        seed += yearText.charCodeAt(i);
      }
      return Math.abs(seed) % 4;
    }

    function buildTimelineMediaLayout(entry) {
      const mediaItems = (entry.media || []).map((item) => ({ ...item }));
      const variant = getTimelineLayoutVariant(entry.year);
      const variantOffsets = [
        [
          { x: 0, y: 0, w: 0, h: 0 },
          { x: 0, y: 0, w: 0, h: 0 },
          { x: 0, y: 0, w: 0, h: 0 },
        ],
        [
          { x: -3, y: -2, w: 3, h: 2 },
          { x: 1, y: -1, w: 2, h: 0 },
          { x: 2, y: 4, w: -2, h: -1 },
        ],
        [
          { x: 2, y: 3, w: -2, h: 1 },
          { x: -1, y: 2, w: 1, h: 2 },
          { x: -3, y: -2, w: 2, h: 1 },
        ],
        [
          { x: -1, y: 4, w: 1, h: -2 },
          { x: 2, y: -3, w: 0, h: 1 },
          { x: 1, y: 1, w: -1, h: 2 },
        ],
      ];

      return mediaItems.map((item, index) => {
        const offset = (variantOffsets[variant] || variantOffsets[0])[index] || { x: 0, y: 0, w: 0, h: 0 };
        return {
          ...item,
          x: clamp(item.x + offset.x, -8, 92),
          y: clamp(item.y + offset.y, -8, 92),
          w: clamp(item.w + offset.w, 12, 68),
          h: clamp(item.h + offset.h, 16, 74),
        };
      });
    }

    function renderMedia(entry) {
      if (!mediaLayout || !mediaCardTemplate) {
        return;
      }
      const isMobile = window.innerWidth <= 820;
      const mediaItems = buildTimelineMediaLayout(entry);

      const existingLayers = [...mediaLayout.querySelectorAll(".media-layer")];
      const currentLayer = existingLayers[existingLayers.length - 1] || null;
      const nextLayer = document.createElement("div");
      nextLayer.className = "media-layer";

      existingLayers.slice(0, -1).forEach((layer) => layer.remove());

      // On mobile, reorder so the middle image (index 1) is first (hero)
      const orderedItems = isMobile
        ? [mediaItems[1], mediaItems[0], mediaItems[2]].filter(Boolean)
        : mediaItems;

      orderedItems.forEach((item, index) => {
        const card = mediaCardTemplate.content.firstElementChild.cloneNode(true);
        const art = card.querySelector(".media-art");
        const scaleFactor = Math.max(0.6, Math.min(1.8, Number(item.scale || 100) / 100));

        if (!isMobile) {
          if (index === 1) {
            card.style.left = `calc(${item.x}% - 50px)`;
            card.style.width = `calc((${item.w}% + 100px) * ${scaleFactor})`;
          } else {
            card.style.left = `${item.x}%`;
            card.style.width = `calc(${item.w}% * ${scaleFactor})`;
          }
          card.style.top = `${item.y}%`;
          card.style.height = `calc(${item.h}% * ${scaleFactor})`;
        }

        if (item.image) {
          art.classList.add("has-image");
          art.style.backgroundImage = `url("${item.image}")`;
          art.style.removeProperty("--card-fill");
        } else {
          art.classList.remove("has-image");
          art.style.backgroundImage = "none";
          art.style.setProperty("--card-fill", item.fill);
        }

        nextLayer.append(card);

        if (prefersReducedMotion.matches) {
          card.style.opacity = "1";
          card.style.transform = "none";
          card.style.filter = "none";
          card.style.clipPath = "none";
        } else if (isMobile) {
          card.style.opacity = "0";
          requestAnimationFrame(() => {
            card.style.transitionDelay = `${index * 150}ms`;
            card.style.opacity = "1";
          });
        } else {
          card.style.opacity = "0";
          card.style.transform = "translateY(42px) scale(0.92)";
          card.style.filter = "blur(12px)";
          card.style.clipPath = "inset(14% 0 0 0)";

          requestAnimationFrame(() => {
            card.style.transitionDelay = `${index * 320}ms`;
            card.style.opacity = "1";
            card.style.transform = "translateY(0) scale(1)";
            card.style.filter = "blur(0)";
            card.style.clipPath = "inset(0 0 0 0)";
          });
        }
      });

      mediaLayout.append(nextLayer);

      if (currentLayer) {
        currentLayer.classList.add("is-exiting");
        if (prefersReducedMotion.matches || isMobile) {
          currentLayer.remove();
        } else {
          currentLayer.querySelectorAll(".media-card").forEach((card, index) => {
            card.style.transitionDelay = `${index * 120}ms`;
            card.style.opacity = "0";
            card.style.transform = "translateY(-24px) scale(1.03)";
            card.style.filter = "blur(10px)";
            card.style.clipPath = "inset(0 0 18% 0)";
          });

          scheduleTimeout(() => {
            if (currentLayer.isConnected) {
              currentLayer.remove();
            }
          }, 1700);
        }
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
      renderMedia(entry);
      renderCaption(entry);
      updateYearRail(index);
    }

    function updateActiveEntryOnScroll() {
      const triggerLine = window.innerHeight * 0.58;
      if (timelineRoot) {
        const timelineTop = timelineRoot.getBoundingClientRect().top;
        if (timelineTop > triggerLine) {
          setActiveEntry(-1);
          return;
        }
      }

      const steps = [...section.querySelectorAll(".timeline-step")];
      let nextIndex = activeIndex;
      let found = false;

      steps.forEach((step, index) => {
        const { top } = step.getBoundingClientRect();
        if (top <= triggerLine) {
          nextIndex = index;
          found = true;
        }
      });

      if (!found) {
        if (activeIndex >= 0) {
          return;
        }
        nextIndex = 0;
      }

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

      if (window.innerWidth <= 820) {
        const rect = historySection.getBoundingClientRect();
        const vh = window.innerHeight || document.documentElement.clientHeight;

        // Mobile: simple crossfade from drawing -> photo as the section moves up the viewport.
        const startPoint = vh * 0.65;
        const endPoint = vh * 0.15;
        let progress = (startPoint - rect.top) / (startPoint - endPoint);
        progress = Math.max(0, Math.min(1, progress));

        // Keep a subtle motion on mobile (no sticky/lock behavior).
        const angleDelta = (historyRotateEnd - historyRotateStart) * 0.5;
        const angle = historyRotateStart + angleDelta * progress;

        historyDrawingRing.style.transform = `rotate(${angle.toFixed(2)}deg)`;
        historyPhotoRing.style.transform = `rotate(${(angle + 2).toFixed(2)}deg) scale(${(1 + progress * 0.02).toFixed(3)})`;
        historyDrawingRing.style.opacity = (1 - progress).toFixed(3);
        historyPhotoRing.style.opacity = progress.toFixed(3);
        return;
      }

      const rect = historySection.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      // Start when the section is near viewport middle instead of near the bottom.
      const startPoint = vh * 0.55;
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

      if (historySection && window.innerWidth >= 750) {
        const historyRect = historySection.getBoundingClientRect();
        const triggerLine = (window.innerHeight || document.documentElement.clientHeight) * 0.72;
        const showHistoryNav = historyRect.top <= triggerLine;
        sectionNav.classList.toggle("is-history-visible", showHistoryNav);

        if (!showHistoryNav) {
          return;
        }

        if (!sectionNavIntroPlayed) {
          sectionNavIntroPlayed = true;
          sectionNav.classList.add("nav-intro");

          scheduleTimeout(() => {
            window.requestAnimationFrame(() => {
              window.requestAnimationFrame(() => {
                sectionNav.classList.add("nav-intro-run");
              });
            });
          }, 120);

          scheduleTimeout(() => {
            sectionNav.classList.add("nav-ready");
          }, 980);

          scheduleTimeout(() => {
            sectionNav.classList.remove("nav-intro");
            sectionNav.classList.remove("nav-intro-run");
          }, 2300);
        }
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
        if (destroyed) {
          return;
        }

        if (ticking) {
          return;
        }

        ticking = true;

        requestAnimationFrame(() => {
          if (destroyed) {
            ticking = false;
            return;
          }

          updateActiveEntryOnScroll();
          updateNavOffset();
          updateHeroCollageScroll();
          updateScrollCue();
          updateHistoryRingRotation();
          updateSectionNav();
          ticking = false;
        });
      };

      const onResize = () => {
        updateActiveEntryOnScroll();
        updateYearRail(activeIndex);
        updateNavOffset();
        updateHeroCollageScroll();
        updateScrollCue();
        updateHistoryRingRotation();
        updateSectionNav();
      };

      addManagedEvent(window, "scroll", onScroll, { passive: true });
      addManagedEvent(window, "resize", onResize);

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

      if (prefersReducedMotion.matches) {
        revealElements.forEach((element) => element.classList.add("is-visible"));
        return;
      }

      revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) {
              return;
            }

            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          });
        },
        {
          threshold: 0.18,
          rootMargin: "0px 0px -8% 0px",
        }
      );

      revealElements.forEach((element) => revealObserver.observe(element));
      addCleanup(() => revealObserver?.disconnect());
    }

    function initHeroCollage() {
      if (!heroCollage) {
        return;
      }

      if (prefersReducedMotion.matches) {
        heroIntroComplete = true;
        updateHeroCollageScroll();
        return;
      }

      const introAppearDuration = 1400;

      heroCollage.classList.add("is-intro");

      scheduleTimeout(() => {
        heroCollage.classList.add("is-intro-visible");
      }, 60);

      scheduleTimeout(() => {
        heroCollage.classList.remove("is-intro");
        heroCollage.classList.remove("is-intro-visible");
        heroIntroComplete = true;
        updateHeroCollageScroll();
      }, introAppearDuration);
    }

    function resetHeroItemPosition(item) {
      if (!item) {
        return;
      }

      item.style.removeProperty("top");
      item.style.removeProperty("right");
      item.style.removeProperty("bottom");
      item.style.removeProperty("left");
      item.style.removeProperty("width");
      item.style.removeProperty("height");
    }

    function applyHeroAltLayout() {
      if (!heroCollageItems.length) {
        return;
      }

      if (window.innerWidth > 820) {
        const altDesktopLayout = [
          { top: "-100px", left: "25%", width: "252px", height: "328px" },
          { top: "-42px", right: "4%", width: "300px", height: "416px" },
          { left: "calc(6% - 100px)", bottom: "100px", width: "530px", height: "418px" },
          { right: "-50px", bottom: "0px", width: "386px", height: "256px" },
        ];

        heroCollageItems.forEach((item, index) => {
          const styles = altDesktopLayout[index] || {};
          item.style.top = styles.top ?? "auto";
          item.style.right = styles.right ?? "auto";
          item.style.bottom = styles.bottom ?? "auto";
          item.style.left = styles.left ?? "auto";
          item.style.width = styles.width ?? "";
          item.style.height = styles.height ?? "";
          item.style.zIndex = index === 3 ? "8" : "";
        });
        return;
      }

      const preset = heroAltLayoutPresets[Math.floor(Math.random() * heroAltLayoutPresets.length)];
      heroCollageItems.forEach((item, index) => {
        const styles = { ...(preset[index] || {}) };
        if (!styles) {
          return;
        }

        item.style.top = styles.top ?? "auto";
        item.style.right = styles.right ?? "auto";
        item.style.bottom = styles.bottom ?? "auto";
        item.style.left = styles.left ?? "auto";
        item.style.width = styles.width ?? "";
        item.style.height = styles.height ?? "";
      });
    }

    function initHeroSlideshow() {
      if (!heroCollageItems.length) {
        return;
      }

      if (prefersReducedMotion.matches) {
        return;
      }

      const sourcesA = [];
      const altsA = [];
      const sourcesB = [];
      const altsB = [];

      heroCollageItems.forEach((item) => {
        const image = item.querySelector("img");
        if (!image) {
          return;
        }

        const sourceA = image.dataset.imageA || image.getAttribute("src") || "";
        const sourceB = image.dataset.imageB || "";
        const altA = image.dataset.altA || image.getAttribute("alt") || "";
        const altB = image.dataset.altB || "";

        sourcesA.push(sourceA);
        altsA.push(altA);
        sourcesB.push(sourceB);
        altsB.push(altB);
      });

      if (!sourcesA.length) {
        return;
      }

      const hasTrueAlternateSet = sourcesB.some((source) => Boolean(source));
      let heroSwapAnimating = false;

      if (!hasTrueAlternateSet) {
        return;
      }

      [...new Set(sourcesB.filter(Boolean))].forEach((source) => {
        const preloadImage = new Image();
        preloadImage.decoding = "async";
        preloadImage.src = source;
      });

      function animateHeroSwap(showAlt) {
        if (heroSwapAnimating || !heroCollageItems.length) {
          return;
        }

        heroSwapAnimating = true;
        const fadeMs = 2000;
        const staggerMs = 100;
        const settleMs = 200;
        const maxDelay = (heroCollageItems.length - 1) * staggerMs;
        const totalFadeOutMs = maxDelay + fadeMs;
        const totalMs = totalFadeOutMs + maxDelay + fadeMs + settleMs;

        heroCollageItems.forEach((item, index) => {
          const image = item.querySelector("img");
          if (!image) {
            return;
          }

          const nextSource = showAlt ? sourcesB[index] : sourcesA[index];
          const nextAlt = showAlt ? altsB[index] : altsA[index];

          const startDelay = index * staggerMs;

          scheduleTimeout(() => {
            item.style.opacity = "0";
          }, startDelay);

          scheduleTimeout(() => {
            if (nextSource && image.getAttribute("src") !== nextSource) {
              image.setAttribute("src", nextSource);
            }
            image.setAttribute("alt", nextAlt || "");
          }, totalFadeOutMs + 40);

          scheduleTimeout(() => {
            item.style.opacity = "1";
          }, totalFadeOutMs + 80 + startDelay);

        });

        scheduleTimeout(() => {
          if (showAlt) {
            applyHeroAltLayout();
            heroCollage?.classList.add("is-alt");
          } else {
            heroCollageItems.forEach(resetHeroItemPosition);
            heroCollage?.classList.remove("is-alt");
          }
        }, totalFadeOutMs + 20);

        scheduleTimeout(() => {
          heroSwapAnimating = false;
        }, totalMs);
      }

      scheduleInterval(() => {
        heroSlideshowShowingAlt = !heroSlideshowShowingAlt;
        animateHeroSwap(heroSlideshowShowingAlt);
      }, 6000);
    }

    function initMobileSwipe() {
      return;
    }

    function initSectionNav() {
      if (!sectionNavTabs.length) {
        return;
      }

      setMobileMenuOpen(false);

      sectionNavTabs.forEach((tab, index) => {
        addManagedEvent(tab, "mouseenter", () => setSectionNavState(index));
        addManagedEvent(tab, "mouseleave", updateSectionNav);
        addManagedEvent(tab, "click", (event) => {
          event.preventDefault();

          const target = section.querySelector(`#${tab.dataset.section || ""}`);
          if (!target) {
            return;
          }

          setSectionNavState(index);

          const targetY = target.getBoundingClientRect().top + window.scrollY - 20;
          const distance = Math.abs(targetY - (window.scrollY || window.pageYOffset));
          const duration = Math.max(900, Math.min(1800, distance * 0.9));

          scrollToY(targetY, duration);
        });
      });

      if (sectionNavMobileMenu) {
        addManagedEvent(sectionNavMobileMenu, "click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          const themeHamburger = document.querySelector(
            '.header__mobile__hamburger[data-drawer-toggle="hamburger"]'
          );

          if (themeHamburger) {
            themeHamburger.click();
            setMobileMenuOpen(false);
            return;
          }

          setMobileMenuOpen(!mobileNavOpen);
        });
      }

      if (sectionNavMobileMain) {
        addManagedEvent(sectionNavMobileMain, "click", (event) => {
          event.preventDefault();
          setMobileMenuOpen(!mobileNavOpen);
        });
      }

      sectionNavMobileLinks.forEach((link) => {
        addManagedEvent(link, "click", (event) => {
          event.preventDefault();
          const sectionId = link.dataset.section || "";
          const target = section.querySelector(`#${sectionId}`);
          const idx = Number.parseInt(link.dataset.idx || "-1", 10);

          if (Number.isInteger(idx) && idx >= 0) {
            setSectionNavState(idx);
          }

          if (target) {
            const targetY = target.getBoundingClientRect().top + window.scrollY - 20;
            const distance = Math.abs(targetY - (window.scrollY || window.pageYOffset));
            const duration = Math.max(900, Math.min(1800, distance * 0.9));
            scrollToY(targetY, duration);
          }

          setMobileMenuOpen(false);
        });
      });

      addManagedEvent(document, "click", (event) => {
        if (!mobileNavOpen || !sectionNav) {
          return;
        }

        if (!sectionNav.contains(event.target)) {
          setMobileMenuOpen(false);
        }
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
    initHeroSlideshow();
    initMobileSwipe();

    addManagedEvent(document, "shopify:block:select", (event) => {
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

    const cleanup = () => {
      if (destroyed) {
        return;
      }

      destroyed = true;
      clearScheduledWork();
      revealObserver?.disconnect();
      cleanupFns.splice(0).forEach((fn) => fn());
      section.removeAttribute("data-story-initialized");
      delete section.__rcStoryCleanup;

      if (!document.querySelector('.rc-story[data-story-initialized="true"]')) {
        document.body.classList.remove("has-rc-story");
      }
    };

    section.__rcStoryCleanup = cleanup;
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

  document.addEventListener("shopify:section:unload", (event) => {
    const storySections = [];

    if (event.target?.matches?.(".rc-story")) {
      storySections.push(event.target);
    }

    event.target?.querySelectorAll?.(".rc-story").forEach((section) => {
      storySections.push(section);
    });

    storySections.forEach((section) => {
      section.__rcStoryCleanup?.();
    });

    if (!document.querySelector(".rc-story")) {
      document.body.classList.remove("has-rc-story");
    }
  });
})();
