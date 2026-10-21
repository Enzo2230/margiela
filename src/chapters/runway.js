// I — THE RUNWAY
// The 76 looks in their runway order, recomposed as a deconstructed magazine:
// spreads of varied composition (monument, trio, contact strip, pair, macro band),
// archive notes, and — between 29 and 31 — the threshold of Room 30.
// A second mode shows the archive as a numbered index (sortable by measured value).
(() => {
  'use strict';

  const { $, $$, h, pad, Bag } = AFTERIMAGE['utils/dom'];
  const { TOTAL, look, lookImg, src, note } = AFTERIMAGE['utils/images'];
  const { reduced, scrollProgress, watch, animate } = AFTERIMAGE['utils/motion'];
  const { hasVisited, onTrace } = AFTERIMAGE['utils/trace'];
  const { LOOKS } = AFTERIMAGE['data/looks'];
  const { LOOK30, cropBackground } = AFTERIMAGE['data/look30'];
  const { setObject } = AFTERIMAGE['components/hud'];

  const PATTERN = ['monument', 'trio', 'strip', 'pair', 'macro', 'trio', 'strip', 'pair'];
  const COUNT = { monument: 1, trio: 3, strip: 5, pair: 2, macro: 1 };

  // Archive notes: artistic interpretation, labelled as such on the page.
  const NOTES = [
    ['Le visage est retiré.', 'Il reste <em>la silhouette.</em>'],
    ['Chaque passage laisse', 'une image <em>derrière lui.</em>'],
    ['Du béton, des conteneurs,', 'soixante-seize <em>apparitions.</em>'],
    ['Ce qui reste n’est pas le vêtement :', 'c’est <em>sa trace.</em>'],
    ['La couleur arrive tard,', 'comme un souvenir <em>qui revient.</em>'],
    ['Archiver, c’est accepter', 'de ne garder <em>qu’un reflet.</em>'],
  ];
  const QUOTES = [
    'Deux silhouettes, une seule respiration.',
    'Le pli comme archive du geste.',
    'Ce qui est couvert devient sculpture.',
    'La matière parle avant le corps.',
    'Une couleur, puis son écho.',
    'Ce qui passe ne revient pas tout à fait.',
    'Un vêtement regardé deux fois n’est plus le même.',
  ];

  function range(a, b) { return Array.from({ length: b - a + 1 }, (_, i) => a + i); }

  /** Builds the sequence of spreads, keeping runway order and isolating Look 30. */
  function planSpreads() {
    const spreads = [];
    let pi = 0;
    let noteI = 0;
    let quoteI = 0;
    const parts = [[1, 29], [31, TOTAL]];
    parts.forEach(([a, b], partIndex) => {
      let n = a;
      while (n <= b) {
        let type = PATTERN[pi % PATTERN.length];
        let c = COUNT[type];
        const remain = b - n + 1;
        if (c > remain) {
          type = remain === 1 ? 'monument' : remain === 2 ? 'pair' : remain === 3 ? 'trio' : 'strip';
          c = remain;
        }
        spreads.push({ type, looks: range(n, n + c - 1), flip: pi % 2 === 1, quote: QUOTES[quoteI++ % QUOTES.length] });
        pi += 1;
        n += c;
        if (pi % 3 === 0 && n <= b) spreads.push({ type: 'note', lines: NOTES[noteI++ % NOTES.length], right: noteI % 2 === 0 });
      }
      if (partIndex === 0) spreads.push({ type: 'room' });
    });
    return spreads;
  }

  // ---------------------------------------------------------------------------- builders
  function swatches(n) {
    return look(n).palette.slice(0, 3).map((c) => h('i', { style: { background: c } }));
  }

  function figure(n, { cls = '', sizes, edge = false } = {}) {
    const fig = h('figure', { class: `look-fig ${cls}`.trim(), dataset: { look: n } },
      edge ? h('span', { class: 'look__edge mono', 'aria-hidden': 'true' }, `▸ ${pad(n)}A`) : null,
      h('button', { class: 'look', type: 'button', dataset: { open: n }, 'aria-label': `Look ${n} — ouvrir la fiche` },
        h('span', { class: 'look__frame' },
          lookImg(n, { sizes }),
          h('span', { class: 'look__grain', 'aria-hidden': 'true' }),
        ),
        h('span', { class: 'look__annot mono', 'aria-hidden': 'true' }, h('b', {}, `Nº ${pad(n)}`), ...swatches(n), 'fiche ↗'),
        h('span', { class: 'look__ref mono', 'aria-hidden': 'true' }, `ARCH./MM26/${pad(n, 3)}`),
      ),
      h('figcaption', { class: 'look__cap mono' }, h('b', {}, `Nº ${pad(n)}`), `Look_${n}.jpg`),
    );
    if (hasVisited(n)) fig.classList.add('is-visited');
    return fig;
  }

  function cropDetail(n, box, label) {
    const bg = cropBackground(box);
    return h('button', {
      class: 'crop-detail', type: 'button', dataset: { open: n }, 'aria-label': `${label} — ouvrir la fiche du look ${n}`,
      style: { backgroundImage: `url(${src(n, 'l')})`, backgroundSize: bg.size, backgroundPosition: bg.position, aspectRatio: bg.ratio },
    });
  }

  const BUILD = {
    monument(s) {
      const [n] = s.looks;
      const box = [300, 280, 780, 760]; // central detail, ×3 approx.
      return h('section', { class: 'spread spread--monument', 'aria-label': `Planche — look ${n}` },
        figure(n, { cls: 'a', sizes: '(max-width: 900px) 84vw, 48vw' }),
        h('div', { class: 'side' },
          h('span', { class: 'spread__numeral', 'aria-hidden': 'true' }, pad(n)),
          cropDetail(n, box, 'Détail recadré'),
          h('p', { class: 'mono' }, h('b', {}, `Nº ${pad(n)}`), ' — détail, recadrage central ×2,25'),
          h('p', { class: 'mono' }, note(n)),
        ),
      );
    },
    trio(s) {
      const [a, b, c] = s.looks;
      return h('section', { class: `spread spread--trio${s.flip ? ' flip' : ''}`, 'aria-label': `Planche — looks ${a} à ${c}` },
        figure(a, { cls: 'a', sizes: '(max-width: 900px) 64vw, 38vw' }),
        figure(b, { cls: 'b', sizes: '(max-width: 900px) 46vw, 22vw' }),
        figure(c, { cls: 'c', sizes: '(max-width: 900px) 46vw, 22vw' }),
      );
    },
    strip(s) {
      const first = s.looks[0];
      const last = s.looks[s.looks.length - 1];
      return h('section', { class: 'spread spread--strip is-dark', 'aria-label': `Planche contact — looks ${first} à ${last}` },
        h('div', { class: 'strip__head mono' },
          h('span', {}, h('b', {}, 'Planche contact'), ` · Nº ${pad(first)} — ${pad(last)}`),
          h('span', {}, `${s.looks.length} vues`),
        ),
        h('div', { class: 'strip__row', style: { '--k': s.looks.length } },
          s.looks.map((n) => figure(n, { sizes: '(max-width: 900px) 52vw, 18vw', edge: true })),
        ),
      );
    },
    pair(s) {
      const [a, b] = s.looks;
      return h('section', { class: `spread spread--pair${s.flip ? ' flip' : ''}`, 'aria-label': `Planche — looks ${a} et ${b}` },
        figure(a, { cls: 'a', sizes: '(max-width: 900px) 100vw, 58vw' }),
        h('div', { class: 'quote' }, h('p', {}, s.quote), h('p', { class: 'mono' }, `Note — Nº ${pad(a)} / Nº ${pad(b)} · interprétation`)),
        figure(b, { cls: 'b', sizes: '(max-width: 900px) 60vw, 22vw' }),
      );
    },
    macro(s) {
      const [n] = s.looks;
      const big = figure(n, { cls: 'big', sizes: '100vw' });
      big.querySelector('.look__frame').classList.add('macro__band');
      big.querySelector('.look').classList.add('macro__band');
      const inset = h('figure', { class: 'macro__inset', 'aria-hidden': 'true' },
        h('span', { class: 'look__frame' }, h('img', { src: src(n, 's'), alt: '', loading: 'lazy', width: 360, height: 480, class: 'look-img' })),
        h('p', { class: 'mono', style: { marginTop: '8px' } }, 'Silhouette entière'),
      );
      return h('section', { class: 'spread spread--macro', 'aria-label': `Bande macro — look ${n}` },
        h('p', { class: 'macro__label mono', 'aria-hidden': 'true' }, `Nº ${pad(n)} — matière, recadrage plein cadre`),
        big, inset,
      );
    },
    note(s) {
      return h('section', { class: `spread spread--note${s.right ? ' right' : ''}`, 'aria-label': 'Note d’archive' },
        h('p', { class: 'note__text', html: `${s.lines[0]}<br>${s.lines[1]}` }),
        h('p', { class: 'note__label mono' }, 'Note d’archive — interprétation'),
      );
    },
    room() {
      const bg = cropBackground(LOOK30.ghostIn29);
      return h('section', { class: 'threshold', id: 'salle-30', dataset: { threshold: '', object: '030' }, 'aria-labelledby': 'threshold-title' },
        h('div', { class: 'threshold__sticky' },
          h('p', { class: 'threshold__kicker mono' }, h('b', {}, 'Salle 30'), ' — pièce centrale de l’archive · entre Nº 29 et Nº 31'),
          h('div', { class: 'threshold__num', 'aria-hidden': 'true' }, '30'),
          h('figure', { class: 'threshold__ghost' },
            h('button', {
              class: 'crop-detail', type: 'button', dataset: { roomFrom: 'ghost' }, 'aria-label': 'Entrer dans la salle 30 depuis l’arrière-plan du look 29',
              style: { backgroundImage: `url(${src(29, 'l')})`, backgroundSize: bg.size, backgroundPosition: bg.position },
            }),
            h('figcaption', { class: 'mono small' }, 'img/Look_29.jpg — arrière-plan, détail. Le Nº 30 traverse l’image précédente avant son propre passage.'),
          ),
          h('figure', { class: 'threshold__slit' },
            h('div', { class: 'clip' }, h('img', { src: src(30, 'l'), srcset: `${src(30, 'm')} 720w, ${src(30, 'l')} 1080w`, sizes: '(max-width: 900px) 92vw, 40vw', alt: 'Look 30 — robe longue rose métallique drapée, masque intégral de la même surface.', loading: 'lazy', width: 1080, height: 1440 })),
            h('span', { class: 'marks', 'aria-hidden': 'true' }),
          ),
          h('div', { class: 'threshold__text' },
            h('h3', { id: 'threshold-title' }, 'Objet', h('br'), h('em', {}, 'Nº 030')),
            h('p', {}, 'Une silhouette entièrement recouverte d’une même surface rose métallique, du masque à la traîne. Elle n’est pas une image parmi d’autres : elle a sa propre salle.'),
            h('p', { class: 'mono small' }, 'Identifié par le nom de fichier, l’ordre de passage et le recoupement visuel avec Look_29.jpg.'),
            h('button', { class: 'cta', type: 'button', dataset: { roomFrom: 'slit' } }, 'Entrer dans la salle 30 ', h('span', { 'aria-hidden': 'true' }, '↗')),
            h('button', { class: 'link-btn mono', type: 'button', dataset: { open: 30, standard: '' } }, 'ou consulter la fiche standard'),
          ),
        ),
      );
    },
  };

  // ---------------------------------------------------------------------------- index
  function buildIndex(grid, openLook) {
    const items = LOOKS.map((l) => {
      const btn = h('button', {
        class: `index-num${l.n === 30 ? ' is-30' : ''}${hasVisited(l.n) ? ' is-visited' : ''}`,
        type: 'button', dataset: { open: l.n },
        'aria-label': `Look ${l.n}${l.n === 30 ? ' — pièce centrale, salle 30' : ''}${hasVisited(l.n) ? ' (consulté)' : ''}`,
      }, String(l.n), h('small', { 'aria-hidden': 'true' }, `${Math.round(l.lum * 100)}`));
      return h('li', { dataset: { n: l.n } }, btn);
    });
    grid.append(...items);
    return items;
  }

  function sortIndex(grid, mode) {
    const lis = $$('li', grid);
    const first = new Map(lis.map((li) => [li, li.getBoundingClientRect()]));
    const sorted = lis.slice().sort((a, b) => {
      const A = look(+a.dataset.n);
      const B = look(+b.dataset.n);
      return mode === 'tone' ? B.lum - A.lum : A.n - B.n;
    });
    grid.append(...sorted);
    if (reduced()) return;
    sorted.forEach((li, i) => {
      const f = first.get(li);
      const l = li.getBoundingClientRect();
      const dx = f.left - l.left;
      const dy = f.top - l.top;
      if (dx || dy) li.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 700 + (i % 12) * 12, easing: 'cubic-bezier(.2,.7,.1,1)' });
    });
  }

  // ---------------------------------------------------------------------------- init
  function initRunway({ openViewer, openRoom }) {
    const sec = $('#runway');
    const ed = $('[data-runway-editorial]', sec);
    const idx = $('[data-runway-index]', sec);
    const grid = $('[data-index-grid]', idx);
    const counter = $('[data-runway-current]', sec);
    const bar = $('[data-runway-bar]', sec);
    const bag = new Bag();

    const frag = document.createDocumentFragment();
    planSpreads().forEach((s) => frag.append(BUILD[s.type](s)));
    ed.append(frag);
    buildIndex(grid);

    // count check: every look 1..76 present exactly once in the editorial flow (+ threshold for 30)
    const present = new Set($$('.look-fig', ed).map((f) => +f.dataset.look));
    present.add(30);
    if (present.size !== TOTAL) console.warn(`[runway] ${present.size}/${TOTAL} looks placés`);

    // reveal by mask + current look tracking
    const figs = $$('.look-fig', ed);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.01 });
    figs.forEach((f) => io.observe(f));
    bag.add(() => io.disconnect());

    const visible = new Set();
    const track = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? visible.add(+e.target.dataset.look) : visible.delete(+e.target.dataset.look)));
      if (!visible.size) return;
      const n = Math.max(...visible);
      counter.textContent = pad(n);
      bar.style.transform = `scaleX(${n / TOTAL})`;
      if (document.body.dataset.chapter === 'runway') setObject(pad(n, 3));
    }, { rootMargin: '-35% 0px -35% 0px' });
    figs.forEach((f) => track.observe(f));
    bag.add(() => track.disconnect());

    // threshold of room 30: scroll-driven opening of the slit
    const th = $('[data-threshold]', ed);
    if (th) {
      let raf = 0;
      const update = () => { raf = 0; th.style.setProperty('--p', reduced() ? 1 : scrollProgress(th).toFixed(3)); };
      const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
      let active = false;
      bag.add(watch(th, () => { if (!active) { active = true; addEventListener('scroll', onScroll, { passive: true }); update(); } },
        () => { active = false; removeEventListener('scroll', onScroll); }));
      bag.add(() => removeEventListener('scroll', onScroll));
    }

    // clicks (delegated): any [data-open] → viewer (30 → room unless "standard"), [data-room-from] → room
    bag.on(sec, 'click', (e) => {
      const roomBtn = e.target.closest('[data-room-from]');
      if (roomBtn) {
        const from = roomBtn.dataset.roomFrom === 'ghost' ? roomBtn : $('.threshold__slit .clip', sec);
        openRoom({ fromEl: from, ghost: roomBtn.dataset.roomFrom === 'ghost', returnFocus: roomBtn });
        return;
      }
      const b = e.target.closest('[data-open]');
      if (!b) return;
      const n = +b.dataset.open;
      if (n === 30 && !('standard' in b.dataset)) openRoom({ fromEl: b, returnFocus: b });
      else openViewer(n, { returnFocus: b });
    });

    // index hover preview (fine pointers)
    const preview = $('[data-index-preview]', idx);
    const pImg = $('[data-index-preview-img]', idx);
    const pCap = $('[data-index-preview-cap]', idx);
    const showPreview = (btn, x, y) => {
      const n = +btn.dataset.open;
      pImg.src = src(n, 's');
      pCap.textContent = `Nº ${pad(n)} — ${note(n)}`;
      const w = 190;
      const left = Math.min(innerWidth - w - 16, x + 24);
      const top = Math.min(innerHeight - 330, Math.max(16, y - 120));
      preview.style.transform = `translate(${left}px, ${top}px)`;
      preview.classList.add('is-on');
    };
    bag.on(grid, 'pointermove', (e) => {
      const b = e.target.closest('.index-num');
      if (b && e.pointerType === 'mouse') showPreview(b, e.clientX, e.clientY); else preview.classList.remove('is-on');
    });
    bag.on(grid, 'pointerleave', () => preview.classList.remove('is-on'));
    bag.on(grid, 'focusin', (e) => {
      const b = e.target.closest('.index-num');
      if (!b || !b.matches(':focus-visible')) return;
      const r = b.getBoundingClientRect();
      showPreview(b, r.right, r.top + r.height / 2);
    });
    bag.on(grid, 'focusout', () => preview.classList.remove('is-on'));

    // modes
    const setMode = (mode) => {
      $$('[data-mode]', sec).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
      const isIndex = mode === 'index';
      ed.hidden = isIndex;
      idx.hidden = !isIndex;
      sec.classList.toggle('is-index', isIndex);
    };
    $$('[data-mode]', sec).forEach((b) => bag.on(b, 'click', () => setMode(b.dataset.mode)));
    $$('[data-sort]', idx).forEach((b) => bag.on(b, 'click', () => {
      $$('[data-sort]', idx).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      sortIndex(grid, b.dataset.sort);
    }));

    // keep "consulté" markers in sync with the visitor's trace
    bag.add(onTrace((t) => {
      t.forEach((n) => {
        $$(`.look-fig[data-look="${n}"]`, ed).forEach((f) => f.classList.add('is-visited'));
        const b = $(`.index-num[data-open="${n}"]`, grid);
        if (b && !b.classList.contains('is-visited')) {
          b.classList.add('is-visited');
          b.setAttribute('aria-label', `${b.getAttribute('aria-label')} (consulté)`);
        }
      });
    }));

    return {
      showIndex() { setMode('index'); sec.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth' }); },
      scrollToLook(n) {
        if (n === 30) { $('#salle-30')?.scrollIntoView({ block: 'center' }); return; }
        const f = $(`.look-fig[data-look="${n}"]`, ed);
        if (!ed.hidden && f) f.scrollIntoView({ block: 'center' });
      },
      destroy() { bag.clear(); },
    };
  }

  AFTERIMAGE['chapters/runway'] = { planSpreads, initRunway };
})();
