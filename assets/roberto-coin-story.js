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
  const TIMELINE_COPY_2013 =
    "He received an award from the Phillips Collection in Washington for his contribution to American culture. He was honored at Vicenzaoro, the Vicenza Gold Trade Fair, as President of the Best Corporate Social Responsibility Brand during the Andrea Palladio International Jewelry Awards.";

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

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function initStorySection(section) {
    if (section.dataset.storyInitialized === "true") {
      return;
    }

    document.body.classList.add("has-rc-story");

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
          .filter((item) => item && item.w > 0 && item.h > 0 && item.image && String(item.image).trim() !== "");
        const yearValue = String(entry.year || "").trim();
        const isYear2013 = yearValue === "2013";

        return {
          ...entry,
          id: String(entry.id || ""),
          year: yearValue,
          title: String(entry.title || "").trim(),
          copy: isYear2013
            ? TIMELINE_COPY_2013
            : String(entry.copy || entry.title || entry.year || "").trim(),
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

    const heroAltLayoutPresets = [
      [
        { top: "14px", left: "5%", width: "152px", height: "220px" },
        { top: "32px", right: "-4%", width: "258px", height: "362px" },
        { bottom: "70px", left: "-6%", width: "438px", height: "326px" },
        { bottom: "18px", right: "-2%", width: "314px", height: "206px" },
      ],
      [
        { top: "56px", left: "18%", width: "124px", height: "208px" },
        { top: "4px", right: "8%", width: "292px", height: "388px" },
        { bottom: "108px", left: "-2%", width: "386px", height: "298px" },
        { bottom: "0px", right: "-10%", width: "278px", height: "190px" },
      ],
      [
        { top: "24px", left: "24%", width: "130px", height: "216px" },
        { top: "16px", right: "-2%", width: "270px", height: "368px" },
        { bottom: "84px", left: "-10%", width: "426px", height: "320px" },
        { bottom: "12px", right: "-6%", width: "308px", height: "212px" },
      ],
    ];

    function setMobileMenuOpen(open) {
      if (!sectionNav || !sectionNavMobileDropdown) {
        return;
      }

      mobileNavOpen = !!open;
      sectionNav.classList.toggle("is-mobile-open", mobileNavOpen);
      sectionNavMobileDropdown.setAttribute("aria-hidden", mobileNavOpen ? "false" : "true");
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

        button.addEventListener("click", () => {
          if (window.innerWidth <= 820) {
            if (timelineRoot) {
              const timelineTop = timelineRoot.getBoundingClientRect().top + window.scrollY;
              const currentY = window.scrollY || window.pageYOffset;
              if (currentY < timelineTop - 24) {
                smoothScrollToY(timelineTop - 12, 550);
              }
            }
            setActiveEntry(index);
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

      const isYear2013 = String(entry.year).trim() === "2013";
      const layoutMedia = buildTimelineMediaLayout(entry);
      const anchor = layoutMedia[layoutMedia.length - 1] || { x: 34, y: 60, w: 32, h: 20 };
      const [lineOne, lineTwo] = toTwoLineCaption(entry.copy);
      const lastImageDelay = Math.max(layoutMedia.length - 1, 0) * 320;
      const captionDelay = lastImageDelay + 260;

      if (captionRevealTimer) {
        window.clearTimeout(captionRevealTimer);
      }

      timelineCaption.classList.remove("is-visible");
      captionLineOne.textContent = lineOne;
      captionLineTwo.textContent = lineTwo;

      if (isYear2013) {
        timelineCaption.style.left = `${Math.min(anchor.x + anchor.w + 3, 72)}%`;
        timelineCaption.style.top = `${Math.max(anchor.y + 6, 10)}%`;
        timelineCaption.style.width = "26%";
      } else {
        timelineCaption.style.left = `${anchor.x}%`;
        timelineCaption.style.top = `${Math.min(anchor.y + anchor.h + 4, 88)}%`;
        timelineCaption.style.width = `${Math.max(anchor.w, 24)}%`;
      }

      captionRevealTimer = window.setTimeout(() => {
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
      if (String(entry.year).trim() === "2013") {
        const preferred = mediaItems[1] || mediaItems[0] || mediaItems[2];
        if (!preferred) {
          return [];
        }
        return [
          {
            ...preferred,
            x: 34,
            y: 4,
            w: 28,
            h: 62,
          },
        ];
      }
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
      const mediaItems = buildTimelineMediaLayout(entry);

      const existingLayers = [...mediaLayout.querySelectorAll(".media-layer")];
      const currentLayer = existingLayers[existingLayers.length - 1] || null;
      const nextLayer = document.createElement("div");
      nextLayer.className = "media-layer";

      existingLayers.slice(0, -1).forEach((layer) => layer.remove());

      mediaItems.forEach((item, index) => {
        const card = mediaCardTemplate.content.firstElementChild.cloneNode(true);
        const art = card.querySelector(".media-art");
        const isYear2013 = String(entry.year).trim() === "2013";

        if (isYear2013 && mediaItems.length === 1) {
          card.style.left = `calc(${item.x}% - 50px)`;
          card.style.width = `calc(${item.w}% + 100px)`;
        } else if (index === 1) {
          card.style.left = `calc(${item.x}% - 50px)`;
          card.style.width = `calc(${item.w}% + 100px)`;
        } else {
          card.style.left = `${item.x}%`;
          card.style.width = `${item.w}%`;
        }
        card.style.top = `${item.y}%`;
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

          window.setTimeout(() => {
            window.requestAnimationFrame(() => {
              window.requestAnimationFrame(() => {
                sectionNav.classList.add("nav-intro-run");
              });
            });
          }, 120);

          window.setTimeout(() => {
            sectionNav.classList.add("nav-ready");
          }, 980);

          window.setTimeout(() => {
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
          { top: "20px", left: "31%", width: "152px", height: "228px" },
          { top: "8px", right: "4%", width: "300px", height: "416px" },
          { left: "calc(6% - 100px)", bottom: "84px", width: "430px", height: "318px" },
          { right: "4%", bottom: "-10px", width: "286px", height: "206px" },
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

    function swapHeroImages(showAlt) {
      heroCollageItems.forEach((item) => {
        const image = item.querySelector("img");
        if (!image) {
          return;
        }

        const sourceA = image.dataset.imageA || image.getAttribute("src") || "";
        const sourceB = image.dataset.imageB || sourceA;
        const altA = image.dataset.altA || image.getAttribute("alt") || "";
        const altB = image.dataset.altB || altA;
        const nextSource = showAlt ? sourceB : sourceA;
        const nextAlt = showAlt ? altB : altA;

        if (nextSource && image.getAttribute("src") !== nextSource) {
          image.setAttribute("src", nextSource);
        }

        image.setAttribute("alt", nextAlt);
      });
    }

    function shuffleArray(values) {
      const next = [...values];
      for (let i = next.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
      }
      return next;
    }

    function initHeroSlideshow() {
      if (!heroCollageItems.length) {
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
        const sourceB = image.dataset.imageB || sourceA;
        const altA = image.dataset.altA || image.getAttribute("alt") || "";
        const altB = image.dataset.altB || altA;

        sourcesA.push(sourceA);
        altsA.push(altA);
        sourcesB.push(sourceB);
        altsB.push(altB);
      });

      if (!sourcesA.length) {
        return;
      }

      const hasTrueAlternateSet = sourcesA.some((source, index) => source && source !== sourcesB[index]);
      const fallbackSourcesB = shuffleArray(sourcesA);
      const fallbackAltsB = fallbackSourcesB.map((source, index) => {
        const sourceIndex = sourcesA.indexOf(source);
        return sourceIndex >= 0 ? altsA[sourceIndex] : altsA[index] || "";
      });
      let heroSwapAnimating = false;

      const preloadSources = hasTrueAlternateSet ? sourcesB : fallbackSourcesB;
      [...new Set(preloadSources.filter(Boolean))].forEach((source) => {
        const preloadImage = new Image();
        preloadImage.decoding = "async";
        preloadImage.src = source;
      });

      function animateHeroSwap(showAlt) {
        if (heroSwapAnimating || !heroCollageItems.length) {
          return;
        }

        heroSwapAnimating = true;
        const fadeMs = 780;
        const staggerMs = 170;
        const settleMs = 220;
        const maxDelay = (heroCollageItems.length - 1) * staggerMs;
        const totalFadeOutMs = maxDelay + fadeMs;
        const totalMs = totalFadeOutMs + maxDelay + fadeMs + settleMs;

        heroCollageItems.forEach((item, index) => {
          const image = item.querySelector("img");
          if (!image) {
            return;
          }

          let mappedIndex = index;
          if (showAlt && window.innerWidth > 820) {
            if (index === 1) {
              mappedIndex = 3;
            } else if (index === 3) {
              mappedIndex = 1;
            }
          }

          const nextSource = showAlt
            ? hasTrueAlternateSet
              ? sourcesB[mappedIndex]
              : fallbackSourcesB[mappedIndex]
            : sourcesA[index];
          const nextAlt = showAlt
            ? hasTrueAlternateSet
              ? altsB[mappedIndex]
              : fallbackAltsB[mappedIndex]
            : altsA[index];

          const startDelay = index * staggerMs;

          window.setTimeout(() => {
            item.style.opacity = "0";
          }, startDelay);

          window.setTimeout(() => {
            if (nextSource && image.getAttribute("src") !== nextSource) {
              image.setAttribute("src", nextSource);
            }
            image.setAttribute("alt", nextAlt || "");
          }, totalFadeOutMs + 40);

          window.setTimeout(() => {
            item.style.opacity = "1";
          }, totalFadeOutMs + 80 + startDelay);

        });

        window.setTimeout(() => {
          if (showAlt) {
            applyHeroAltLayout();
            heroCollage?.classList.add("is-alt");
          } else {
            heroCollageItems.forEach(resetHeroItemPosition);
            heroCollage?.classList.remove("is-alt");
          }
        }, totalFadeOutMs + 20);

        window.setTimeout(() => {
          heroSwapAnimating = false;
        }, totalMs);
      }

      window.setInterval(() => {
        heroSlideshowShowingAlt = !heroSlideshowShowingAlt;
        animateHeroSwap(heroSlideshowShowingAlt);
      }, 6000);
    }

    function initSectionNav() {
      if (!sectionNavTabs.length) {
        return;
      }

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

      if (sectionNavMobileMenu) {
        sectionNavMobileMenu.addEventListener("click", (event) => {
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
        sectionNavMobileMain.addEventListener("click", (event) => {
          event.preventDefault();
          setMobileMenuOpen(!mobileNavOpen);
        });
      }

      sectionNavMobileLinks.forEach((link) => {
        link.addEventListener("click", (event) => {
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
            smoothScrollToY(targetY, duration);
          }

          setMobileMenuOpen(false);
        });
      });

      document.addEventListener("click", (event) => {
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

  document.addEventListener("shopify:section:unload", () => {
    if (!document.querySelector(".rc-story")) {
      document.body.classList.remove("has-rc-story");
    }
  });
})();
