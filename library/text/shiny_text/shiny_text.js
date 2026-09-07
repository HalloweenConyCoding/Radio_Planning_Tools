(function initShinyTextLibrary(global) {
  "use strict";

  const defaults = {
    disabled: false,
    speed: 2,
    className: "",
    color: "#b5b5b5",
    shineColor: "#ffffff",
    spread: 120,
    yoyo: false,
    pauseOnHover: false,
    direction: "left",
    delay: 0
  };

  function toCssValue(value, fallback) {
    return value === undefined || value === null || value === "" ? fallback : String(value);
  }

  function toBoolean(value, fallback) {
    if (value === undefined || value === null || value === "") return fallback;
    return value === true || value === "true" || value === "1";
  }

  function readDataOptions(element) {
    const data = element.dataset || {};
    const options = {};
    if (data.shinyText) options.text = data.shinyText;
    if (data.shinyDisabled) options.disabled = toBoolean(data.shinyDisabled, false);
    if (data.shinySpeed) options.speed = Number(data.shinySpeed);
    if (data.shinyClass) options.className = data.shinyClass;
    if (data.shinyColor) options.color = data.shinyColor;
    if (data.shinyColorShine) options.shineColor = data.shinyColorShine;
    if (data.shinySpread) options.spread = Number(data.shinySpread);
    if (data.shinyYoyo) options.yoyo = toBoolean(data.shinyYoyo, false);
    if (data.shinyPauseOnHover) options.pauseOnHover = toBoolean(data.shinyPauseOnHover, false);
    if (data.shinyDirection) options.direction = data.shinyDirection;
    if (data.shinyDelay) options.delay = Number(data.shinyDelay);
    return options;
  }

  class ShinyText {
    constructor(element, options = {}) {
      if (!element) throw new Error("ShinyText requires an element.");

      this.element = element;
      this.options = { ...defaults, ...readDataOptions(element), ...options };
      this.handleEnter = this.handleEnter.bind(this);
      this.handleLeave = this.handleLeave.bind(this);
      this.apply();
    }

    apply() {
      const { element, options } = this;
      if (options.text !== undefined) element.textContent = options.text;
      if (options.className) {
        options.className.split(/\s+/).filter(Boolean).forEach((name) => element.classList.add(name));
      }

      element.classList.add("shiny-text");
      element.dataset.shinyText = "true";
      element.dataset.shinyDirection = options.direction === "right" ? "right" : "left";
      element.dataset.shinyYoyo = options.yoyo ? "true" : "false";
      element.style.setProperty("--shiny-color", toCssValue(options.color, defaults.color));
      element.style.setProperty("--shiny-color-shine", toCssValue(options.shineColor, defaults.shineColor));
      element.style.setProperty("--shiny-spread", `${Number(options.spread) || defaults.spread}deg`);
      element.style.setProperty("--shiny-duration", `${Math.max(Number(options.speed) || defaults.speed, 0.1)}s`);
      element.style.setProperty("--shiny-delay", `${Math.max(Number(options.delay) || 0, 0)}s`);
      element.classList.toggle("shiny-text--disabled", Boolean(options.disabled));
      element.classList.toggle("shiny-text--pause-on-hover", Boolean(options.pauseOnHover));

      if (options.pauseOnHover) {
        element.addEventListener("mouseenter", this.handleEnter);
        element.addEventListener("mouseleave", this.handleLeave);
      }
    }

    handleEnter() {
      this.element.style.animationPlayState = "paused";
    }

    handleLeave() {
      this.element.style.animationPlayState = "running";
    }

    setOptions(nextOptions = {}) {
      if (this.options.pauseOnHover) {
        this.element.removeEventListener("mouseenter", this.handleEnter);
        this.element.removeEventListener("mouseleave", this.handleLeave);
      }
      this.options = { ...this.options, ...nextOptions };
      this.apply();
    }

    destroy() {
      this.element.removeEventListener("mouseenter", this.handleEnter);
      this.element.removeEventListener("mouseleave", this.handleLeave);
      this.element.classList.remove("shiny-text", "shiny-text--disabled", "shiny-text--pause-on-hover");
      delete this.element.dataset.shinyTextInitialized;
      ["--shiny-color", "--shiny-color-shine", "--shiny-spread", "--shiny-duration", "--shiny-delay"].forEach((name) => {
        this.element.style.removeProperty(name);
      });
      this.element.style.removeProperty("animation-play-state");
    }
  }

  global.ShinyText = ShinyText;
  global.initShinyTexts = function initShinyTexts(selector = "[data-shiny-text]") {
    const instances = [];
    document.querySelectorAll(selector).forEach((element) => {
      if (element.__shinyText) {
        instances.push(element.__shinyText);
        return;
      }
      const instance = new ShinyText(element);
      element.__shinyText = instance;
      element.dataset.shinyTextInitialized = "true";
      instances.push(instance);
    });
    return instances;
  };

  if (global.document) {
    const init = () => global.initShinyTexts();
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
      init();
    }
  }
}(window));
