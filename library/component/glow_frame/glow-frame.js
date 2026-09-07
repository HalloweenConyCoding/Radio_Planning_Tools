(function exposeConyGlowFrame(global) {
  function mount(root, options = {}) {
    if (!root || typeof root.addEventListener !== 'function') {
      throw new TypeError('ConyGlowFrame.mount requires an event target root');
    }
    const mode = options.mode || root.dataset.glowMode || 'auto';
    root.dataset.glowMode = mode;
    if (mode !== 'cursor') return { destroy() {} };

    const onPointerMove = (event) => {
      const rect = root.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;
      const angle = (Math.atan2(y, x) * 180 / Math.PI + 90 + 360) % 360;
      const edgeDistance = Math.min(event.clientX - rect.left, rect.right - event.clientX, event.clientY - rect.top, rect.bottom - event.clientY);
      const edgeProximity = Math.max(0, Math.min(1, 1 - edgeDistance / (Math.min(rect.width, rect.height) * 0.35)));
      root.style.setProperty('--cony-glow-frame-angle', `${angle}deg`);
      root.style.setProperty('--cony-glow-frame-opacity', `${0.18 + edgeProximity * 0.64}`);
    };
    const onPointerLeave = () => {
      root.style.removeProperty('--cony-glow-frame-angle');
      root.style.removeProperty('--cony-glow-frame-opacity');
    };
    root.addEventListener('pointermove', onPointerMove, { passive: true });
    root.addEventListener('pointerleave', onPointerLeave, { passive: true });
    return {
      destroy() {
        root.removeEventListener('pointermove', onPointerMove, { passive: true });
        root.removeEventListener('pointerleave', onPointerLeave, { passive: true });
        root.style.removeProperty('--cony-glow-frame-angle');
        root.style.removeProperty('--cony-glow-frame-opacity');
      }
    };
  }
  global.ConyGlowFrame = { mount };
}(window));
