(() => {
  'use strict';

  const reduceMq = matchMedia('(prefers-reduced-motion: reduce)');
  const fineMq = matchMedia('(hover: hover) and (pointer: fine)');

  const sync = () => document.documentElement.classList.toggle('reduced', reduceMq.matches);
  sync();
  reduceMq.addEventListener?.('change', sync);

  const reduced = () => reduceMq.matches;
  const finePointer = () => fineMq.matches;
  const EASE = 'cubic-bezier(.2,.7,.1,1)';

  /** Web Animations helper that collapses to ~instant when reduced motion is on. */
  function animate(el, keyframes, opts = {}) {
    const o = { fill: 'forwards', easing: EASE, ...opts };
    if (reduced()) { o.duration = 1; o.delay = 0; }
    const a = el.animate(keyframes, o);
    return a.finished.then(() => a).catch(() => a);
  }

  /** requestAnimationFrame loop that can be started/stopped (used only while visible). */
  function ticker(fn) {
    let id = 0;
    let running = false;
    const loop = (t) => {
      if (!running) return;
      fn(t);
      id = requestAnimationFrame(loop);
    };
    return {
      start() { if (!running) { running = true; id = requestAnimationFrame(loop); } },
      stop() { running = false; cancelAnimationFrame(id); },
      get running() { return running; },
    };
  }

  /** Runs onIn / onOut when an element enters / leaves the viewport. Returns a disposer. */
  function watch(el, onIn, onOut, opts = {}) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? onIn?.(e) : onOut?.(e)));
    }, opts);
    io.observe(el);
    return () => io.disconnect();
  }

  /** 0 → 1 progress of an element travelling through the viewport. */
  function scrollProgress(el) {
    const r = el.getBoundingClientRect();
    const total = r.height - innerHeight;
    if (total <= 0) return r.top <= 0 ? 1 : 0;
    return Math.min(1, Math.max(0, -r.top / total));
  }

  AFTERIMAGE['utils/motion'] = { reduced, finePointer, EASE, animate, ticker, watch, scrollProgress };
})();
