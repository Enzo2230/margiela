// III — ANATOMY OF A SILHOUETTE
// A study plate of Look 30: a sticky photograph re-framed step by step while the text
// scrolls (whole → material → construction → texture → annotation → graphic reading).
// Hover reveals numbered marks on the plate; clicking a mark opens an editorial note.
(() => {
  'use strict';

  const { $, $$, h, pad, Bag } = AFTERIMAGE['utils/dom'];
  const { src } = AFTERIMAGE['utils/images'];
  const { reduced } = AFTERIMAGE['utils/motion'];
  const { LOOK30, frameFor, cropBackground } = AFTERIMAGE['data/look30'];

  const D = Object.fromEntries(LOOK30.details.map((d) => [d.id, d]));

  const STEPS = [
    {
      no: 'III.0', title: 'Silhouette complète', view: null,
      obs: 'Vue frontale, en pied, dans l’axe de la piste. Du sommet du masque au bas de la traîne, la silhouette occupe environ 1 340 des 1 440 pixels de hauteur de l’image.',
      int: 'Une colonne de lumière rose plantée dans le béton, entre deux murs de conteneurs.',
    },
    { no: 'III.1', title: 'Détail de matière', view: '30.3', obs: D['30.3'].obs, int: D['30.3'].int },
    { no: 'III.2', title: 'Détail de construction', view: '30.2', obs: `${D['30.2'].obs} ${D['30.5'].obs}`, int: D['30.2'].int },
    { no: 'III.3', title: 'Texture', view: '30.6', obs: D['30.6'].obs, int: D['30.6'].int },
    { no: 'III.4', title: 'Annotation', view: '30.1', obs: D['30.1'].obs, int: D['30.1'].int },
    {
      no: 'III.5', title: 'Interprétation graphique', view: null, graphic: true,
      obs: 'Relevés effectués sur le fichier source : axe vertical à x ≈ 545 px ; masque de y ≈ 55 à 250 px ; partie la plus large du bas de la robe d’environ x 330 à 850 px.',
      int: 'Réduite à quelques lignes, la silhouette devient un plan d’architecte : une tête effacée, un fût, une base évasée.',
    },
  ];

  const SVG_NS = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs = {}) {
    const el = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
  }

  function graphicLayer() {
    const g = svg('svg', { class: 'ana-graphic', viewBox: '0 0 1080 1440', preserveAspectRatio: 'xMidYMid slice', 'aria-hidden': 'true' });
    const line = (x1, y1, x2, y2, cls = '') => g.append(svg('line', { x1, y1, x2, y2, class: cls }));
    const text = (x, y, t, anchor = 'start') => { const e = svg('text', { x, y, 'text-anchor': anchor }); e.textContent = t; g.append(e); };
    line(545, 20, 545, 1420, 'axis');
    line(470, 55, 620, 55); line(470, 250, 620, 250);
    text(630, 60, 'y 55'); text(630, 255, 'y 250 — masque');
    line(380, 300, 710, 300); text(720, 305, 'épaules ≈ 330 px');
    line(330, 1395, 850, 1395); text(860, 1390, 'base ≈ 520 px');
    line(420, 620, 700, 620, 'dash'); text(710, 625, 'taille');
    g.append(svg('path', { d: 'M545 55 C 620 60, 615 240, 600 300 L 710 310 L 735 760 C 780 900, 840 1200, 850 1395 L 330 1395 C 345 1200, 380 900, 380 760 L 380 310 L 490 300 C 475 240, 470 60, 545 55 Z', class: 'contour' }));
    g.append(svg('circle', { cx: 545, cy: 150, r: 120, class: 'halo' }));
    text(560, 1430, '1080 × 1440 px — relevé approximatif', 'middle');
    return g;
  }

  function initAnatomy({ openRoom }) {
    const host = $('[data-anatomy]');
    if (!host) return;
    const bag = new Bag();

    const img = h('img', { class: 'ana-img', src: src(30, 'l'), srcset: `${src(30, 'm')} 720w, ${src(30, 'l')} 1080w`, sizes: '(max-width: 900px) 70vw, 46vw', width: 1080, height: 1440, loading: 'lazy', alt: 'Look 30, planche d’étude — robe longue rose métallique drapée, masque intégral.' });
    const plate = h('div', { class: 'ana-plate' }, img, graphicLayer());
    const marks = LOOK30.details.map((d, i) => h('button', {
      class: 'ana-mark', type: 'button', dataset: { i },
      style: { left: `${(d.pt[0] / 1080) * 100}%`, top: `${(d.pt[1] / 1440) * 100}%` },
      'aria-label': `Repère ${d.id} — ${d.label}`, 'aria-expanded': 'false',
    }, h('span', { class: 'mono' }, d.id)));
    const pop = h('div', { class: 'ana-pop', role: 'dialog', 'aria-modal': 'false', 'aria-label': 'Commentaire du repère', hidden: true });
    plate.append(h('div', { class: 'ana-marks' }, marks));

    // ruler along the frame (pixel scale of the source)
    const ruler = h('div', { class: 'ana-ruler mono', 'aria-hidden': 'true' },
      ...[0, 240, 480, 720, 960, 1200, 1440].map((y) => h('span', { style: { top: `${(y / 1440) * 100}%` } }, String(y))));

    const frame = h('div', { class: 'ana-frame' }, h('div', { class: 'ana-window' }, plate), ruler, pop, h('span', { class: 'ana-corner tl', 'aria-hidden': 'true' }), h('span', { class: 'ana-corner br', 'aria-hidden': 'true' }));
    const status = h('p', { class: 'ana-status mono', 'aria-hidden': 'true' });

    const stepsEl = h('ol', { class: 'ana-steps' }, STEPS.map((s, i) => h('li', { class: 'ana-step', dataset: { step: i } },
      h('p', { class: 'mono red' }, s.no),
      h('h3', {}, s.title),
      h('div', { class: 'ana-obs' }, h('p', { class: 'mono small' }, 'Observation'), h('p', {}, s.obs)),
      h('div', { class: 'ana-int' }, h('p', { class: 'mono small' }, 'Interprétation'), h('p', {}, s.int)),
      i === STEPS.length - 1 ? h('button', { class: 'cta', type: 'button', dataset: { anaRoom: '' } }, 'Examiner l’objet — salle 30 ', h('span', { 'aria-hidden': 'true' }, '↗')) : null,
    )));

    host.append(h('div', { class: 'ana-sticky' }, frame, status), stepsEl);

    let current = -1;
    let openMark = null;
    function setStep(i) {
      if (i === current) return;
      current = i;
      const s = STEPS[i];
      const v = s.view ? frameFor(D[s.view].box) : { s: 1, tx: 0, ty: 0 };
      plate.style.transform = `translate(${v.tx * 100}%, ${v.ty * 100}%) scale(${v.s})`;
      frame.classList.toggle('is-graphic', !!s.graphic);
      frame.classList.toggle('is-cropped', v.s > 1.01);
      status.textContent = `${s.no} — ${s.title}${s.view ? ` · repère ${s.view} · ×${v.s.toFixed(2).replace('.', ',')}` : ' · vue entière'}`;
      $$('.ana-step', stepsEl).forEach((li, k) => li.classList.toggle('is-active', k === i));
      closePop();
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setStep(+e.target.dataset.step); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    $$('.ana-step', stepsEl).forEach((li) => io.observe(li));
    bag.add(() => io.disconnect());
    setStep(0);

    // marks → editorial popover
    function closePop() {
      pop.hidden = true;
      openMark?.setAttribute('aria-expanded', 'false');
      openMark = null;
    }
    function showPop(btn) {
      const d = LOOK30.details[+btn.dataset.i];
      const bg = cropBackground(d.box);
      pop.replaceChildren(
        h('div', { class: 'ana-pop__crop', style: { backgroundImage: `url(${src(30, 'm')})`, backgroundSize: bg.size, backgroundPosition: bg.position, aspectRatio: bg.ratio } }),
        h('p', { class: 'mono red' }, `${d.id} — ${d.label}`),
        h('p', { class: 'ana-pop__obs' }, d.obs),
        h('p', { class: 'ana-pop__int' }, d.int),
        h('button', { class: 'mono link-btn', type: 'button', onclick: closePop }, 'Fermer'),
      );
      pop.hidden = false;
      const left = parseFloat(btn.style.left);
      pop.classList.toggle('left', left > 50);
      pop.style.top = `${Math.min(70, Math.max(4, parseFloat(btn.style.top) - 8))}%`;
      openMark?.setAttribute('aria-expanded', 'false');
      openMark = btn;
      btn.setAttribute('aria-expanded', 'true');
      $('button', pop).focus({ preventScroll: true });
    }
    bag.on(plate, 'click', (e) => {
      const m = e.target.closest('.ana-mark');
      if (!m) return;
      if (openMark === m) closePop(); else showPop(m);
    });
    bag.on(document, 'keydown', (e) => { if (e.key === 'Escape' && !pop.hidden) { const m = openMark; closePop(); m?.focus(); } });
    bag.on(document, 'pointerdown', (e) => { if (!pop.hidden && !pop.contains(e.target) && !e.target.closest('.ana-mark')) closePop(); });

    bag.on(stepsEl, 'click', (e) => {
      const b = e.target.closest('[data-ana-room]');
      if (b) openRoom({ fromEl: plate, returnFocus: b });
    });

    if (reduced()) plate.style.transition = 'none';
    return () => bag.clear();
  }

  AFTERIMAGE['chapters/anatomy'] = { initAnatomy };
})();
