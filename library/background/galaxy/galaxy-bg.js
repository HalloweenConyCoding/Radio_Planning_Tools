(function attachConyGalaxy(global) {
  "use strict";

  const DEFAULTS = {
    focal: [0.5, 0.5],
    rotation: [1.0, 0.0],
    starSpeed: 0,
    density: 1,
    hueShift: 30,
    disableAnimation: false,
    speed: 0.6,
    mouseInteraction: true,
    glowIntensity: 0.2,
    saturation: 0.15,
    mouseRepulsion: true,
    repulsionStrength: 1,
    twinkleIntensity: 0.1,
    rotationSpeed: 0.1,
    autoCenterRepulsion: 0,
    transparent: false,
    maxPixelRatio: 1,
    className: "cony-galaxy-canvas"
  };

  const vertexShaderSource = `
    attribute vec2 a_position;
    attribute vec2 a_uv;
    varying vec2 vUv;

    void main() {
      vUv = a_uv;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  const fragmentShaderSource = `
    precision highp float;

    uniform float uTime;
    uniform vec3 uResolution;
    uniform vec2 uFocal;
    uniform vec2 uRotation;
    uniform float uStarSpeed;
    uniform float uDensity;
    uniform float uHueShift;
    uniform float uSpeed;
    uniform vec2 uMouse;
    uniform float uGlowIntensity;
    uniform float uSaturation;
    uniform bool uMouseRepulsion;
    uniform float uTwinkleIntensity;
    uniform float uRotationSpeed;
    uniform float uRepulsionStrength;
    uniform float uMouseActiveFactor;
    uniform float uAutoCenterRepulsion;
    uniform bool uTransparent;

    varying vec2 vUv;

    #define NUM_LAYER 4.0
    #define STAR_COLOR_CUTOFF 0.2
    #define MAT45 mat2(0.7071, -0.7071, 0.7071, 0.7071)
    #define PERIOD 3.0

    float Hash21(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    float tri(float x) {
      return abs(fract(x) * 2.0 - 1.0);
    }

    float tris(float x) {
      float t = fract(x);
      return 1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0));
    }

    float trisn(float x) {
      float t = fract(x);
      return 2.0 * (1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0))) - 1.0;
    }

    vec3 hsv2rgb(vec3 c) {
      vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
      vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
      return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }

    float Star(vec2 uv, float flare) {
      float d = length(uv);
      float m = (0.05 * uGlowIntensity) / d;
      float rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
      m += rays * flare * uGlowIntensity;
      uv *= MAT45;
      rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
      m += rays * 0.3 * flare * uGlowIntensity;
      m *= smoothstep(1.0, 0.2, d);
      return m;
    }

    vec3 StarLayer(vec2 uv) {
      vec3 col = vec3(0.0);

      vec2 gv = fract(uv) - 0.5;
      vec2 id = floor(uv);

      for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
          vec2 offset = vec2(float(x), float(y));
          vec2 si = id + vec2(float(x), float(y));
          float seed = Hash21(si);
          float size = fract(seed * 345.32);
          float glossLocal = tri(uStarSpeed / (PERIOD * seed + 1.0));
          float flareSize = smoothstep(0.9, 1.0, size) * glossLocal;

          float red = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 1.0)) + STAR_COLOR_CUTOFF;
          float blu = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 3.0)) + STAR_COLOR_CUTOFF;
          float grn = min(red, blu) * seed;
          vec3 base = vec3(red, grn, blu);

          float hue = atan(base.g - base.r, base.b - base.r) / (2.0 * 3.14159) + 0.5;
          hue = fract(hue + uHueShift / 360.0);
          float sat = length(base - vec3(dot(base, vec3(0.299, 0.587, 0.114)))) * uSaturation;
          float val = max(max(base.r, base.g), base.b);
          base = hsv2rgb(vec3(hue, sat, val));

          vec2 pad = vec2(
            tris(seed * 34.0 + uTime * uSpeed / 10.0),
            tris(seed * 38.0 + uTime * uSpeed / 30.0)
          ) - 0.5;

          float star = Star(gv - offset - pad, flareSize);
          float twinkle = trisn(uTime * uSpeed + seed * 6.2831) * 0.5 + 1.0;
          twinkle = mix(1.0, twinkle, uTwinkleIntensity);
          star *= twinkle;

          col += star * size * base;
        }
      }

      return col;
    }

    void main() {
      vec2 focalPx = uFocal * uResolution.xy;
      vec2 uv = (vUv * uResolution.xy - focalPx) / uResolution.y;
      vec2 mouseNorm = uMouse - vec2(0.5);

      if (uAutoCenterRepulsion > 0.0) {
        vec2 centerUV = vec2(0.0, 0.0);
        float centerDist = length(uv - centerUV);
        vec2 repulsion = normalize(uv - centerUV) * (uAutoCenterRepulsion / (centerDist + 0.1));
        uv += repulsion * 0.05;
      } else if (uMouseRepulsion) {
        vec2 mousePosUV = (uMouse * uResolution.xy - focalPx) / uResolution.y;
        float mouseDist = length(uv - mousePosUV);
        vec2 repulsion = normalize(uv - mousePosUV) * (uRepulsionStrength / (mouseDist + 0.1));
        uv += repulsion * 0.05 * uMouseActiveFactor;
      } else {
        vec2 mouseOffset = mouseNorm * 0.1 * uMouseActiveFactor;
        uv += mouseOffset;
      }

      float autoRotAngle = uTime * uRotationSpeed;
      mat2 autoRot = mat2(cos(autoRotAngle), -sin(autoRotAngle), sin(autoRotAngle), cos(autoRotAngle));
      uv = autoRot * uv;
      uv = mat2(uRotation.x, -uRotation.y, uRotation.y, uRotation.x) * uv;

      vec3 col = vec3(0.0);

      for (float i = 0.0; i < 1.0; i += 1.0 / NUM_LAYER) {
        float depth = fract(i + uStarSpeed * uSpeed);
        float scale = mix(20.0 * uDensity, 0.5 * uDensity, depth);
        float fade = depth * smoothstep(1.0, 0.9, depth);
        col += StarLayer(uv * scale + i * 453.32) * fade;
      }

      if (uTransparent) {
        float alpha = length(col);
        alpha = smoothstep(0.0, 0.3, alpha);
        alpha = min(alpha, 1.0);
        gl_FragColor = vec4(col, alpha);
      } else {
        gl_FragColor = vec4(col, 1.0);
      }
    }
  `;

  function resolveTarget(target) {
    if (typeof target === "string") return document.querySelector(target);
    return target;
  }

  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(message || "Unable to compile galaxy shader.");
    }

    return shader;
  }

  function createProgram(gl, vertexSource, fragmentSource) {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const message = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(message || "Unable to link galaxy shader program.");
    }

    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    return program;
  }

  function create(target, options) {
    const container = resolveTarget(target);
    if (!container) throw new Error("ConyGalaxy target was not found.");

    const settings = Object.assign({}, DEFAULTS, options || {});
    const canvas = document.createElement("canvas");
    canvas.className = settings.className;
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.cursor = settings.mouseInteraction ? "crosshair" : "default";

    if (getComputedStyle(container).position === "static") {
      container.style.position = "relative";
    }

    container.appendChild(canvas);

    const gl = canvas.getContext("webgl", {
      alpha: settings.transparent,
      premultipliedAlpha: false,
      antialias: true
    });

    if (!gl) {
      canvas.remove();
      throw new Error("WebGL is not available in this browser.");
    }

    if (settings.transparent) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);
    } else {
      gl.clearColor(0, 0, 0, 1);
    }

    const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    const positionLocation = gl.getAttribLocation(program, "a_position");
    const uvLocation = gl.getAttribLocation(program, "a_uv");
    const uniforms = {
      time: gl.getUniformLocation(program, "uTime"),
      resolution: gl.getUniformLocation(program, "uResolution"),
      focal: gl.getUniformLocation(program, "uFocal"),
      rotation: gl.getUniformLocation(program, "uRotation"),
      starSpeed: gl.getUniformLocation(program, "uStarSpeed"),
      density: gl.getUniformLocation(program, "uDensity"),
      hueShift: gl.getUniformLocation(program, "uHueShift"),
      speed: gl.getUniformLocation(program, "uSpeed"),
      mouse: gl.getUniformLocation(program, "uMouse"),
      glowIntensity: gl.getUniformLocation(program, "uGlowIntensity"),
      saturation: gl.getUniformLocation(program, "uSaturation"),
      mouseRepulsion: gl.getUniformLocation(program, "uMouseRepulsion"),
      twinkleIntensity: gl.getUniformLocation(program, "uTwinkleIntensity"),
      rotationSpeed: gl.getUniformLocation(program, "uRotationSpeed"),
      repulsionStrength: gl.getUniformLocation(program, "uRepulsionStrength"),
      mouseActiveFactor: gl.getUniformLocation(program, "uMouseActiveFactor"),
      autoCenterRepulsion: gl.getUniformLocation(program, "uAutoCenterRepulsion"),
      transparent: gl.getUniformLocation(program, "uTransparent")
    };

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1, -1, 0, 0,
         1, -1, 1, 0,
        -1,  1, 0, 1,
        -1,  1, 0, 1,
         1, -1, 1, 0,
         1,  1, 1, 1
      ]),
      gl.STATIC_DRAW
    );

    const targetMouse = { x: 0.5, y: 0.5 };
    const smoothMouse = { x: 0.5, y: 0.5 };
    const targetActive = { value: 0 };
    const smoothActive = { value: 0 };
    const state = {
      destroyed: false,
      paused: false,
      rafId: 0,
      startTime: performance.now()
    };

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(global.devicePixelRatio || 1, settings.maxPixelRatio);
      const width = Math.max(1, Math.floor(rect.width * dpr));
      const height = Math.max(1, Math.floor(rect.height * dpr));

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    function updateMouse(event) {
      if (!settings.mouseInteraction) return;
      const rect = canvas.getBoundingClientRect();
      targetMouse.x = (event.clientX - rect.left) / rect.width;
      targetMouse.y = 1 - (event.clientY - rect.top) / rect.height;
      targetActive.value = 1;
    }

    function onPointerLeave() {
      targetActive.value = 0;
    }

    function render(now) {
      if (state.destroyed) return;

      resize();

      const timeSeconds = settings.disableAnimation ? 0 : (now - state.startTime) * 0.001;
      smoothMouse.x += (targetMouse.x - smoothMouse.x) * 0.05;
      smoothMouse.y += (targetMouse.y - smoothMouse.y) * 0.05;
      smoothActive.value += (targetActive.value - smoothActive.value) * 0.05;

      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 16, 0);

      gl.enableVertexAttribArray(uvLocation);
      gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, 16, 8);

      gl.uniform1f(uniforms.time, timeSeconds);
      gl.uniform3f(uniforms.resolution, canvas.width, canvas.height, canvas.width / canvas.height);
      gl.uniform2f(uniforms.focal, settings.focal[0], settings.focal[1]);
      gl.uniform2f(uniforms.rotation, settings.rotation[0], settings.rotation[1]);
      gl.uniform1f(uniforms.starSpeed, settings.disableAnimation ? 0 : (timeSeconds * settings.starSpeed) / 10);
      gl.uniform1f(uniforms.density, settings.density);
      gl.uniform1f(uniforms.hueShift, settings.hueShift);
      gl.uniform1f(uniforms.speed, settings.speed);
      gl.uniform2f(uniforms.mouse, smoothMouse.x, smoothMouse.y);
      gl.uniform1f(uniforms.glowIntensity, settings.glowIntensity);
      gl.uniform1f(uniforms.saturation, settings.saturation);
      gl.uniform1i(uniforms.mouseRepulsion, settings.mouseRepulsion ? 1 : 0);
      gl.uniform1f(uniforms.twinkleIntensity, settings.twinkleIntensity);
      gl.uniform1f(uniforms.rotationSpeed, settings.rotationSpeed);
      gl.uniform1f(uniforms.repulsionStrength, settings.repulsionStrength);
      gl.uniform1f(uniforms.mouseActiveFactor, smoothActive.value);
      gl.uniform1f(uniforms.autoCenterRepulsion, settings.autoCenterRepulsion);
      gl.uniform1i(uniforms.transparent, settings.transparent ? 1 : 0);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      if (!state.paused) {
        state.rafId = requestAnimationFrame(render);
      }
    }

    function pause() {
      state.paused = true;
      cancelAnimationFrame(state.rafId);
    }

    function resume() {
      if (state.destroyed || !state.paused) return;
      state.paused = false;
      state.startTime = performance.now();
      state.rafId = requestAnimationFrame(render);
    }

    function setOptions(nextOptions) {
      Object.assign(settings, nextOptions || {});
      canvas.style.cursor = settings.mouseInteraction ? "crosshair" : "default";
    }

    function destroy() {
      state.destroyed = true;
      cancelAnimationFrame(state.rafId);
      global.removeEventListener("resize", resize);
      canvas.removeEventListener("pointermove", updateMouse);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.remove();
      gl.deleteBuffer(vertexBuffer);
      gl.deleteProgram(program);
    }

    global.addEventListener("resize", resize);
    canvas.addEventListener("pointermove", updateMouse, { passive: true });
    canvas.addEventListener("pointerleave", onPointerLeave);

    resize();
    state.rafId = requestAnimationFrame(render);

    return {
      canvas,
      pause,
      resume,
      setOptions,
      destroy
    };
  }

  global.ConyGalaxy = {
    create,
    defaults: Object.assign({}, DEFAULTS)
  };
})(window);
