(function initTiltCalculatorMotion(global) {
  "use strict";

  const document = global.document;
  if (!document) return;

  const root = document.documentElement;
  const reducedMotion = global.matchMedia("(prefers-reduced-motion: reduce)");
  const revealTargets = Array.from(document.querySelectorAll(".reveal-section"));
  const resultsTarget = document.getElementById("results");
  let reduced = reducedMotion.matches;
  let pageHidden = Boolean(document.hidden);
  let frame = 0;
  let observer = null;
  let resultObserver = null;
  let resultClearTimer = 0;

  function setPaperShift(scrollY) {
    const scrollableHeight = Math.max(document.documentElement.scrollHeight - global.innerHeight, 1);
    const progress = Math.min(Math.max((scrollY || 0) / scrollableHeight, 0), 1);
    root.style.setProperty("--paper-shift-top", `${Math.round(progress * -8)}px`);
    root.style.setProperty("--paper-shift-far", `${Math.round(progress * -20)}px`);
    root.style.setProperty("--paper-shift-mid", `${Math.round(progress * -62)}px`);
    root.style.setProperty("--paper-shift-near", `${Math.round(progress * -112)}px`);
  }

  function updatePaperShift() {
    frame = 0;
    setPaperShift(global.scrollY);
  }

  function handleScroll() {
    if (reduced || pageHidden || frame) return;
    frame = global.requestAnimationFrame(updatePaperShift);
  }

  function clearResultsCue() {
    if (resultClearTimer) {
      global.clearTimeout(resultClearTimer);
      resultClearTimer = 0;
    }
    if (resultsTarget) resultsTarget.classList.remove("results-updated");
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
        if (!reduced && records.length) pulseResults();
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
    startResultObserver();
    global.addEventListener("scroll", handleScroll, { passive: true });
    global.addEventListener("resize", handleScroll, { passive: true });
    handleScroll();
  }

  function stopMotion() {
    root.classList.remove("motion-ready");
    root.classList.add("motion-reduced");
    root.classList.toggle("ambient-paused", pageHidden);
    revealAll();
    disconnectObserver();
    disconnectResultObserver();
    clearResultsCue();
    if (frame) {
      global.cancelAnimationFrame(frame);
      frame = 0;
    }
    root.style.setProperty("--paper-shift-top", "0px");
    root.style.setProperty("--paper-shift-far", "0px");
    root.style.setProperty("--paper-shift-mid", "0px");
    root.style.setProperty("--paper-shift-near", "0px");
    global.removeEventListener("scroll", handleScroll);
    global.removeEventListener("resize", handleScroll);
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
    } else if (!reduced) {
      handleScroll();
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
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
}(window));
