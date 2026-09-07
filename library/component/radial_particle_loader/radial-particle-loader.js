(function installConyRadialParticleLoader(global) {
  'use strict';

  var DEFAULT_PARTICLE_COUNT = 220;
  var DEFAULT_MORPH_CYCLE_MS = 7000;
  var DEFAULT_SPEED = 1.5;
  var DEFAULT_SIZE = 110;
  var SPHERE_RADIUS = 0.78;
  var CUBE_HALF_SIZE = 0.82;
  var PALETTE = [
    [50, 220, 255],
    [70, 170, 255],
    [100, 115, 255],
    [150, 90, 255],
    [220, 85, 255],
    [255, 90, 190],
    [255, 110, 130],
    [255, 145, 70],
    [255, 195, 70],
    [225, 225, 85],
    [110, 220, 130],
    [65, 215, 185]
  ];

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function copyPalette(palette) {
    return palette.map(function copyColor(color) { return color.slice(); });
  }

  function isPositiveNumber(value) {
    return value !== null && value !== '' && typeof value !== 'boolean' && Number.isFinite(Number(value)) && Number(value) > 0;
  }

  function normalizeParticleCount(value) {
    return isPositiveNumber(value) ? Math.max(1, Math.floor(Number(value))) : DEFAULT_PARTICLE_COUNT;
  }

  function normalizePositiveOption(value, fallback) {
    return isPositiveNumber(value) ? Number(value) : fallback;
  }

  function normalizePalette(value) {
    if (!Array.isArray(value)) return copyPalette(PALETTE);
    var validColors = value.filter(function isValidColor(color) {
      return Array.isArray(color) && color.length >= 3 && color.slice(0, 3).every(function isRgbChannel(channel) {
        return typeof channel === 'number' && Number.isFinite(channel) && channel >= 0 && channel <= 255;
      });
    }).map(function normalizeColor(color) {
      return color.slice(0, 3).map(function roundChannel(channel) { return Math.round(channel); });
    });
    return validColors.length ? validColors : copyPalette(PALETTE);
  }

  function normalizeOptions(options) {
    var config = options || {};
    var speed = normalizePositiveOption(config.speed, DEFAULT_SPEED);
    var morphCycle = normalizePositiveOption(config.morphCycle, DEFAULT_MORPH_CYCLE_MS);
    var paletteValue = config.palette !== undefined ? config.palette : config.colors;
    return {
      particleCount: normalizeParticleCount(config.particleCount),
      size: normalizePositiveOption(config.size, DEFAULT_SIZE),
      speed: speed,
      morphCycle: morphCycle,
      effectiveMorphCycle: morphCycle / speed,
      palette: normalizePalette(paletteValue)
    };
  }

  function smoothstep(value) {
    var t = clamp(value, 0, 1);
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  function cubeRadius(direction) {
    return CUBE_HALF_SIZE / Math.max(
      Math.abs(direction.x),
      Math.abs(direction.y),
      Math.abs(direction.z)
    );
  }

  function getMorphProgress(time, cycle) {
    var phase = (time % cycle) / cycle;
    if (phase < 0.16) return 0;
    if (phase < 0.42) return smoothstep((phase - 0.16) / 0.26);
    if (phase < 0.58) return 1;
    if (phase < 0.84) return 1 - smoothstep((phase - 0.58) / 0.26);
    return 0;
  }

  function rotate3D(x, y, z, rotX, rotY, rotZ) {
    var cosine = Math.cos(rotX);
    var sine = Math.sin(rotX);
    var rotatedY = y * cosine - z * sine;
    var rotatedZ = y * sine + z * cosine;
    y = rotatedY;
    z = rotatedZ;

    cosine = Math.cos(rotY);
    sine = Math.sin(rotY);
    var rotatedX = x * cosine + z * sine;
    rotatedZ = -x * sine + z * cosine;
    x = rotatedX;
    z = rotatedZ;

    cosine = Math.cos(rotZ);
    sine = Math.sin(rotZ);
    rotatedX = x * cosine - y * sine;
    rotatedY = x * sine + y * cosine;
    return { x: rotatedX, y: rotatedY, z: z };
  }

  function isUsableContext(value) {
    return !!value && typeof value.clearRect === 'function' && typeof value.beginPath === 'function' && typeof value.arc === 'function' && typeof value.fill === 'function';
  }

  function create(target, options) {
    if (!target || !target.ownerDocument || typeof target.appendChild !== 'function') {
      return null;
    }

    var config = options || {};
    var normalized = normalizeOptions(config);
    var documentRef = target.ownerDocument;
    var windowRef = documentRef.defaultView || global;
    if (!documentRef || typeof documentRef.createElement !== 'function') {
      return null;
    }

    var root = documentRef.createElement('div');
    var canvas = documentRef.createElement('canvas');
    var label = documentRef.createElement('div');
    var context = null;
    var destroyed = false;
    var paused = false;
    var running = false;
    var frameId = null;
    var lastTimestamp = null;
    var animationTime = 0;
    var isIntersecting = true;
    var mediaQuery = null;
    var intersectionObserver = null;
    var particleCount = normalized.particleCount;
    var size = normalized.size;
    var speed = normalized.speed;
    var morphCycle = normalized.effectiveMorphCycle;
    var palette = normalized.palette;
    var visibleLabel = config.label === false
      ? ''
      : config.label === undefined
        ? 'Saving changes...'
        : String(config.label);
    var targetAriaLabel = typeof target.getAttribute === 'function'
      ? target.getAttribute('aria-label')
      : null;
    var ariaLabel = config.ariaLabel !== undefined
      ? String(config.ariaLabel)
      : targetAriaLabel || visibleLabel || 'Saving changes...';
    var directions = [];
    var particles = [];
    var seed = 48271;

    function random() {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    }

    function buildParticles() {
      for (var index = 0; index < particleCount; index += 1) {
        var y = particleCount === 1 ? 0 : 1 - (index / (particleCount - 1)) * 2;
        var horizontalRadius = Math.sqrt(Math.max(0, 1 - y * y));
        var theta = Math.PI * (3 - Math.sqrt(5)) * index;
        directions.push({
          x: Math.cos(theta) * horizontalRadius,
          y: y,
          z: Math.sin(theta) * horizontalRadius
        });
        particles.push({
          color: palette[index % palette.length],
          size: 0.65 + random() * 1.15,
          opacity: 0.45 + random() * 0.5
        });
      }
    }

    function render(time) {
      if (!context || typeof context.clearRect !== 'function') return;
      context.clearRect(0, 0, size, size);
      var motionTime = time * speed;
      var morph = getMorphProgress(time, morphCycle);
      var rotX = -0.35 + Math.sin(motionTime * 0.00022) * 0.10;
      var rotY = motionTime * 0.00040;
      var rotZ = 0.15 + Math.sin(motionTime * 0.00015) * 0.08;
      var projected = [];
      var cameraDistance = 4.2;
      var scale = 29 * (size / DEFAULT_SIZE);
      var center = size / 2;

      for (var index = 0; index < particleCount; index += 1) {
        var direction = directions[index];
        var radius = SPHERE_RADIUS + (cubeRadius(direction) - SPHERE_RADIUS) * morph;
        var rotated = rotate3D(
          direction.x * radius,
          direction.y * radius,
          direction.z * radius,
          rotX,
          rotY,
          rotZ
        );
        var perspective = cameraDistance / (cameraDistance - rotated.z);
        projected.push({
          index: index,
          z: rotated.z,
          x: center + rotated.x * scale * perspective,
          y: center + rotated.y * scale * perspective,
          perspective: perspective
        });
      }

      projected.sort(function sortByDepth(first, second) { return first.z - second.z; });
      projected.forEach(function drawParticle(point) {
        var particle = particles[point.index];
        var depth = clamp((point.z + 1.3) / 2.6, 0, 1);
        var radius = particle.size * (0.65 + depth * 0.75) * point.perspective;
        var alpha = particle.opacity * (0.32 + depth * 0.76);
        var color = particle.color;
        if (typeof context.beginPath !== 'function' || typeof context.arc !== 'function' || typeof context.fill !== 'function') return;
        context.beginPath();
        context.arc(point.x, point.y, Math.max(0.45, radius), 0, Math.PI * 2);
        context.fillStyle = 'rgba(' + color[0] + ', ' + color[1] + ', ' + color[2] + ', ' + Math.min(0.98, alpha) + ')';
        context.fill();
      });
    }

    function shouldRun() {
      return !destroyed && !paused && !(mediaQuery && mediaQuery.matches) && !documentRef.hidden && isIntersecting && !!context;
    }

    function stopLoop() {
      if (frameId !== null && typeof windowRef.cancelAnimationFrame === 'function') {
        windowRef.cancelAnimationFrame(frameId);
      }
      frameId = null;
      running = false;
      lastTimestamp = null;
    }

    function schedule() {
      if (!shouldRun() || frameId !== null || typeof windowRef.requestAnimationFrame !== 'function') {
        running = false;
        return;
      }
      running = true;
      frameId = windowRef.requestAnimationFrame(function onFrame(timestamp) {
        frameId = null;
        if (!shouldRun()) {
          stopLoop();
          return;
        }
        if (lastTimestamp !== null) {
          animationTime += Math.max(0, Math.min(100, timestamp - lastTimestamp));
        }
        lastTimestamp = timestamp;
        render(animationTime);
        schedule();
      });
    }

    function updateScheduling() {
      if (shouldRun()) schedule();
      else stopLoop();
    }

    function onVisibilityChange() {
      updateScheduling();
    }

    function onMotionPreferenceChange() {
      render(animationTime);
      updateScheduling();
    }

    function onIntersection(entries) {
      isIntersecting = !entries || !entries.length || entries[0].isIntersecting !== false;
      updateScheduling();
    }

    root.className = 'cony-radial-particle-loader';
    canvas.className = 'cony-radial-particle-loader-canvas';
    label.className = 'cony-radial-particle-loader-label';
    canvas.width = Math.round(size * Math.min(Number(windowRef.devicePixelRatio) || 1, 2));
    canvas.height = canvas.width;
    if (canvas.style) {
      canvas.style.width = size + 'px';
      canvas.style.height = size + 'px';
    }
    if (typeof canvas.setAttribute === 'function') {
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', ariaLabel);
    }
    label.textContent = visibleLabel;
    if (visibleLabel === '') label.hidden = true;
    root.appendChild(canvas);
    root.appendChild(label);
    target.innerHTML = '';
    target.appendChild(root);

    if (typeof canvas.getContext === 'function') {
      try {
        var candidateContext = canvas.getContext('2d');
        context = isUsableContext(candidateContext) ? candidateContext : null;
      } catch (error) {
        context = null;
      }
    }
    if (context && typeof context.setTransform === 'function') {
      var dpr = Math.min(Number(windowRef.devicePixelRatio) || 1, 2);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    } else if (context && typeof context.scale === 'function') {
      context.scale(Math.min(Number(windowRef.devicePixelRatio) || 1, 2), Math.min(Number(windowRef.devicePixelRatio) || 1, 2));
    }

    buildParticles();
    render(0);

    if (typeof documentRef.addEventListener === 'function') {
      documentRef.addEventListener('visibilitychange', onVisibilityChange);
    }

    if (typeof windowRef.matchMedia === 'function') {
      mediaQuery = windowRef.matchMedia('(prefers-reduced-motion: reduce)');
      if (mediaQuery && typeof mediaQuery.addEventListener === 'function') mediaQuery.addEventListener('change', onMotionPreferenceChange);
      else if (mediaQuery && typeof mediaQuery.addListener === 'function') mediaQuery.addListener(onMotionPreferenceChange);
    }

    if (typeof windowRef.IntersectionObserver === 'function') {
      intersectionObserver = new windowRef.IntersectionObserver(onIntersection);
      intersectionObserver.observe(target);
    }

    var handle = {
      pause: function pause() {
        if (destroyed) return;
        paused = true;
        stopLoop();
      },
      resume: function resume() {
        if (destroyed) return;
        paused = false;
        updateScheduling();
      },
      destroy: function destroy() {
        if (destroyed) return;
        destroyed = true;
        stopLoop();
        if (intersectionObserver && typeof intersectionObserver.disconnect === 'function') intersectionObserver.disconnect();
        if (typeof documentRef.removeEventListener === 'function') documentRef.removeEventListener('visibilitychange', onVisibilityChange);
        if (mediaQuery && typeof mediaQuery.removeEventListener === 'function') mediaQuery.removeEventListener('change', onMotionPreferenceChange);
        else if (mediaQuery && typeof mediaQuery.removeListener === 'function') mediaQuery.removeListener(onMotionPreferenceChange);
        target.innerHTML = '';
      },
      isRunning: function isRunning() {
        return running;
      }
    };

    updateScheduling();
    return handle;
  }

  global.ConyRadialParticleLoader = {
    create: create,
    testing: {
      particleCount: DEFAULT_PARTICLE_COUNT,
      speed: DEFAULT_SPEED,
      motionMultiplier: DEFAULT_SPEED,
      morphCycle: DEFAULT_MORPH_CYCLE_MS,
      morphCycleMs: DEFAULT_MORPH_CYCLE_MS / DEFAULT_SPEED,
      defaultPalette: copyPalette(PALETTE),
      normalizeOptions: normalizeOptions
    }
  };
}(typeof window !== 'undefined' ? window : this));
