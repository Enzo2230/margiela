// II — MATERIAL MEMORY
// A work table of superimposed layers: fragments cut from the runway photographs and
// textures generated for the project. Layers drift with inertia, can be dragged, lifted
// (click), exploded into a deconstructed diagram, and a paper skin can be rubbed away to
// reveal the photograph underneath. Plain DOM + Canvas 2D: no WebGL needed here.
(() => {
  'use strict';

  const { $, $$, h, pad, Bag, lerp, announce } = AFTERIMAGE['utils/dom'];
  const { src } = AFTERIMAGE['utils/images'];
  const { reduced, finePointer, ticker, watch } = AFTERIMAGE['utils/motion'];
  const { play } = AFTERIMAGE['components/sound'];

  const LAYERS = [
    { id: 'T1', kind: 'texture', src: 'assets/textures/paper-crumpled.webp', name: 'Papier froissé', origin: 'texture procédurale originale', x: 4, y: 8, w: 27, ratio: '4 / 5', rot: -3, depth: 0.25, blend: 'multiply', op: 0.9 },
    { id: 'T2', kind: 'texture', src: 'assets/textures/wax-cracked.webp', name: 'Cire craquelée', origin: 'texture procédurale originale', x: 67, y: 52, w: 24, ratio: '1', rot: 4, depth: 0.35, blend: 'multiply', op: 0.85 },
    { id: 'T3', kind: 'texture', src: 'assets/textures/porcelain.webp', name: 'Porcelaine', origin: 'texture procédurale originale', x: 60, y: 4, w: 20, ratio: '3 / 4', rot: 2, depth: 0.3, blend: 'multiply', op: 1 },
    { id: 'T4', kind: 'texture', src: 'assets/textures/fibres.webp', name: 'Fibres textiles', origin: 'texture procédurale originale', x: 14, y: 56, w: 23, ratio: '5 / 4', rot: -6, depth: 0.45, blend: 'multiply', op: 0.95 },
    { id: 'T5', kind: 'texture', src: 'assets/textures/patina.webp', name: 'Métal patiné', origin: 'texture procédurale originale', x: 79, y: 22, w: 16, ratio: '2 / 3', rot: 7, depth: 0.5, blend: 'multiply', op: 0.9 },
    { id: 'F1', kind: 'fragment', src: 'assets/material/l30-lame.webp', name: 'Surface rose métallique', origin: 'recadrage — img/Look_30.jpg (traîne)', look: 30, x: 50, y: 58, w: 17, ratio: '1', rot: -8, depth: 0.9 },
    { id: 'F2', kind: 'fragment', src: 'assets/material/l25-print.webp', name: 'Imprimé marbré', origin: 'recadrage — img/Look_25.jpg (jupe)', look: 25, x: 24, y: 30, w: 15, ratio: '1', rot: 6, depth: 0.75 },
    { id: 'F3', kind: 'fragment', src: 'assets/material/l05-painted.webp', name: 'Reflets bleus peints', origin: 'recadrage — img/Look_5.jpg (crinoline)', look: 5, x: 70, y: 32, w: 14, ratio: '1', rot: -3, depth: 1.0 },
    { id: 'F4', kind: 'fragment', src: 'assets/material/l23-gold.webp', name: 'Or froissé', origin: 'recadrage — img/Look_23.jpg (robe-cape)', look: 23, x: 4, y: 40, w: 12, ratio: '1', rot: 9, depth: 0.85 },
    { id: 'F5', kind: 'fragment', src: 'assets/material/l40-lace.webp', name: 'Dentelle plissée', origin: 'recadrage — img/Look_40.jpg (cape)', look: 40, x: 40, y: 2, w: 12, ratio: '1', rot: -5, depth: 0.7 },
  ];
  const UNDER = [30, 25, 5, 23, 64, 76];

  // deterministic pseudo-random for torn edges
  function rand(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
  function tornPolygon(seed, jag = 2.2) {
    const r = rand(seed);
    const pts = [];
    const edge = (fx, fy, tx, ty, steps) => {
      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const x = fx + (tx - fx) * t + (fx === tx ? (r() - 0.5) * jag : 0);
        const y = fy + (ty - fy) * t + (fy === ty ? (r() - 0.5) * jag : 0);
        pts.push(`${x.toFixed(2)}% ${y.toFixed(2)}%`);
      }
    };
    edge(1, 1, 99, 1, 18);
    edge(99, 1, 99, 99, 18);
    edge(99, 99, 1, 99, 18);
    edge(1, 99, 1, 1, 18);
    return `polygon(${pts.join(',')})`;
  }

  function initMaterial() {
    const sec = $('#material');
    const stage = $('[data-mat-stage]', sec);
    const legend = $('[data-mat-legend]', sec);
    const explodeBtn = $('[data-mat-explode]', sec);
    const resetBtn = $('[data-mat-reset]', sec);
    const underWrap = $('[data-mat-under]', sec);
    const bag = new Bag();
    let z = 20;
    let under = 30;
    let exploded = false;

    // ---------------------------------------------------------------- base (3 strips) + skin
    const base = h('div', { class: 'mat-base', 'aria-hidden': 'true' });
    const strips = [0, 1, 2].map((i) => h('div', { class: 'mat-base__strip', style: { '--i': i } }));
    base.append(...strips);
    const baseLabel = h('p', { class: 'mat-base__label mono' });
    const skin = h('canvas', { class: 'mat-skin', 'aria-label': 'Feuille de papier à frotter pour révéler la photographie' });
    const revealBtn = h('button', { class: 'chip mono', type: 'button', 'aria-pressed': 'false' }, 'Révéler la sous-couche');
    $('.material__controls', sec).insertBefore(revealBtn, resetBtn.nextSibling);
    stage.append(base, skin, baseLabel);

    function setUnder(n) {
      under = n;
      strips.forEach((s) => { s.style.backgroundImage = `url(${src(n, 'l')})`; });
      baseLabel.textContent = `Sous-couche — Nº ${pad(n)} · img/Look_${n}.jpg`;
      $$('button', underWrap).forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.n === n)));
      paintSkin();
    }
    UNDER.forEach((n) => underWrap.append(h('button', { class: 'chip mono', type: 'button', dataset: { n }, 'aria-pressed': 'false', 'aria-label': `Sous-couche : look ${n}` }, pad(n))));
    bag.on(underWrap, 'click', (e) => { const b = e.target.closest('[data-n]'); if (b) { setUnder(+b.dataset.n); play('paper'); } });

    // ---------------------------------------------------------------- skin painting / rubbing
    const ctx = skin.getContext('2d');
    const paperTex = new Image();
    paperTex.src = 'assets/textures/paper-crumpled.webp';
    let skinW = 0;
    let skinH = 0;
    let revealedAnnounced = false;

    function paintSkin() {
      const r = skin.getBoundingClientRect();
      if (!r.width) return;
      const dpr = Math.min(2, devicePixelRatio || 1);
      skinW = skin.width = Math.round(r.width * dpr);
      skinH = skin.height = Math.round(r.height * dpr);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#E9E6DF';
      ctx.fillRect(0, 0, skinW, skinH);
      if (paperTex.complete && paperTex.naturalWidth) {
        ctx.globalAlpha = 0.85;
        ctx.globalCompositeOperation = 'multiply';
        const s = skinW / 1.2;
        for (let y = 0; y < skinH; y += s) for (let x = 0; x < skinW; x += s) ctx.drawImage(paperTex, x, y, s, s);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.fillStyle = '#151515';
      ctx.font = `${11 * dpr}px "IBM Plex Mono", monospace`;
      ctx.fillText('FROTTER POUR RÉVÉLER', 14 * dpr, 24 * dpr);
      ctx.fillStyle = '#8D2026';
      ctx.fillText(`SOUS-COUCHE Nº ${pad(under)}`, 14 * dpr, 40 * dpr);
      ctx.strokeStyle = 'rgba(21,21,21,.35)';
      ctx.lineWidth = dpr;
      ctx.strokeRect(0.5 * dpr, 0.5 * dpr, skinW - dpr, skinH - dpr);
      skin.classList.remove('is-gone');
      revealBtn.setAttribute('aria-pressed', 'false');
      revealedAnnounced = false;
    }
    paperTex.onload = () => paintSkin();

    let rubbing = false;
    let last = null;
    const rub = (x, y) => {
      const dpr = skinW / skin.getBoundingClientRect().width;
      const R = 34 * dpr;
      ctx.globalCompositeOperation = 'destination-out';
      const steps = last ? Math.ceil(Math.hypot(x - last.x, y - last.y) / (R / 3)) : 1;
      for (let i = 1; i <= steps; i++) {
        const px = last ? last.x + ((x - last.x) * i) / steps : x;
        const py = last ? last.y + ((y - last.y) * i) / steps : y;
        const g = ctx.createRadialGradient(px * dpr, py * dpr, 0, px * dpr, py * dpr, R);
        g.addColorStop(0, 'rgba(0,0,0,.9)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px * dpr, py * dpr, R, 0, Math.PI * 2);
        ctx.fill();
      }
      last = { x, y };
    };
    const coverage = () => {
      let d;
      try { d = ctx.getImageData(0, 0, skinW, skinH).data; } catch { return 0.6; } // file:// : canvas not readable
      let clear = 0;
      let n = 0;
      for (let i = 3; i < d.length; i += 4 * 97) { n++; if (d[i] < 40) clear++; }
      return clear / n;
    };
    bag.on(skin, 'pointerdown', (e) => {
      rubbing = true;
      last = null;
      skin.setPointerCapture(e.pointerId);
      const r = skin.getBoundingClientRect();
      rub(e.clientX - r.left, e.clientY - r.top);
      play('paper');
    });
    bag.on(skin, 'pointermove', (e) => {
      if (!rubbing) return;
      const r = skin.getBoundingClientRect();
      rub(e.clientX - r.left, e.clientY - r.top);
    });
    const endRub = () => {
      if (!rubbing) return;
      rubbing = false;
      if (!revealedAnnounced && coverage() > 0.5) {
        revealedAnnounced = true;
        announce(`Sous-couche révélée : look ${under}.`);
        baseLabel.classList.add('is-revealed');
      }
    };
    bag.on(skin, 'pointerup', endRub);
    bag.on(skin, 'pointercancel', endRub);
    bag.on(revealBtn, 'click', () => {
      const gone = skin.classList.toggle('is-gone');
      revealBtn.setAttribute('aria-pressed', String(gone));
      if (gone) announce(`Sous-couche révélée : look ${under}.`);
      else paintSkin();
    });

    // ---------------------------------------------------------------- layers
    const state = LAYERS.map((L, i) => {
      const inner = h('span', { class: 'mat-layer__inner' },
        h('img', { src: L.src, alt: '', loading: 'lazy', decoding: 'async', draggable: 'false' }),
      );
      const el = h('button', {
        class: `mat-layer mat-layer--${L.kind}`, type: 'button',
        style: { left: `${L.x}%`, top: `${L.y}%`, width: `${L.w}%`, aspectRatio: L.ratio, zIndex: 10 + i, '--blend': L.blend || 'normal', '--op': L.op ?? 1 },
        'aria-label': `${L.id} — ${L.name} (${L.origin}). Glisser ou flèches pour déplacer, Entrée pour soulever.`,
      }, inner, h('span', { class: 'mat-layer__tag mono', 'aria-hidden': 'true' }, h('b', {}, L.id), ` ${L.name}`));
      if (L.kind === 'fragment') inner.style.clipPath = tornPolygon(i * 7919 + 13);
      stage.append(el);
      return { L, el, inner, ux: 0, uy: 0, ex: 0, ey: 0, er: 0, px: 0, py: 0, peeled: false, dragging: false };
    });

    legend.replaceChildren(...state.map((s) => h('li', {},
      h('button', { type: 'button', onclick: () => { s.el.focus(); togglePeel(s); } }, h('b', {}, s.L.id), ` ${s.L.name}`, h('span', {}, ` — ${s.L.origin}`)))));

    function apply(s) {
      const rot = s.L.rot + s.er + (s.peeled ? 7 : 0);
      const lift = s.peeled ? -16 : 0;
      s.el.style.transform = `translate(${s.ux + s.ex}px, ${s.uy + s.ey + lift}px) rotate(${rot}deg) scale(${s.peeled ? 1.05 : 1})`;
      s.el.classList.toggle('is-peeled', s.peeled);
    }
    function togglePeel(s) {
      s.peeled = !s.peeled;
      s.el.style.zIndex = ++z;
      apply(s);
      play('paper');
    }
    state.forEach(apply);

    // drag
    state.forEach((s) => {
      let start = null;
      bag.on(s.el, 'pointerdown', (e) => {
        if (e.button !== 0) return;
        start = { x: e.clientX, y: e.clientY, ux: s.ux, uy: s.uy, moved: false };
        s.el.setPointerCapture(e.pointerId);
      });
      bag.on(s.el, 'pointermove', (e) => {
        if (!start) return;
        const dx = e.clientX - start.x;
        const dy = e.clientY - start.y;
        if (!start.moved && Math.hypot(dx, dy) > 4) {
          start.moved = true;
          s.el.classList.add('is-dragging');
          s.el.style.zIndex = ++z;
          play('paper');
        }
        if (start.moved) { s.ux = start.ux + dx; s.uy = start.uy + dy; apply(s); }
      });
      const end = () => {
        if (!start) return;
        s.el.classList.remove('is-dragging');
        s.el.dataset.moved = start.moved ? '1' : '';
        start = null;
      };
      bag.on(s.el, 'pointerup', end);
      bag.on(s.el, 'pointercancel', end);
      bag.on(s.el, 'click', (e) => {
        if (s.el.dataset.moved === '1') { s.el.dataset.moved = ''; e.preventDefault(); return; }
        togglePeel(s);
      });
      bag.on(s.el, 'keydown', (e) => {
        const step = e.shiftKey ? 48 : 12;
        const map = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
        if (!map[e.key]) return;
        e.preventDefault();
        s.ux += map[e.key][0];
        s.uy += map[e.key][1];
        s.el.style.zIndex = ++z;
        apply(s);
      });
    });

    // explode / reset
    function setExplode(on) {
      exploded = on;
      explodeBtn.setAttribute('aria-pressed', String(on));
      stage.classList.toggle('is-exploded', on);
      const sr = stage.getBoundingClientRect();
      const cx = sr.width / 2;
      const cy = sr.height / 2;
      const r = rand(42);
      state.forEach((s, i) => {
        if (!on) { s.ex = 0; s.ey = 0; s.er = 0; apply(s); return; }
        const lx = (s.L.x + s.L.w / 2) / 100 * sr.width;
        const ly = (s.L.y + 12) / 100 * sr.height;
        const ang = Math.atan2(ly - cy, lx - cx) + (r() - 0.5) * 0.4;
        const dist = Math.min(sr.width, sr.height) * (0.12 + s.L.depth * 0.1);
        s.ex = Math.cos(ang) * dist;
        s.ey = Math.sin(ang) * dist * 0.7;
        s.er = (r() - 0.5) * 16 + (i % 2 ? 4 : -4);
        apply(s);
      });
      play(on ? 'drawer' : 'paper');
      announce(on ? 'Composition déconstruite : chaque couche est légendée.' : 'Composition recomposée.');
    }
    bag.on(explodeBtn, 'click', () => setExplode(!exploded));
    bag.on(resetBtn, 'click', () => {
      state.forEach((s, i) => { s.ux = 0; s.uy = 0; s.peeled = false; s.el.style.zIndex = 10 + i; });
      setExplode(false);
      setUnder(30);
      baseLabel.classList.remove('is-revealed');
      announce('Installation réinitialisée.');
    });

    // ---------------------------------------------------------------- inertia parallax
    const target = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };
    const loop = ticker(() => {
      cur.x = lerp(cur.x, target.x, 0.06);
      cur.y = lerp(cur.y, target.y, 0.06);
      state.forEach((s) => {
        const d = s.L.depth * 26;
        s.inner.style.transform = `translate(${cur.x * d}px, ${cur.y * d}px)`;
      });
      base.style.transform = `translate(${cur.x * -6}px, ${cur.y * -6}px)`;
      if (Math.abs(cur.x - target.x) < 0.001 && Math.abs(cur.y - target.y) < 0.001 && !target.active) loop.stop();
    });
    if (finePointer() && !reduced()) {
      bag.on(stage, 'pointermove', (e) => {
        const r = stage.getBoundingClientRect();
        target.x = ((e.clientX - r.left) / r.width) * 2 - 1;
        target.y = ((e.clientY - r.top) / r.height) * 2 - 1;
        target.active = true;
        loop.start();
      });
      bag.on(stage, 'pointerleave', () => { target.x = 0; target.y = 0; target.active = false; });
    }
    bag.add(watch(stage, () => {}, () => loop.stop()));

    // ---------------------------------------------------------------- init
    setUnder(30);
    let rt = 0;
    const ro = new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(paintSkin, 150); });
    ro.observe(skin);
    bag.add(() => ro.disconnect());

    return () => { bag.clear(); loop.stop(); };
  }

  AFTERIMAGE['chapters/material'] = { initMaterial };
})();
