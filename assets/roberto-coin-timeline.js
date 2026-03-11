(function () {
  function toTwoLineCaption(copy) {
    const words = String(copy || "").trim().split(/\s+/).filter(Boolean);
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

  function initTimeline(section) {
    if (section.dataset.timelineInitialized === "true") {
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

    if (
      !dataNode ||
      !mediaLayout ||
      !yearRail ||
      !timelineMarkers ||
      !mediaCardTemplate ||
      !timelineStage ||
      !timelineCaption ||
      !captionLineOne ||
      !captionLineTwo
    ) {
      return;
    }

    let timelineEntries = [];

    try {
      timelineEntries = JSON.parse(dataNode.textContent || "[]");
    } catch (error) {
      console.error("Timeline data could not be parsed.", error);
      return;
    }

    timelineEntries = timelineEntries
      .map((entry) => ({
        ...entry,
        media: (entry.media || []).filter((item) => item && Number(item.w) > 0 && Number(item.h) > 0),
      }))
      .filter((entry) => entry.year && entry.copy && entry.media.length);

    if (!timelineEntries.length) {
      section.style.display = "none";
      return;
    }

    section.dataset.timelineInitialized = "true";

    let activeIndex = -1;

    function renderYearRail() {
      yearRail.innerHTML = "";

      timelineEntries.forEach((entry, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = entry.year;
        button.dataset.index = String(index);
        button.dataset.blockId = entry.id || "";
        button.addEventListener("click", () => {
          section
            .querySelector(`[data-step-index="${index}"]`)
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
        yearRail.append(button);
      });
    }

    function renderMarkers() {
      timelineMarkers.innerHTML = "";

      timelineEntries.forEach((entry, index) => {
        const marker = document.createElement("div");
        marker.className = "rc-timeline__step";
        marker.dataset.stepIndex = String(index);
        marker.dataset.blockId = entry.id || "";
        marker.setAttribute("aria-hidden", "true");
        timelineMarkers.append(marker);
      });
    }

    function updateYearRail(index) {
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
      const anchor = entry.media[entry.media.length - 1];
      const [lineOne, lineTwo] = toTwoLineCaption(entry.copy);

      timelineCaption.classList.remove("is-visible");
      captionLineOne.textContent = lineOne;
      captionLineTwo.textContent = lineTwo;

      timelineCaption.style.left = `${anchor.x}%`;
      timelineCaption.style.top = `${Math.min(anchor.y + anchor.h + 4, 88)}%`;
      timelineCaption.style.width = `${Math.max(anchor.w, 24)}%`;

      requestAnimationFrame(() => {
        timelineCaption.classList.add("is-visible");
      });
    }

    function renderMedia(mediaItems) {
      const existingLayers = [...mediaLayout.querySelectorAll(".rc-timeline__media-layer")];
      const currentLayer = existingLayers[existingLayers.length - 1] || null;
      const nextLayer = document.createElement("div");
      nextLayer.className = "rc-timeline__media-layer";

      existingLayers.slice(0, -1).forEach((layer) => layer.remove());

      mediaItems.forEach((item, index) => {
        const card = mediaCardTemplate.content.firstElementChild.cloneNode(true);
        const art = card.querySelector(".rc-timeline__media-art");
        const label = card.querySelector(".rc-timeline__media-label");

        card.style.left = `${item.x}%`;
        card.style.top = `${item.y}%`;
        card.style.width = `${item.w}%`;
        card.style.height = `${item.h}%`;
        card.style.opacity = "0";
        card.style.transform = "translateY(42px) scale(0.92)";
        card.style.filter = "blur(12px)";
        card.style.clipPath = "inset(14% 0 0 0)";

        if (label) {
          label.textContent = item.label || "";
        }

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
        currentLayer.querySelectorAll(".rc-timeline__media-card").forEach((card, index) => {
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
      const triggerLine = window.innerHeight * 0.45;
      const steps = [...section.querySelectorAll(".rc-timeline__step")];

      let nextIndex = -1;

      steps.forEach((step, index) => {
        const { top } = step.getBoundingClientRect();
        if (top <= triggerLine) {
          nextIndex = index;
        }
      });

      setActiveEntry(nextIndex);
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
          ticking = false;
        });
      };

      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", () => {
        updateActiveEntryOnScroll();
        updateYearRail(activeIndex);
      });

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

      updateActiveEntryOnScroll();
    }

    renderYearRail();
    renderMarkers();
    setActiveEntry(-1);
    initScrollTracking();
  }

  function initAllTimelines() {
    document.querySelectorAll(".rc-timeline").forEach(initTimeline);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAllTimelines);
  } else {
    initAllTimelines();
  }

  document.addEventListener("shopify:section:load", (event) => {
    event.target?.querySelectorAll?.(".rc-timeline").forEach(initTimeline);
  });
})();
