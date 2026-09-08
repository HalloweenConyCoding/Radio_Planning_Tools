(function initTiltCalculatorMotion(global) {
  "use strict";

  const document = global.document;
  if (!document) return;

  const root = document.documentElement;
  const background = document.querySelector(".paper-depth") || root;
  const reducedMotion = global.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointerQuery = global.matchMedia("(hover: hover) and (pointer: fine)");
  const revealTargets = Array.from(document.querySelectorAll(".reveal-section"));
  const resultsTarget = document.getElementById("results");
  const introTarget = document.querySelector(".canvas-intro");
  const introImage = document.querySelector(".canvas-intro-image");
  let reduced = reducedMotion.matches;
  let finePointer = finePointerQuery.matches;
  let pageHidden = Boolean(document.hidden);
  let frame = 0;
  let observer = null;
  let sizeObserver = null;
  let resultObserver = null;
  let introObserver = null;
  let introDismissed = false;
  let resultClearTimer = 0;
  let scrollableHeight = 1;
  let viewportWidth = global.innerWidth || 1;
  let viewportHeight = global.innerHeight || 1;
  let pointerX = 0;
  let pointerY = 0;

  function refreshDimensions() {
    viewportWidth = Math.max(global.innerWidth || 1, 1);
    viewportHeight = Math.max(global.innerHeight || 1, 1);
    scrollableHeight = Math.max(document.documentElement.scrollHeight - viewportHeight, 1);
  }

  function setDynamicValue(name, value) {
    background.style.setProperty(name, `${value}px`);
  }

  function setPaperShift(scrollY) {
    const progress = Math.min(Math.max((scrollY || 0) / scrollableHeight, 0), 1);
    setDynamicValue("--paper-shift-top", Math.round(progress * -8));
    setDynamicValue("--paper-shift-far", Math.round(progress * -20));
    setDynamicValue("--paper-shift-mid", Math.round(progress * -62));
    setDynamicValue("--paper-shift-near", Math.round(progress * -112));
  }

  function setPointerShift() {
    const x = finePointer ? pointerX : 0;
    const y = finePointer ? pointerY : 0;
    setDynamicValue("--paper-pointer-x", x * 0.2);
    setDynamicValue("--paper-pointer-y", y * 0.2);
    setDynamicValue("--paper-pointer-far-x", x * 0.35);
    setDynamicValue("--paper-pointer-far-y", y * 0.35);
    setDynamicValue("--paper-pointer-mid-x", x * 0.7);
    setDynamicValue("--paper-pointer-mid-y", y * 0.7);
    setDynamicValue("--paper-pointer-near-x", x);
    setDynamicValue("--paper-pointer-near-y", y);
  }

  function updateBackground() {
    frame = 0;
    setPaperShift(global.scrollY);
    setPointerShift();
  }

  function scheduleBackgroundUpdate() {
    if (reduced || pageHidden || frame) return;
    frame = global.requestAnimationFrame(updateBackground);
  }

  function handleScroll() {
    scheduleBackgroundUpdate();
  }

  function handleResize() {
    refreshDimensions();
    scheduleBackgroundUpdate();
  }

  function handlePointerMove(event) {
    if (reduced || pageHidden || !finePointer) return;
    pointerX = Math.max(-6, Math.min(6, ((event.clientX / viewportWidth) - 0.5) * 12));
    pointerY = Math.max(-6, Math.min(6, ((event.clientY / viewportHeight) - 0.5) * 8));
    scheduleBackgroundUpdate();
  }

  function handlePointerLeave() {
    pointerX = 0;
    pointerY = 0;
    scheduleBackgroundUpdate();
  }

  function clearBackgroundTransforms() {
    pointerX = 0;
    pointerY = 0;
    ["--paper-shift-top", "--paper-shift-far", "--paper-shift-mid", "--paper-shift-near", "--paper-pointer-x", "--paper-pointer-y", "--paper-pointer-far-x", "--paper-pointer-far-y", "--paper-pointer-mid-x", "--paper-pointer-mid-y", "--paper-pointer-near-x", "--paper-pointer-near-y"].forEach((name) => setDynamicValue(name, 0));
  }

  function clearResultsCue() {
    if (resultClearTimer) {
      global.clearTimeout(resultClearTimer);
      resultClearTimer = 0;
    }
    if (resultsTarget) resultsTarget.classList.remove("results-updated");
  }

  function resultsHaveContent() {
    if (!resultsTarget) return false;
    return String(resultsTarget.textContent || resultsTarget.innerHTML || "").trim() !== "";
  }

  function dismissIntro() {
    if (introDismissed || !introTarget) return;
    introDismissed = true;
    introTarget.classList.add("is-dismissed");
    if (introObserver) {
      introObserver.disconnect();
      introObserver = null;
    }
  }

  function checkIntroResults() {
    if (resultsHaveContent()) dismissIntro();
  }

  function dismissBrokenIntro() {
    if (introDismissed || !introTarget) return;
    introDismissed = true;
    introTarget.classList.add("is-broken");
    if (introObserver) {
      introObserver.disconnect();
      introObserver = null;
    }
  }

  function startIntroObserver() {
    if (!introTarget) return;
    if (introImage) {
      introImage.addEventListener("error", dismissBrokenIntro, { once: true });
      if (introImage.complete && introImage.naturalWidth === 0) dismissBrokenIntro();
    }
    if (introDismissed) return;
    if (resultsTarget && "MutationObserver" in global) {
      try {
        introObserver = new global.MutationObserver((records) => {
          if (records.length) checkIntroResults();
        });
        introObserver.observe(resultsTarget, { childList: true, subtree: true, characterData: true });
        checkIntroResults();
        return;
      } catch (error) {
        introObserver = null;
      }
    }
    const calcButton = document.querySelector(".calc-wrapper");
    if (calcButton) {
      const afterEvent = typeof global.queueMicrotask === "function"
        ? global.queueMicrotask.bind(global)
        : (callback) => Promise.resolve().then(callback);
      calcButton.addEventListener("click", () => afterEvent(checkIntroResults));
    }
    checkIntroResults();
  }

  function pulseResults() {
    if (reduced || pageHidden || !resultsTarget) return;
    if (resultClearTimer) {
      global.clearTimeout(resultClearTimer);
      resultClearTimer = 0;
    }
    resultsTarget.classList.remove("results-updated");
    void resultsTarget.offsetWidth;
    resultsTarget.classList.add("results-updated");
    resultClearTimer = global.setTimeout(() => {
      resultClearTimer = 0;
      resultsTarget.classList.remove("results-updated");
    }, 260);
  }

  function disconnectResultObserver() {
    if (!resultObserver) return;
    resultObserver.disconnect();
    resultObserver = null;
  }

  function startResultObserver() {
    if (!resultsTarget || !("MutationObserver" in global)) return;
    disconnectResultObserver();
    try {
      const nextObserver = new global.MutationObserver((records) => {
        if (!reduced && !pageHidden && records.length) {
          refreshDimensions();
          scheduleBackgroundUpdate();
          pulseResults();
        }
      });
      nextObserver.observe(resultsTarget, { childList: true, subtree: true, characterData: true });
      resultObserver = nextObserver;
    } catch (error) {
      resultObserver = null;
    }
  }

  function revealAll() {
    revealTargets.forEach((target) => target.classList.add("is-visible"));
  }

  function disconnectObserver() {
    if (!observer) return;
    observer.disconnect();
    observer = null;
  }

  function startSizeObserver() {
    if (!("ResizeObserver" in global)) return;
    try {
      sizeObserver = new global.ResizeObserver(() => {
        refreshDimensions();
        scheduleBackgroundUpdate();
      });
      sizeObserver.observe(document.documentElement);
      if (document.body) sizeObserver.observe(document.body);
    } catch (error) {
      sizeObserver = null;
    }
  }

  function disconnectSizeObserver() {
    if (!sizeObserver) return;
    sizeObserver.disconnect();
    sizeObserver = null;
  }

  function updatePointerListeners() {
    global.removeEventListener("pointermove", handlePointerMove);
    global.removeEventListener("pointerleave", handlePointerLeave);
    if (!reduced && !pageHidden && finePointer) {
      global.addEventListener("pointermove", handlePointerMove, { passive: true });
      global.addEventListener("pointerleave", handlePointerLeave, { passive: true });
    }
  }

  function handleFinePointerChange(event) {
    finePointer = event.matches;
    pointerX = 0;
    pointerY = 0;
    updatePointerListeners();
    scheduleBackgroundUpdate();
  }

  function startMotion() {
    disconnectObserver();
    clearResultsCue();
    root.classList.remove("motion-ready");
    root.classList.remove("motion-reduced");
    root.classList.toggle("ambient-paused", pageHidden);

    if ("IntersectionObserver" in global && revealTargets.length) {
      try {
        const nextObserver = new global.IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-visible");
            nextObserver.unobserve(entry.target);
          });
        }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
        revealTargets.forEach((target) => {
          const bounds = target.getBoundingClientRect();
          if (bounds.top < global.innerHeight && bounds.bottom > 0) {
            target.classList.add("is-visible");
          } else {
            nextObserver.observe(target);
          }
        });
        observer = nextObserver;
        root.classList.add("motion-ready");
      } catch (error) {
        revealAll();
      }
    } else {
      revealAll();
    }
    refreshDimensions();
    startSizeObserver();
    startResultObserver();
    global.addEventListener("scroll", handleScroll, { passive: true });
    global.addEventListener("resize", handleResize, { passive: true });
    updatePointerListeners();
    scheduleBackgroundUpdate();
  }

  function stopMotion() {
    root.classList.remove("motion-ready");
    root.classList.add("motion-reduced");
    root.classList.toggle("ambient-paused", pageHidden);
    revealAll();
    disconnectObserver();
    disconnectSizeObserver();
    disconnectResultObserver();
    clearResultsCue();
    if (frame) {
      global.cancelAnimationFrame(frame);
      frame = 0;
    }
    clearBackgroundTransforms();
    global.removeEventListener("scroll", handleScroll);
    global.removeEventListener("resize", handleResize);
    updatePointerListeners();
  }

  function handleVisibilityChange() {
    pageHidden = Boolean(document.hidden);
    root.classList.toggle("ambient-paused", pageHidden || reduced);
    if (pageHidden) {
      if (frame) {
        global.cancelAnimationFrame(frame);
        frame = 0;
      }
      clearResultsCue();
      clearBackgroundTransforms();
      updatePointerListeners();
    } else if (!reduced) {
      refreshDimensions();
      updatePointerListeners();
      scheduleBackgroundUpdate();
    }
  }

  function handlePreferenceChange(event) {
    reduced = event.matches;
    if (reduced) {
      stopMotion();
    } else {
      startMotion();
    }
  }

  function init() {
    document.addEventListener("visibilitychange", handleVisibilityChange);
    startIntroObserver();
    if (reduced) {
      stopMotion();
    } else {
      startMotion();
    }

    if (typeof reducedMotion.addEventListener === "function") {
      reducedMotion.addEventListener("change", handlePreferenceChange);
    } else if (typeof reducedMotion.addListener === "function") {
      reducedMotion.addListener(handlePreferenceChange);
    }
    if (typeof finePointerQuery.addEventListener === "function") {
      finePointerQuery.addEventListener("change", handleFinePointerChange);
    } else if (typeof finePointerQuery.addListener === "function") {
      finePointerQuery.addListener(handleFinePointerChange);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
}(window));
