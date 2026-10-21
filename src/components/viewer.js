// Detail view for any of the 76 looks: immersive, with metadata, automatic detail crops,
// close inspection on the untouched original, previous / next navigation (buttons,
// arrow keys, swipe) and a bridge to the poster generator.
(() => {
  'use strict';

  const { $, h, pad, clamp } = AFTERIMAGE['utils/dom'];
  const { TOTAL, look, src, original, note, altFor, loadImage } = AFTERIMAGE['utils/images'];
  const { animate, reduced } = AFTERIMAGE['utils/motion'];
  const { visit } = AFTERIMAGE['utils/trace'];
  const { play } = AFTERIMAGE['components/sound'];

  const DETAILS = [
    { label: 'Haut', x: 50, y: 16 },
    { label: 'Milieu', x: 50, y: 46 },
    { label: 'Bas', x: 50, y: 82 },
  ];
  const ZOOM = 2.4;

  function createViewer({ onOpenRoom, onCompose }) {
    const dlg = $('[data-viewer]');
    let current = 1;
    let returnFocus = null;
    let zoomed = false;
    let token = 0;

    const img = h('img', { class: 'viewer__img', alt: '', width: 1080, height: 1440 });
    const zoomBtn = h('button', { class: 'viewer__zoom', type: 'button', 'aria-pressed': 'false', 'aria-label': 'Examiner la photographie (zoom ×2,4 sur l’original)' }, img);
    const count = h('p', { class: 'mono viewer__count' });
    const num = h('h2', { class: 'viewer__num' });
    const noteEl = h('p', { class: 'viewer__note' });
    const dl = h('dl', { class: 'viewer__dl mono' });
    const crops = h('div', { class: 'viewer__crops' });
    const special = h('div', { class: 'viewer__special' });
    const seq = h('nav', { class: 'viewer__seq', 'aria-label': 'Looks voisins' });
    const prevBtn = h('button', { class: 'viewer__nav viewer__nav--prev mono', type: 'button' });
    const nextBtn = h('button', { class: 'viewer__nav viewer__nav--next mono', type: 'button' });
    const hint = h('p', { class: 'viewer__hint mono' }, 'Cliquer sur la photographie pour l’examiner · ← → pour naviguer');
    const composeBtn = h('button', { class: 'chip mono', type: 'button' }, 'Composer une relique avec ce look →');

    const inner = h('div', { class: 'viewer__inner' },
      h('header', { class: 'viewer__top' },
        h('button', { class: 'mono viewer__close', type: 'button', 'data-close': '' }, '← Retour à l’archive ', h('span', { class: 'viewer__esc' }, '(Échap)')),
        count,
      ),
      h('div', { class: 'viewer__stage' },
        prevBtn,
        h('figure', { class: 'viewer__figure' }, zoomBtn, hint),
        nextBtn,
      ),
      h('aside', { class: 'viewer__meta' },
        h('p', { class: 'mono red' }, 'Fiche d’archive'),
        num,
        h('div', { class: 'viewer__obs' }, h('p', { class: 'mono small' }, 'Observation'), noteEl),
        dl,
        h('div', { class: 'viewer__details' }, h('p', { class: 'mono small' }, 'Détails photographiques'), crops),
        special,
        h('div', { class: 'viewer__actions' }, composeBtn),
        seq,
      ),
    );
    dlg.append(inner);

    // ------------------------------------------------------------------ zoom
    const setOrigin = (x, y) => { img.style.transformOrigin = `${x}% ${y}%`; };
    const setZoom = (on, x = 50, y = 40) => {
      zoomed = on;
      zoomBtn.setAttribute('aria-pressed', String(on));
      dlg.classList.toggle('is-zoomed', on);
      setOrigin(x, y);
      img.style.transform = on ? `scale(${ZOOM})` : '';
      if (on) {
        const n = current;
        const full = original(n);
        if (!img.dataset.full) {
          loadImage(full).then(() => { if (current === n && zoomed) { img.src = full; img.dataset.full = '1'; } }).catch(() => {});
        }
      }
    };
    zoomBtn.addEventListener('click', (e) => {
      if (zoomed) { setZoom(false); return; }
      const r = zoomBtn.getBoundingClientRect();
      const x = e.detail ? ((e.clientX - r.left) / r.width) * 100 : 50;
      const y = e.detail ? ((e.clientY - r.top) / r.height) * 100 : 40;
      setZoom(true, clamp(x, 0, 100), clamp(y, 0, 100));
      play('shutter');
    });
    zoomBtn.addEventListener('pointermove', (e) => {
      if (!zoomed || e.pointerType !== 'mouse') return;
      const r = zoomBtn.getBoundingClientRect();
      setOrigin(clamp(((e.clientX - r.left) / r.width) * 100, 0, 100), clamp(((e.clientY - r.top) / r.height) * 100, 0, 100));
    });
    // touch: drag to pan when zoomed, swipe to change look otherwise
    let down = null;
    zoomBtn.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') down = { x: e.clientX, y: e.clientY, t: Date.now() }; });
    zoomBtn.addEventListener('pointerup', (e) => {
      if (!down) return;
      const dx = e.clientX - down.x;
      const dy = e.clientY - down.y;
      if (!zoomed && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        e.preventDefault();
        show(current + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
        down = null;
        zoomBtn.dataset.swiped = '1';
        setTimeout(() => delete zoomBtn.dataset.swiped, 50);
        return;
      }
      down = null;
    });
    zoomBtn.addEventListener('click', (e) => { if (zoomBtn.dataset.swiped) e.stopImmediatePropagation(); }, true);

    // ------------------------------------------------------------------ render
    async function show(n, dir = 0) {
      n = ((n - 1 + TOTAL) % TOTAL) + 1;
      current = n;
      const my = ++token;
      const l = look(n);
      visit(n);
      setZoom(false);
      delete img.dataset.full;

      count.textContent = `${pad(n)} / ${TOTAL}`;
      num.innerHTML = `Nº&nbsp;${pad(n)}`;
      noteEl.textContent = note(n);
      img.alt = altFor(n);
      dl.replaceChildren(
        h('dt', {}, 'Look'), h('dd', {}, `${n} / ${TOTAL}`),
        h('dt', {}, 'Fichier source'), h('dd', {}, l.file),
        h('dt', {}, 'Dimensions'), h('dd', {}, `${l.w} × ${l.h} px`),
        h('dt', {}, 'Passage'), h('dd', {}, n === 1 ? 'ouverture du défilé' : n === TOTAL ? 'dernier passage' : `entre Nº ${pad(n - 1)} et Nº ${pad(n + 1)}`),
        h('dt', {}, 'Palette relevée'), h('dd', { class: 'viewer__palette' }, l.palette.map((c) => h('i', { style: { background: c }, title: c })), h('span', {}, 'échantillon automatique')),
      );
      crops.replaceChildren(...DETAILS.map((d) => h('button', {
        class: 'viewer__crop', type: 'button', 'aria-label': `Examiner le détail : ${d.label.toLowerCase()}`,
        style: { backgroundImage: `url(${src(n, 'm')})`, backgroundPosition: `${d.x}% ${d.y}%` },
        onclick: () => { setZoom(true, d.x, d.y); play('shutter'); },
      }, h('span', { class: 'mono' }, d.label))));
      special.replaceChildren();
      if (n === 30) {
        special.append(
          h('p', { class: 'mono red' }, 'Pièce centrale de l’archive'),
          h('button', { class: 'cta', type: 'button', onclick: () => { close(true); onOpenRoom?.({ returnFocus }); } }, 'Entrer dans la salle 30 ', h('span', { 'aria-hidden': 'true' }, '↗')),
        );
      }
      const p = ((n - 2 + TOTAL) % TOTAL) + 1;
      const q = (n % TOTAL) + 1;
      prevBtn.replaceChildren('←', h('span', {}, pad(p)));
      nextBtn.replaceChildren(h('span', {}, pad(q)), '→');
      prevBtn.setAttribute('aria-label', `Look précédent : ${p}`);
      nextBtn.setAttribute('aria-label', `Look suivant : ${q}`);
      seq.replaceChildren(...[p, n, q].map((k) => h('button', {
        class: `viewer__seq-item${k === n ? ' is-current' : ''}`, type: 'button', 'aria-label': `Look ${k}`, 'aria-current': k === n ? 'true' : null,
        onclick: () => { if (k !== n) show(k, k === q ? 1 : -1); },
      }, h('img', { src: src(k, 's'), alt: '', width: 360, height: 480, loading: 'lazy' }), h('span', { class: 'mono' }, `Nº ${pad(k)}`))));

      // placeholder first (small, cached), then the large derivative
      img.style.backgroundColor = l.avg;
      if (dir && !reduced()) {
        img.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${dir * -24}px)` }], { duration: 160, fill: 'forwards' });
      }
      try { await loadImage(src(n, 'l')); } catch { /* keep whatever is shown */ }
      if (my !== token) return;
      img.src = src(n, 'l');
      img.getAnimations().forEach((a) => a.cancel());
      if (dir && !reduced()) img.animate([{ opacity: 0, transform: `translateX(${dir * 24}px)` }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.2,.7,.1,1)' });
      // warm the neighbours
      [p, q].forEach((k) => { const i = new Image(); i.src = src(k, 'l'); });
    }

    prevBtn.addEventListener('click', () => { show(current - 1, -1); play('shutter'); });
    nextBtn.addEventListener('click', () => { show(current + 1, 1); play('shutter'); });
    composeBtn.addEventListener('click', () => { const n = current; close(true); onCompose?.(n); });
    dlg.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); show(current + 1, 1); play('shutter'); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(current - 1, -1); play('shutter'); }
    });
    dlg.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); if (zoomed) setZoom(false); else close(); });

    async function open(n, { returnFocus: rf } = {}) {
      returnFocus = rf || document.activeElement;
      if (!dlg.open) dlg.showModal();
      document.documentElement.classList.add('has-modal');
      show(n);
      play('shutter');
      animate(inner, [{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)' }], { duration: 650, easing: 'cubic-bezier(.7,0,.2,1)' });
      $('[data-close]', dlg).focus();
    }

    async function close(silent = false) {
      if (!dlg.open) return;
      await animate(inner, [{ clipPath: 'inset(0 0 0% 0)' }, { clipPath: 'inset(100% 0 0 0)' }], { duration: silent ? 1 : 420, easing: 'cubic-bezier(.7,0,.2,1)' });
      dlg.close();
      inner.getAnimations().forEach((a) => a.cancel());
      document.documentElement.classList.remove('has-modal');
      if (!silent && returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    }

    return { open, close, get current() { return current; } };
  }

  AFTERIMAGE['components/viewer'] = { createViewer };
})();
