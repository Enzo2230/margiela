// IV — THE TRACE
// A relic generator (Canvas 2D). The visitor picks a photograph (by default from their
// own trace through the archive), stacks textures, reframes, moves the typographic
// blocks, switches editorial layouts and masks, randomises, and exports a PNG.
// The poster carries a 1–76 grid in which every look the visitor consulted is circled,
// like the numbered label of the house.
(() => {
  'use strict';

  const { $, $$, h, pad, clamp, announce } = AFTERIMAGE['utils/dom'];
  const { TOTAL, src, loadImage } = AFTERIMAGE['utils/images'];
  const { getTrace, onTrace } = AFTERIMAGE['utils/trace'];
  const { setObject } = AFTERIMAGE['components/hud'];
  const { play } = AFTERIMAGE['components/sound'];

  const W = 1080;
  const H = 1350;
  const C = { paper: '#E9E6DF', ink: '#151515', dust: '#A7A39C', red: '#8D2026', brown: '#665449' };
  const SERIF = '"Instrument Serif", "Times New Roman", serif';
  const SANS = '"Instrument Sans", "Helvetica Neue", Arial, sans-serif';
  const MONO = '"IBM Plex Mono", ui-monospace, monospace';

  const TEXTURES = {
    paper: { label: 'Papier froissé', src: 'assets/textures/paper-crumpled.webp', weight: 0.75 },
    wax: { label: 'Cire craquelée', src: 'assets/textures/wax-cracked.webp', weight: 0.55 },
    fibres: { label: 'Fibres', src: 'assets/textures/fibres.webp', weight: 0.6 },
    grain: { label: 'Grain argentique', src: 'assets/textures/grain.webp', weight: 0.5, mode: 'overlay', tile: 512 },
    scan: { label: 'Scan d’archive', src: 'assets/textures/archive-scan.webp', weight: 0.7 },
  };
  const LAYOUTS = {
    catalogue: 'Catalogue',
    monument: 'Monument',
    colonne: 'Colonne',
    fragment: 'Fragment',
  };
  const MASKS = { plein: 'Plein cadre', fente: 'Fente', bandes: 'Bandes décalées', dechire: 'Bord déchiré' };

  function mulberry(seed) {
    let a = seed >>> 0;
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const DEFAULTS = () => ({
    n: 30,
    zoom: 1,
    panX: 0.5,
    panY: 0.42,
    layout: 'catalogue',
    mask: 'plein',
    tex: { paper: true, wax: false, fibres: false, grain: true, scan: true },
    intensity: 0.55,
    useTrace: true,
    seed: 3030,
    off: { title: [0, 0], number: [0, 0], grid: [0, 0] },
  });

  // ---------------------------------------------------------------------------- layout geometry
  function geometry(layout) {
    switch (layout) {
      case 'monument': return { dark: true, region: [0, 0, W, H], title: [64, 1100], number: [W / 2, 900], grid: [742, 110] };
      case 'colonne': return { dark: false, region: [380, 0, 330, H], title: [210, 1250], number: [760, 250], grid: [770, 930] };
      case 'fragment': return { dark: false, region: [130, 210, 820, 860], title: [70, 150], number: [70, 1000], grid: [790, 1110] };
      default: return { dark: false, region: [80, 150, 560, 900], title: [690, 190], number: [600, 1180], grid: [700, 680] };
    }
  }

  function initTrace() {
    const host = $('[data-trace]');
    const section = $('#trace');
    if (!host) return null;

    let S = DEFAULTS();
    let boxes = {};
    const imgs = new Map();
    const negs = new Map();
    const tex = {};
    let queued = false;
    let fontsReady = false;

    // ---------------------------------------------------------------- UI
    const canvas = h('canvas', { width: W, height: H, class: 'trace__canvas', tabindex: '0', role: 'img', 'aria-label': 'Aperçu de la relique en cours de composition. Flèches : déplacer l’élément choisi dans « Déplacer au clavier ».' });
    const ctx = canvas.getContext('2d');
    const status = h('p', { class: 'mono trace__status', 'aria-live': 'polite' });

    const lookSel = h('select', { class: 'trace__select mono', 'aria-label': 'Photographie' },
      Array.from({ length: TOTAL }, (_, i) => h('option', { value: i + 1 }, `Nº ${pad(i + 1)}${i + 1 === 30 ? ' — salle 30' : ''}`)));
    const chips = h('div', { class: 'trace__chips', 'aria-label': 'Votre trace' });
    const useTrace = h('input', { type: 'checkbox', checked: true });
    const texInputs = Object.fromEntries(Object.entries(TEXTURES).map(([k]) => [k, h('input', { type: 'checkbox', value: k })]));
    const intensity = h('input', { type: 'range', min: 0, max: 100, value: 55, 'aria-label': 'Intensité des textures' });
    const zoom = h('input', { type: 'range', min: 100, max: 320, value: 100, 'aria-label': 'Zoom du cadrage' });
    const maskSel = h('select', { class: 'trace__select mono', 'aria-label': 'Masque de l’image' }, Object.entries(MASKS).map(([k, v]) => h('option', { value: k }, v)));
    const layoutRadios = Object.entries(LAYOUTS).map(([k, v]) => h('label', { class: 'trace__radio mono' }, h('input', { type: 'radio', name: 'trace-layout', value: k }), h('span', {}, v)));
    const moveSel = h('select', { class: 'trace__select mono', 'aria-label': 'Élément déplacé au clavier' },
      h('option', { value: 'image' }, 'Image (recadrage)'), h('option', { value: 'title' }, 'Titre'), h('option', { value: 'number' }, 'Numéro'), h('option', { value: 'grid' }, 'Grille de la trace'));
    const genBtn = h('button', { class: 'cta', type: 'button' }, 'Générer une relique');
    const resetBtn = h('button', { class: 'chip mono', type: 'button' }, 'Réinitialiser');
    const exportBtn = h('button', { class: 'chip mono trace__export', type: 'button' }, 'Exporter PNG ↓');

    const fs = (legend, ...kids) => h('fieldset', { class: 'trace__fs' }, h('legend', { class: 'mono' }, legend), ...kids);
    const panel = h('form', { class: 'trace__panel', onsubmit: (e) => e.preventDefault() },
      fs('01 — Image',
        h('div', { class: 'trace__row' },
          h('button', { class: 'chip mono', type: 'button', 'aria-label': 'Photographie précédente', onclick: () => setLook(S.n - 1) }, '←'),
          lookSel,
          h('button', { class: 'chip mono', type: 'button', 'aria-label': 'Photographie suivante', onclick: () => setLook(S.n + 1) }, '→'),
        ),
        h('p', { class: 'mono small trace__label' }, 'Votre trace'),
        chips,
        h('label', { class: 'trace__check mono' }, useTrace, h('span', {}, 'Entourer ma trace sur la grille')),
      ),
      fs('02 — Textures',
        h('div', { class: 'trace__checks' }, Object.entries(TEXTURES).map(([k, t]) => h('label', { class: 'trace__check mono' }, texInputs[k], h('span', {}, t.label)))),
        h('label', { class: 'trace__range mono' }, h('span', {}, 'Intensité'), intensity),
      ),
      fs('03 — Cadrage',
        h('label', { class: 'trace__range mono' }, h('span', {}, 'Zoom'), zoom),
        h('div', { class: 'trace__row' }, h('span', { class: 'mono small' }, 'Masque'), maskSel,
          h('button', { class: 'chip mono', type: 'button', onclick: () => { S.panX = 0.5; S.panY = 0.42; S.zoom = 1; zoom.value = 100; render(); } }, 'Recentrer')),
      ),
      fs('04 — Typographie', h('div', { class: 'trace__radios' }, layoutRadios)),
      fs('05 — Déplacer', h('p', { class: 'mono small trace__label' }, 'À la souris : glisser l’image ou un bloc de texte sur l’affiche. Au clavier :'), moveSel),
      h('div', { class: 'trace__actions' }, genBtn, resetBtn, exportBtn),
      status,
    );

    host.append(
      h('div', { class: 'trace__stage' },
        h('div', { class: 'trace__canvas-wrap' }, canvas),
        h('p', { class: 'mono small trace__hint' }, 'Glisser l’image pour recadrer · glisser le titre, le numéro ou la grille pour les déplacer'),
      ),
      panel,
    );

    // ---------------------------------------------------------------- assets
    function getLook(n) {
      if (!imgs.has(n)) {
        imgs.set(n, loadImage(src(n, 'l')).then((img) => {
          // negative (after-image) computed once, at half size
          const c = document.createElement('canvas');
          c.width = 540; c.height = 720;
          const x = c.getContext('2d');
          x.drawImage(img, 0, 0, 540, 720);
          try {
            const d = x.getImageData(0, 0, 540, 720);
            for (let i = 0; i < d.data.length; i += 4) { d.data[i] = 255 - d.data[i]; d.data[i + 1] = 255 - d.data[i + 1]; d.data[i + 2] = 255 - d.data[i + 2]; }
            x.putImageData(d, 0, 0);
            negs.set(n, c);
          } catch { /* canvas tainted (file://): skip the negative */ }
          return img;
        }));
      }
      return imgs.get(n);
    }
    const texReady = Promise.all(Object.entries(TEXTURES).map(([k, t]) => loadImage(t.src).then((i) => { tex[k] = i; }).catch(() => {})));

    // ---------------------------------------------------------------- drawing helpers
    function coverSource(img, rw, rh) {
      const iw = img.naturalWidth || 1080;
      const ih = img.naturalHeight || 1440;
      const scale = Math.max(rw / iw, rh / ih) * S.zoom;
      const sw = rw / scale;
      const sh = rh / scale;
      const sx = clamp(S.panX * iw - sw / 2, 0, iw - sw);
      const sy = clamp(S.panY * ih - sh / 2, 0, ih - sh);
      return [sx, sy, sw, sh];
    }

    function maskPath(rx, ry, rw, rh, rnd) {
      ctx.beginPath();
      if (S.mask === 'fente') {
        const sw = rw * 0.36;
        ctx.rect(rx + (rw - sw) / 2, ry, sw, rh);
      } else if (S.mask === 'dechire') {
        const pts = [];
        const steps = 26;
        for (let i = 0; i <= steps; i++) pts.push([rx + (rw * i) / steps, ry + (rnd() - 0.5) * 22]);
        for (let i = 0; i <= steps; i++) pts.push([rx + rw + (rnd() - 0.5) * 22, ry + (rh * i) / steps]);
        for (let i = steps; i >= 0; i--) pts.push([rx + (rw * i) / steps, ry + rh + (rnd() - 0.5) * 22]);
        for (let i = steps; i >= 0; i--) pts.push([rx + (rnd() - 0.5) * 22, ry + (rh * i) / steps]);
        pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.closePath();
      } else {
        ctx.rect(rx, ry, rw, rh);
      }
    }

    function drawImageRegion(img, g, rnd) {
      const [rx, ry, rw, rh] = g.region;
      const [sx, sy, sw, sh] = coverSource(img, rw, rh);
      const neg = negs.get(S.n);

      // the after-image: a faint negative, offset, behind the photograph
      if (neg && S.layout !== 'monument') {
        ctx.save();
        ctx.globalAlpha = 0.13;
        ctx.drawImage(neg, sx / 2, sy / 2, sw / 2, sh / 2, rx + 34, ry - 26, rw, rh);
        ctx.restore();
      }

      if (S.mask === 'bandes' || S.layout === 'fragment') {
        const bands = 7;
        const bh = rh / bands;
        for (let i = 0; i < bands; i++) {
          const dx = (rnd() - 0.5) * 90;
          ctx.save();
          ctx.beginPath();
          ctx.rect(rx + dx, ry + i * bh + 3, rw, bh - 6);
          ctx.clip();
          ctx.drawImage(img, sx, sy, sw, sh, rx + dx, ry, rw, rh);
          ctx.restore();
        }
      } else {
        ctx.save();
        maskPath(rx, ry, rw, rh, rnd);
        ctx.clip();
        ctx.drawImage(img, sx, sy, sw, sh, rx, ry, rw, rh);
        ctx.restore();
        if (S.mask === 'fente' && neg) {
          // outside the slit, only the negative remains
          ctx.save();
          ctx.globalAlpha = g.dark ? 0.22 : 0.16;
          ctx.beginPath();
          ctx.rect(rx, ry, (rw - rw * 0.36) / 2, rh);
          ctx.rect(rx + (rw + rw * 0.36) / 2, ry, (rw - rw * 0.36) / 2, rh);
          ctx.clip();
          ctx.drawImage(neg, sx / 2, sy / 2, sw / 2, sh / 2, rx, ry, rw, rh);
          ctx.restore();
        }
      }

      // crop marks + red annotation
      const ink = g.dark ? C.paper : C.ink;
      ctx.save();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1.5;
      const m = 18;
      [[rx, ry, 1, 1], [rx + rw, ry, -1, 1], [rx, ry + rh, 1, -1], [rx + rw, ry + rh, -1, -1]].forEach(([x, y, a, b]) => {
        if (x <= 0 || y <= 0 || x >= W || y >= H) return;
        ctx.beginPath();
        ctx.moveTo(x - a * 8, y); ctx.lineTo(x - a * (8 + m), y);
        ctx.moveTo(x, y - b * 8); ctx.lineTo(x, y - b * (8 + m));
        ctx.stroke();
      });
      const ax = rx + rw * (0.35 + rnd() * 0.3);
      const ay = ry + rh * (0.18 + rnd() * 0.4);
      ctx.strokeStyle = C.red;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ax, ay, 46, 0, Math.PI * 2);
      ctx.stroke();
      const lx = ax + (ax > W / 2 ? -170 : 170);
      ctx.beginPath();
      ctx.moveTo(ax + (lx > ax ? 46 : -46), ay);
      ctx.lineTo(lx, ay);
      ctx.stroke();
      ctx.fillStyle = C.red;
      ctx.font = `20px ${MONO}`;
      ctx.textAlign = lx > ax ? 'left' : 'right';
      ctx.fillText(`fig. ${pad(S.n)}.${Math.floor(rnd() * 7) + 1}`, lx + (lx > ax ? 8 : -8), ay + 6);
      ctx.restore();
    }

    function drawTextures(g) {
      const k = S.intensity;
      Object.entries(TEXTURES).forEach(([key, t]) => {
        if (!S.tex[key] || !tex[key]) return;
        ctx.save();
        ctx.globalCompositeOperation = g.dark ? 'overlay' : (t.mode || 'multiply');
        ctx.globalAlpha = clamp(k * t.weight * (g.dark ? 0.8 : 1), 0, 1);
        const size = t.tile || 760;
        for (let y = 0; y < H; y += size) for (let x = 0; x < W; x += size) ctx.drawImage(tex[key], x, y, size, size);
        ctx.restore();
      });
    }

    function textBox(x, y, w, hgt) { return { x, y, w, h: hgt }; }

    function drawTitle(g) {
      const [ox, oy] = S.off.title;
      const [bx, by] = g.title;
      const x = bx + ox;
      const y = by + oy;
      const fg = g.dark ? C.paper : C.ink;
      ctx.save();
      ctx.fillStyle = fg;
      ctx.textBaseline = 'alphabetic';
      let box;
      if (S.layout === 'catalogue') {
        ctx.font = `96px ${SERIF}`;
        ['THE', 'AFTER-', 'IMAGE'].forEach((w, i) => ctx.fillText(w, x, y + 84 + i * 86));
        ctx.font = `17px ${MONO}`;
        ctx.fillStyle = C.red;
        ctx.fillText('AN ARCHIVE OF WHAT REMAINS.', x + 4, y + 84 + 3 * 86 - 30);
        box = textBox(x, y, 360, 300);
      } else if (S.layout === 'monument') {
        ctx.font = `118px ${SERIF}`;
        ctx.fillText('THE AFTER-IMAGE', x, y + 100);
        ctx.font = `18px ${MONO}`;
        ctx.fillText('AN ARCHIVE OF WHAT REMAINS.', x + 4, y + 140);
        box = textBox(x, y, 900, 150);
      } else if (S.layout === 'colonne') {
        ctx.translate(x, y);
        ctx.rotate(-Math.PI / 2);
        ctx.font = `150px ${SERIF}`;
        ctx.fillText('THE AFTER-IMAGE', 0, 0);
        ctx.font = `18px ${MONO}`;
        ctx.fillStyle = C.red;
        ctx.fillText('AN ARCHIVE OF WHAT REMAINS.', 6, 40);
        box = textBox(x - 120, y - 1180, 175, 1200);
      } else {
        ctx.font = `128px ${SERIF}`;
        ctx.fillText('THE', x, y);
        ctx.fillText('AFTER-', x + 520, y + 470);
        ctx.font = `italic 128px ${SERIF}`;
        ctx.fillText('image', x + 170, y + 1000);
        ctx.font = `18px ${MONO}`;
        ctx.fillStyle = C.red;
        ctx.fillText('AN ARCHIVE OF WHAT REMAINS.', x + 6, y + 40);
        box = textBox(x, y - 110, 300, 170);
      }
      ctx.restore();
      return box;
    }

    function drawNumber(g) {
      const [ox, oy] = S.off.number;
      const [bx, by] = g.number;
      const x = bx + ox;
      const y = by + oy;
      ctx.save();
      let box;
      if (S.layout === 'monument') {
        ctx.font = `760px ${SERIF}`;
        ctx.textAlign = 'center';
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(233,230,223,.85)';
        ctx.strokeText(String(S.n), x, y);
        const w = ctx.measureText(String(S.n)).width;
        box = textBox(x - w / 2, y - 560, w, 580);
      } else {
        const big = S.layout === 'catalogue' ? 300 : 200;
        ctx.font = `${big}px ${SERIF}`;
        ctx.fillStyle = C.red;
        ctx.fillText(pad(S.n, 3), x, y);
        const w = ctx.measureText(pad(S.n, 3)).width;
        ctx.font = `18px ${MONO}`;
        ctx.fillStyle = C.ink;
        ctx.fillText(`OBJET Nº — LOOK ${S.n} / ${TOTAL}`, x + 6, y + 34);
        box = textBox(x, y - big * 0.72, w, big * 0.72 + 44);
      }
      ctx.restore();
      return box;
    }

    function drawGrid(g) {
      const [ox, oy] = S.off.grid;
      const [bx, by] = g.grid;
      const x = bx + ox;
      const y = by + oy;
      const cols = 8;
      const cw = 36;
      const ch = 30;
      const fg = g.dark ? C.paper : C.ink;
      const trace = S.useTrace ? getTrace() : [];
      ctx.save();
      ctx.font = `15px ${MONO}`;
      ctx.fillStyle = g.dark ? C.dust : C.brown;
      ctx.fillText(`TRACE — ${trace.length} LOOK${trace.length > 1 ? 'S' : ''} CONSULTÉ${trace.length > 1 ? 'S' : ''}`, x, y - 14);
      ctx.font = `700 17px ${SANS}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let n = 1; n <= TOTAL; n++) {
        const i = n - 1;
        const cx = x + (i % cols) * cw + cw / 2;
        const cy = y + Math.floor(i / cols) * ch + ch / 2;
        if (n === S.n) {
          ctx.fillStyle = C.red;
          ctx.beginPath(); ctx.arc(cx, cy, 15, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = C.paper;
        } else ctx.fillStyle = fg;
        ctx.fillText(String(n), cx, cy + 1);
        if (trace.includes(n) && n !== S.n) {
          ctx.strokeStyle = C.red; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.arc(cx, cy, 15, 0, Math.PI * 2); ctx.stroke();
        }
      }
      ctx.restore();
      return textBox(x, y - 34, cols * cw, Math.ceil(TOTAL / cols) * ch + 34);
    }

    function drawMeta(g) {
      const fg = g.dark ? C.dust : C.brown;
      ctx.save();
      ctx.font = `16px ${MONO}`;
      ctx.fillStyle = fg;
      ctx.fillText('MMXXVI / DIGITAL FASHION ARCHIVE', 40, 50);
      ctx.textAlign = 'right';
      ctx.fillText(`RELIQUE Nº ${pad(S.seed % 10000, 4)}`, W - 40, 50);
      ctx.textAlign = 'left';
      ctx.font = `13px ${MONO}`;
      ctx.fillText(`SOURCE img/Look_${S.n}.jpg · ${LAYOUTS[S.layout].toUpperCase()} · ${MASKS[S.mask].toUpperCase()}`, 40, H - 52);
      ctx.fillText('COMPOSITION DE VISITEUR — PROJET NON OFFICIEL · PHOTOGRAPHIE : DÉFILÉ MAISON MARGIELA AH 2026', 40, H - 30);
      ctx.restore();
    }

    // ---------------------------------------------------------------- render
    async function render() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(async () => {
        queued = false;
        const n = S.n;
        let img;
        try { img = await getLook(n); } catch { status.textContent = `Image Nº ${pad(n)} introuvable.`; return; }
        if (n !== S.n) return;
        const g = geometry(S.layout);
        const rnd = mulberry(S.seed);
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.fillStyle = g.dark ? C.ink : C.paper;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
        if (g.dark) {
          // monument: photograph dimmed under the giant numeral
          ctx.save();
          ctx.globalAlpha = 0.82;
          drawImageRegion(img, g, rnd);
          ctx.restore();
        } else drawImageRegion(img, g, rnd);
        drawTextures(g);
        boxes = {};
        boxes.number = drawNumber(g);
        boxes.title = drawTitle(g);
        boxes.grid = drawGrid(g);
        drawMeta(g);
        section.dataset.object = `R.${pad(S.seed % 1000, 3)}`;
        if (document.body.dataset.chapter === 'trace') setObject(section.dataset.object);
      });
    }

    // ---------------------------------------------------------------- sync UI <-> state
    function syncUI() {
      lookSel.value = String(S.n);
      useTrace.checked = S.useTrace;
      Object.entries(texInputs).forEach(([k, i]) => { i.checked = !!S.tex[k]; });
      intensity.value = Math.round(S.intensity * 100);
      zoom.value = Math.round(S.zoom * 100);
      maskSel.value = S.mask;
      $$('input[type=radio]', panel).forEach((r) => { r.checked = r.value === S.layout; });
    }
    function renderChips(trace = getTrace()) {
      chips.replaceChildren(...(trace.length ? trace.slice(-12).map((n) => h('button', {
        class: `chip mono${n === S.n ? ' is-on' : ''}`, type: 'button', 'aria-label': `Utiliser le look ${n}`, 'aria-pressed': String(n === S.n),
        onclick: () => setLook(n),
      }, pad(n))) : [h('p', { class: 'mono small trace__empty' }, 'Aucun look consulté pour l’instant : ouvrez des fiches dans l’archive, elles apparaîtront ici.')]));
    }

    function setLook(n) {
      S.n = ((n - 1 + TOTAL) % TOTAL) + 1;
      S.panX = 0.5; S.panY = 0.42;
      syncUI();
      renderChips();
      render();
    }

    lookSel.addEventListener('change', () => setLook(+lookSel.value));
    useTrace.addEventListener('change', () => { S.useTrace = useTrace.checked; render(); });
    Object.entries(texInputs).forEach(([k, i]) => i.addEventListener('change', () => { S.tex[k] = i.checked; render(); }));
    intensity.addEventListener('input', () => { S.intensity = +intensity.value / 100; render(); });
    zoom.addEventListener('input', () => { S.zoom = +zoom.value / 100; render(); });
    maskSel.addEventListener('change', () => { S.mask = maskSel.value; render(); });
    $$('input[type=radio]', panel).forEach((r) => r.addEventListener('change', () => { S.layout = r.value; S.off = { title: [0, 0], number: [0, 0], grid: [0, 0] }; render(); }));

    genBtn.addEventListener('click', () => {
      const r = mulberry(Date.now() & 0xffffffff);
      const trace = getTrace();
      const pool = trace.length ? trace : Array.from({ length: TOTAL }, (_, i) => i + 1);
      S.seed = Math.floor(r() * 1e6);
      S.n = pool[Math.floor(r() * pool.length)];
      S.layout = Object.keys(LAYOUTS)[Math.floor(r() * 4)];
      S.mask = Object.keys(MASKS)[Math.floor(r() * 4)];
      S.zoom = 1 + r() * 0.9;
      S.panX = 0.38 + r() * 0.24;
      S.panY = 0.2 + r() * 0.35;
      Object.keys(S.tex).forEach((k) => { S.tex[k] = r() > 0.45; });
      S.intensity = 0.35 + r() * 0.5;
      const j = () => [Math.round((r() - 0.5) * 120), Math.round((r() - 0.5) * 120)];
      S.off = { title: j(), number: j(), grid: [0, Math.round((r() - 0.5) * 80)] };
      syncUI();
      renderChips();
      render();
      play('shutter');
      announce(`Nouvelle relique : look ${S.n}, mise en page ${LAYOUTS[S.layout]}, masque ${MASKS[S.mask]}.`);
    });
    resetBtn.addEventListener('click', () => {
      const keepN = S.n;
      S = DEFAULTS();
      S.n = keepN;
      syncUI();
      renderChips();
      render();
      announce('Composition réinitialisée.');
    });
    exportBtn.addEventListener('click', () => {
      try {
        canvas.toBlob((blob) => {
          if (!blob) { status.textContent = 'Export impossible dans ce navigateur.'; return; }
          const url = URL.createObjectURL(blob);
          const a = h('a', { href: url, download: `after-image_relique_${pad(S.n)}_${pad(S.seed % 10000, 4)}.png` });
          document.body.append(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 4000);
          status.textContent = `Relique exportée : after-image_relique_${pad(S.n)}_${pad(S.seed % 10000, 4)}.png (1080 × 1350 px).`;
          play('shutter');
        }, 'image/png');
      } catch (err) {
        status.textContent = location.protocol === 'file:'
        ? 'Export PNG bloqué par le navigateur quand la page est ouverte en double-clic (file://). Ouvrez-la avec Live Server (VS Code) ou mettez le dossier en ligne : tout le reste fonctionne déjà.'
        : 'Export impossible dans ce navigateur.';
      }
    });

    // ---------------------------------------------------------------- direct manipulation on the canvas
    const toCanvas = (e) => {
      const r = canvas.getBoundingClientRect();
      return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H];
    };
    const hit = (x, y) => ['number', 'title', 'grid'].find((k) => {
      const b = boxes[k];
      return b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
    });
    let drag = null;
    canvas.addEventListener('pointerdown', (e) => {
      const [x, y] = toCanvas(e);
      const target = hit(x, y) || 'image';
      drag = { target, x, y, start: target === 'image' ? [S.panX, S.panY] : S.off[target].slice() };
      canvas.setPointerCapture(e.pointerId);
      canvas.classList.add('is-dragging');
    });
    canvas.addEventListener('pointermove', (e) => {
      const [x, y] = toCanvas(e);
      if (!drag) { canvas.style.cursor = hit(x, y) ? 'move' : 'grab'; return; }
      const dx = x - drag.x;
      const dy = y - drag.y;
      if (drag.target === 'image') {
        const [, , rw, rh] = geometry(S.layout).region;
        S.panX = clamp(drag.start[0] - dx / (rw * S.zoom) * 0.75, 0, 1);
        S.panY = clamp(drag.start[1] - dy / (rh * S.zoom) * 0.75, 0, 1);
      } else {
        S.off[drag.target] = [drag.start[0] + dx, drag.start[1] + dy];
      }
      render();
    });
    const end = () => { drag = null; canvas.classList.remove('is-dragging'); };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 60 : 16;
      const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      if (!d) return;
      e.preventDefault();
      const t = moveSel.value;
      if (t === 'image') { S.panX = clamp(S.panX - d[0] * 0.02, 0, 1); S.panY = clamp(S.panY - d[1] * 0.02, 0, 1); }
      else S.off[t] = [S.off[t][0] + d[0] * step, S.off[t][1] + d[1] * step];
      render();
    });

    // ---------------------------------------------------------------- boot
    onTrace((t) => { renderChips(t); if (S.useTrace) render(); });
    syncUI();
    renderChips();
    const fontLoads = [`96px ${SERIF}`, `italic 96px ${SERIF}`, `16px ${MONO}`, `700 16px ${SANS}`].map((f) => document.fonts?.load(f).catch(() => {}));
    Promise.all([...fontLoads, texReady]).then(() => { fontsReady = true; render(); });
    render();

    return {
      setLook(n) { setLook(n); section.scrollIntoView({ behavior: 'smooth' }); setTimeout(() => canvas.focus({ preventScroll: true }), 700); },
      get ready() { return fontsReady; },
    };
  }

  AFTERIMAGE['chapters/trace'] = { initTrace };
})();
