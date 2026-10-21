// 00 — THE OBJECT
// A monumental, partly cropped photograph (Look 1 = Object Nº 001). Layers drift with the
// cursor; a lens reveals the negative of the image (a retinal after-image); a lagging
// ghost trails behind; the title fragments near the cursor. Clicking ENTER pushes into the image.
(() => {
  'use strict';

  const { $, $$, Bag, h, lerp } = AFTERIMAGE['utils/dom'];
  const { reduced, finePointer, ticker, watch, animate } = AFTERIMAGE['utils/motion'];
  const { play } = AFTERIMAGE['components/sound'];

  const INTRO_KEY = 'after-image:intro-seen';

  function splitTitle(el) {
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    words.forEach((word) => {
      const w = h('span', { class: 'w', 'aria-hidden': 'true' });
      [...word].forEach((c) => w.append(h('span', { class: 'ch' }, c)));
      el.append(w);
    });
    return $$('.ch', el);
  }

  function runIntro(chars) {
    const intro = $('[data-intro]');
    let seen = false;
    try { seen = sessionStorage.getItem(INTRO_KEY) === '1'; } catch { /* ignore */ }
    if (!intro || seen || reduced()) return;

    intro.hidden = false;
    const count = $('[data-intro-count]', intro);
    const rule = $('.intro__rule', intro);
    const line = $('.intro__line', intro);
    const skipBtn = $('[data-skip-intro]', intro);
    const anims = [];
    let raf = 0;
    let done = false;
    chars.forEach((c) => { c.style.opacity = '0'; });

    const finish = () => {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      anims.forEach((a) => a.cancel());
      intro.hidden = true;
      chars.forEach((c) => { c.style.opacity = ''; });
      try { sessionStorage.setItem(INTRO_KEY, '1'); } catch { /* ignore */ }
      window.removeEventListener('keydown', onKey);
    };
    const onKey = (e) => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); finish(); } };
    window.addEventListener('keydown', onKey);
    skipBtn.addEventListener('click', finish, { once: true });

    const t0 = performance.now();
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / 950);
      count.textContent = String(Math.max(1, Math.round(1 + 75 * (1 - (1 - k) ** 3)))).padStart(3, '0');
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    anims.push(rule.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 800, delay: 250, easing: 'cubic-bezier(.7,0,.2,1)', fill: 'forwards' }));
    anims.push(line.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: 700, fill: 'forwards' }));
    const wipe = intro.animate(
      [{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(0 0 100% 0)' }],
      { duration: 800, delay: 1500, easing: 'cubic-bezier(.7,0,.2,1)', fill: 'forwards' },
    );
    anims.push(wipe);
    chars.forEach((c, i) => {
      anims.push(c.animate(
        [{ opacity: 0, transform: 'translateY(.35em)' }, { opacity: 1, transform: 'none' }],
        { duration: 900, delay: 1750 + i * 32, easing: 'cubic-bezier(.2,.7,.1,1)', fill: 'backwards' },
      ));
    });
    wipe.finished.then(() => setTimeout(finish, 900)).catch(() => {});
  }

  function initOpening() {
    const sec = $('#object');
    if (!sec) return;
    const fig = $('[data-opening-figure]', sec);
    const ghost = $('[data-opening-ghost]', sec);
    const tex = $('[data-opening-texture]', sec);
    const title = $('[data-split-title]', sec);
    const enter = $('[data-enter]', sec);
    const chars = splitTitle(title);
    const bag = new Bag();

    runIntro(chars);

    // ---- pointer-driven layers ------------------------------------------------
    const target = { x: 0, y: 0, r: 0 };
    const cur = { x: 0, y: 0, gx: 0, gy: 0, r: 0 };
    let pointer = null;
    let charBoxes = [];
    let lensTimer = 0;

    const measure = () => {
      charBoxes = chars.map((c) => {
        const r = c.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
    };

    const setLens = (clientX, clientY, on) => {
      const r = fig.getBoundingClientRect();
      sec.style.setProperty('--mx', `${((clientX - r.left) / r.width) * 100}%`);
      sec.style.setProperty('--my', `${((clientY - r.top) / r.height) * 100}%`);
      const inside = clientX > r.left && clientX < r.right && clientY > r.top && clientY < r.bottom;
      target.r = on && inside ? Math.min(innerWidth, innerHeight) * 0.2 : 0;
    };

    const loop = ticker(() => {
      cur.x = lerp(cur.x, target.x, 0.075);
      cur.y = lerp(cur.y, target.y, 0.075);
      cur.gx = lerp(cur.gx, target.x, 0.025); // the ghost lags: an after-image
      cur.gy = lerp(cur.gy, target.y, 0.025);
      cur.r = lerp(cur.r, target.r, 0.12);
      fig.style.transform = `translate3d(${cur.x * -14}px, ${cur.y * -10}px, 0)`;
      ghost.style.transform = `translate3d(${cur.gx * 46 + 18}px, ${cur.gy * 30 + 6}px, 0)`;
      tex.style.transform = `translate3d(${cur.x * 8}px, ${cur.y * 6}px, 0)`;
      sec.style.setProperty('--r', `${cur.r.toFixed(1)}px`);

      if (pointer && charBoxes.length) {
        chars.forEach((c, i) => {
          const b = charBoxes[i];
          const dx = b.x - pointer.x;
          const dy = b.y - pointer.y;
          const d = Math.hypot(dx, dy);
          const R = 220;
          if (d < R) {
            const k = (1 - d / R) ** 2;
            const sliceTop = Math.round(k * 38);
            c.style.transform = `translate(${(dx / (d || 1)) * k * 16}px, ${(dy / (d || 1)) * k * 12}px) skewX(${k * -8}deg)`;
            c.style.clipPath = `inset(${sliceTop}% 0 0 0)`;
          } else if (c.style.transform) {
            c.style.transform = '';
            c.style.clipPath = '';
          }
        });
      }
    });

    if (finePointer() && !reduced()) {
      bag.on(sec, 'pointermove', (e) => {
        target.x = (e.clientX / innerWidth) * 2 - 1;
        target.y = (e.clientY / innerHeight) * 2 - 1;
        pointer = { x: e.clientX, y: e.clientY };
        setLens(e.clientX, e.clientY, true);
      });
      bag.on(sec, 'pointerleave', () => {
        target.x = 0; target.y = 0; target.r = 0; pointer = null;
        chars.forEach((c) => { c.style.transform = ''; c.style.clipPath = ''; });
      });
      bag.on(window, 'resize', measure);
      bag.on(window, 'scroll', measure, { passive: true });
      measure();
      bag.add(watch(sec, () => { measure(); loop.start(); }, () => loop.stop()));
    } else {
      // touch: a tap reveals the negative for a moment
      bag.on(fig, 'pointerdown', (e) => {
        if (reduced()) return;
        setLens(e.clientX, e.clientY, true);
        loop.start();
        clearTimeout(lensTimer);
        lensTimer = setTimeout(() => { target.r = 0; setTimeout(() => loop.stop(), 900); }, 1400);
      });
    }

    // ---- entering the image -----------------------------------------------------
    bag.on(enter, 'click', async (e) => {
      const runway = $('#runway');
      if (!runway) return;
      e.preventDefault();
      if (reduced()) {
        runway.scrollIntoView();
        $('#runway-title')?.focus?.();
        return;
      }
      play('drawer');
      sec.classList.add('is-entering');
      const r = fig.getBoundingClientRect();
      const ox = pointer ? ((pointer.x - r.left) / r.width) * 100 : 50;
      const oy = pointer ? ((pointer.y - r.top) / r.height) * 100 : 42;
      fig.style.transformOrigin = `${Math.max(0, Math.min(100, ox))}% ${Math.max(0, Math.min(100, oy))}%`;
      loop.stop();
      await Promise.all([
        animate(fig, [{ transform: fig.style.transform || 'none', filter: 'none' }, { transform: 'scale(3.6)', filter: 'blur(2px)' }], { duration: 950, easing: 'cubic-bezier(.7,0,.2,1)' }),
        animate(tex, [{ opacity: 0.32 }, { opacity: 0.9 }], { duration: 950 }),
        animate(sec, [{ backgroundColor: getComputedStyle(sec).backgroundColor }, { backgroundColor: '#E9E6DF' }], { duration: 950 }),
      ]);
      runway.scrollIntoView({ behavior: 'instant', block: 'start' });
      const t = $('#runway-title');
      if (t) { t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); }
      requestAnimationFrame(() => {
        [fig, tex, sec].forEach((el) => el.getAnimations().forEach((a) => a.cancel()));
        fig.style.transformOrigin = '';
        sec.classList.remove('is-entering');
      });
    });

    return () => { bag.clear(); loop.stop(); };
  }

  AFTERIMAGE['chapters/opening'] = { initOpening };
})();
