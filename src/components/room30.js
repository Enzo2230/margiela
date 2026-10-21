// ROOM 30 — the centrepiece of the archive.
// An exhibition room for a single photograph: monumental plate, catalogue entry,
// numbered annotations (observation vs interpretation), precise reframings,
// a loupe on the original file, and an "after-image" ritual where the visitor's own
// eye produces the complementary image. Entered through an immersive transition
// (from the ghost of Look 30 in the background of Look 29), left with one gesture.
(() => {
  'use strict';

  const { $, $$, h, pad, clamp } = AFTERIMAGE['utils/dom'];
  const { src, original, loadImage } = AFTERIMAGE['utils/images'];
  const { animate, reduced, finePointer } = AFTERIMAGE['utils/motion'];
  const { visit } = AFTERIMAGE['utils/trace'];
  const { LOOK30, frameFor, cropBackground } = AFTERIMAGE['data/look30'];
  const { play } = AFTERIMAGE['components/sound'];

  const FIX_SECONDS = 6;

  function createRoom({ onOpenViewer, onShowIndex }) {
    const dlg = $('[data-room]');
    const D = LOOK30.details;
    let active = -1;
    let loupeOn = false;
    let returnFocus = null;
    let view = { s: 1, tx: 0, ty: 0 };
    let afterTimer = 0;

    // ------------------------------------------------------------------ markup
    const plateImg = h('img', { class: 'room__img', src: src(30, 'l'), alt: 'Look 30 — robe longue rose métallique drapée ; un masque intégral de la même surface recouvre le visage. Au fond, des conteneurs et la silhouette du Look 29 qui s’éloigne.', width: 1080, height: 1440 });
    const spots = D.map((d, i) => h('button', {
      class: 'room__spot', type: 'button', dataset: { i },
      style: { left: `${(d.pt[0] / LOOK30.w) * 100}%`, top: `${(d.pt[1] / LOOK30.h) * 100}%` },
      'aria-label': `${d.id} — ${d.label}`,
    }, h('span', { class: 'mono' }, String(i + 1)), h('em', { class: 'mono', 'aria-hidden': 'true' }, `${d.id} ${d.label}`)));
    const plate = h('div', { class: 'room__plate' }, plateImg, h('div', { class: 'room__spots' }, spots));
    const loupe = h('div', { class: 'room__loupe', 'aria-hidden': 'true' });
    const afterLayer = h('div', { class: 'room__after', hidden: true },
      h('div', { class: 'room__after-neg', 'aria-hidden': 'true' }),
      h('div', { class: 'room__fix', 'aria-hidden': 'true' },
        h('svg', { class: 'room__ring', viewBox: '0 0 40 40', html: '<circle cx="20" cy="20" r="17" /><circle class="p" cx="20" cy="20" r="17" />' }),
      ),
      h('div', { class: 'room__after-text' },
        h('p', { class: 'mono', dataset: { afterMsg: '' } }),
        h('p', { class: 'mono room__after-count', dataset: { afterCount: '' } }),
        h('div', { class: 'room__after-actions' },
          h('button', { class: 'chip mono', type: 'button', dataset: { afterNow: '' } }, 'Révéler maintenant'),
          h('button', { class: 'chip mono', type: 'button', dataset: { afterExit: '' } }, 'Revenir à l’image'),
        ),
      ),
    );
    const frame = h('div', { class: 'room__frame' }, plate, loupe, afterLayer, h('span', { class: 'room__marks', 'aria-hidden': 'true' }));

    const capId = h('p', { class: 'mono room__cap-id' });
    const capObs = h('p', { class: 'room__cap-obs' });
    const capInt = h('p', { class: 'room__cap-int' });
    const caption = h('div', { class: 'room__caption', 'aria-live': 'polite' }, capId, capObs, capInt);

    const obsList = h('ol', { class: 'room__obs' }, D.map((d, i) => h('li', {},
      h('button', { type: 'button', dataset: { i } }, h('span', { class: 'mono' }, d.id), d.label))));

    const cropBtns = D.map((d, i) => {
      const bg = cropBackground(d.box);
      return h('button', {
        class: 'room__crop', type: 'button', dataset: { i }, 'aria-label': `Recadrage ${d.id} — ${d.label}`,
        style: { backgroundImage: `url(${src(30, 'm')})`, backgroundSize: bg.size, backgroundPosition: bg.position },
      }, h('span', { class: 'mono' }, d.id));
    });
    const wholeBtn = h('button', { class: 'room__crop room__crop--whole', type: 'button', dataset: { i: -1 }, 'aria-label': 'Vue entière', style: { backgroundImage: `url(${src(30, 's')})` } }, h('span', { class: 'mono' }, '30.0'));

    const loupeBtn = h('button', { class: 'chip mono', type: 'button', 'aria-pressed': 'false' }, 'Loupe ×2,5');
    const afterBtn = h('button', { class: 'chip mono', type: 'button' }, 'After-image ◐');

    const seq = h('nav', { class: 'room__seq', 'aria-label': 'Séquence autour du look 30' },
      h('p', { class: 'mono' }, 'Séquence'),
      ...[28, 29, 30, 31, 32].map((k) => h('button', {
        class: `room__seq-item${k === 30 ? ' is-current' : ''}`, type: 'button', dataset: { seq: k },
        'aria-label': k === 30 ? 'Look 30 (vous êtes ici)' : `Ouvrir la fiche du look ${k}`, 'aria-current': k === 30 ? 'true' : null,
      }, h('img', { src: src(k, 's'), alt: '', width: 360, height: 480, loading: 'lazy' }), h('span', { class: 'mono' }, pad(k)))),
      h('button', { class: 'link-btn mono room__all', type: 'button', dataset: { all: '' } }, 'Les 76 looks →'),
    );

    const inner = h('div', { class: 'room__inner' },
      h('header', { class: 'room__top' },
        h('button', { class: 'mono room__close', type: 'button', dataset: { close: '' } }, '← Retour à la galerie ', h('span', { class: 'room__esc' }, '(Échap)')),
        h('p', { class: 'mono room__where' }, h('span', { class: 'red' }, 'Salle 30'), ' — pièce centrale · 1 / 76'),
        h('div', { class: 'room__tools' }, loupeBtn, afterBtn),
      ),
      h('aside', { class: 'room__cat' },
        h('div', { class: 'room__bignum', 'aria-hidden': 'true' }, '30'),
        h('p', { class: 'mono red' }, 'Objet Nº 030 / 076'),
        h('h2', { class: 'room__title' }, `« ${LOOK30.roomTitle} »`),
        h('p', { class: 'mono small room__title-note' }, 'Titre de salle — interprétation'),
        h('dl', { class: 'room__dl mono' },
          h('dt', {}, 'Fichier'), h('dd', {}, LOOK30.file),
          h('dt', {}, 'Format'), h('dd', {}, '1080 × 1440 px'),
          h('dt', {}, 'Passage'), h('dd', {}, 'entre Nº 29 et Nº 31'),
          h('dt', {}, 'Identification'), h('dd', {}, 'nom de fichier, ordre de passage, recoupement visuel avec Look_29.jpg'),
        ),
        h('p', { class: 'mono small room__legend' }, h('span', { class: 'red' }, '●'), ' observation : ce qui est visible · ', h('em', {}, 'italique'), ' : interprétation'),
        obsList,
      ),
      h('div', { class: 'room__stage' }, frame, caption),
      h('aside', { class: 'room__crops' }, h('p', { class: 'mono' }, 'Recadrages'), h('div', { class: 'room__crop-list' }, wholeBtn, ...cropBtns)),
      seq,
    );
    dlg.append(inner);

    // ------------------------------------------------------------------ framing
    function applyView(v) {
      view = v;
      plate.style.transform = `translate(${v.tx * 100}%, ${v.ty * 100}%) scale(${v.s})`;
      frame.classList.toggle('is-cropped', v.s > 1.01);
    }

    function select(i, { sound = true } = {}) {
      active = i;
      $$('[data-i]', inner).forEach((b) => { if (+b.dataset.i === i) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
      if (i < 0) {
        applyView({ s: 1, tx: 0, ty: 0 });
        capId.textContent = '30.0 — Vue entière';
        capObs.textContent = 'Une silhouette couverte de la tête aux pieds par la même surface rose métallique, sur le béton, entre les conteneurs.';
        capInt.textContent = 'Un objet plus qu’une personne : la robe se tient seule, comme une sculpture qui marche.';
      } else {
        const d = D[i];
        applyView(frameFor(d.box));
        capId.textContent = `${d.id} — ${d.label}`;
        capObs.textContent = d.obs;
        capInt.textContent = d.int;
      }
      if (sound) play('paper');
    }

    inner.addEventListener('click', (e) => {
      const t = e.target.closest('[data-i]');
      if (t && inner.contains(t)) { select(+t.dataset.i); return; }
      const sq = e.target.closest('[data-seq]');
      if (sq) {
        const k = +sq.dataset.seq;
        if (k === 30) { select(-1); return; }
        close({ silent: true }).then(() => onOpenViewer?.(k));
        return;
      }
      if (e.target.closest('[data-all]')) { close({ silent: true }).then(() => onShowIndex?.()); return; }
      if (e.target.closest('[data-close]')) close();
    });
    // clicking the plate itself (outside spots) returns to the whole view when cropped
    plate.addEventListener('click', (e) => { if (!e.target.closest('.room__spot') && view.s > 1.01 && !loupeOn) select(-1); });

    // ------------------------------------------------------------------ loupe
    let fullReady = false;
    const ensureFull = () => {
      if (fullReady) return;
      loadImage(original(30)).then(() => {
        fullReady = true;
        plateImg.src = original(30);
        loupe.style.backgroundImage = `url(${original(30)})`;
      }).catch(() => { loupe.style.backgroundImage = `url(${src(30, 'l')})`; });
    };
    const MAG = 2.5;
    function moveLoupe(clientX, clientY) {
      const r = frame.getBoundingClientRect();
      const lx = clientX - r.left;
      const ly = clientY - r.top;
      if (lx < 0 || ly < 0 || lx > r.width || ly > r.height) { loupe.classList.remove('is-on'); return; }
      const fx = clamp((lx / r.width - view.tx) / view.s, 0, 1);
      const fy = clamp((ly / r.height - view.ty) / view.s, 0, 1);
      const R = loupe.offsetWidth / 2;
      const bw = r.width * view.s * MAG;
      const bh = r.height * view.s * MAG;
      loupe.style.backgroundSize = `${bw}px ${bh}px`;
      loupe.style.backgroundPosition = `${-(fx * bw - R)}px ${-(fy * bh - R)}px`;
      loupe.style.transform = `translate(${lx - R}px, ${ly - R}px)`;
      loupe.classList.add('is-on');
    }
    loupeBtn.addEventListener('click', () => {
      loupeOn = !loupeOn;
      loupeBtn.setAttribute('aria-pressed', String(loupeOn));
      frame.classList.toggle('has-loupe', loupeOn);
      if (loupeOn) {
        ensureFull();
        if (!finePointer()) {
          const r = frame.getBoundingClientRect();
          moveLoupe(r.left + r.width * 0.52, r.top + r.height * 0.3);
        }
      } else loupe.classList.remove('is-on');
    });
    frame.addEventListener('pointermove', (e) => { if (loupeOn) moveLoupe(e.clientX, e.clientY); });
    frame.addEventListener('pointerleave', () => loupe.classList.remove('is-on'));
    frame.addEventListener('pointerdown', (e) => {
      if (!loupeOn || e.pointerType === 'mouse') return;
      frame.setPointerCapture(e.pointerId);
      moveLoupe(e.clientX, e.clientY);
    });

    // ------------------------------------------------------------------ after-image ritual
    const msg = $('[data-after-msg]', afterLayer);
    const cnt = $('[data-after-count]', afterLayer);
    const ring = $('.room__ring .p', afterLayer);
    const neg = $('.room__after-neg', afterLayer);
    neg.style.backgroundImage = `url(${src(30, 'l')})`;

    function startAfter() {
      select(-1, { sound: false });
      afterLayer.hidden = false;
      frame.classList.add('is-fixing');
      frame.classList.remove('is-after');
      msg.textContent = 'Fixez le point rouge sans bouger les yeux.';
      let left = FIX_SECONDS;
      cnt.textContent = `${left} s`;
      ring.style.animation = 'none';
      void ring.getBoundingClientRect();
      ring.style.animation = reduced() ? 'none' : `ring ${FIX_SECONDS}s linear forwards`;
      clearInterval(afterTimer);
      afterTimer = setInterval(() => {
        left -= 1;
        cnt.textContent = `${left} s`;
        if (left <= 0) reveal();
      }, 1000);
      $('[data-after-now]', afterLayer).focus();
    }
    function reveal() {
      clearInterval(afterTimer);
      frame.classList.remove('is-fixing');
      frame.classList.add('is-after');
      msg.textContent = 'Ce que vous voyez maintenant n’est plus dans l’image : c’est votre œil qui produit la couleur complémentaire.';
      cnt.textContent = 'After-image rétinienne';
      play('drawer');
    }
    function exitAfter() {
      clearInterval(afterTimer);
      afterLayer.hidden = true;
      frame.classList.remove('is-fixing', 'is-after');
      afterBtn.focus();
    }
    afterBtn.addEventListener('click', startAfter);
    $('[data-after-now]', afterLayer).addEventListener('click', reveal);
    $('[data-after-exit]', afterLayer).addEventListener('click', exitAfter);

    // ------------------------------------------------------------------ keyboard
    dlg.addEventListener('keydown', (e) => {
      if (e.target.closest('input, textarea')) return;
      if (/^[0-7]$/.test(e.key)) { e.preventDefault(); select(+e.key - 1); }
      else if (e.key.toLowerCase() === 'l') loupeBtn.click();
      else if (e.key === 'ArrowRight' && active < D.length - 1) { e.preventDefault(); select(active + 1); }
      else if (e.key === 'ArrowLeft' && active > -1) { e.preventDefault(); select(active - 1); }
    });
    dlg.addEventListener('cancel', (e) => {
      e.preventDefault();
      if (!afterLayer.hidden) exitAfter();
      else close();
    });

    // ------------------------------------------------------------------ open / close
    async function open({ fromEl = null, ghost = false, returnFocus: rf = null } = {}) {
      returnFocus = rf || document.activeElement;
      visit(30);
      select(-1, { sound: false });
      exitAfter();
      dlg.showModal();
      document.documentElement.classList.add('has-modal');
      play('drawer');
      $('[data-close]', inner).focus({ preventScroll: true });

      if (reduced() || !fromEl) {
        inner.classList.remove('is-arriving');
        if (!reduced()) await animate(inner, [{ opacity: 0 }, { opacity: 1 }], { duration: 500 });
        inner.getAnimations().forEach((a) => a.cancel());
        return;
      }

      // immersive transition: the source image travels into the frame of the room
      inner.classList.add('is-arriving');
      const from = fromEl.getBoundingClientRect();
      await new Promise((r) => requestAnimationFrame(r));
      const to = frame.getBoundingClientRect();
      const fly = h('div', { class: 'room__fly', 'aria-hidden': 'true' },
        ghost ? h('div', { class: 'room__fly-ghost', style: (() => { const bg = cropBackground(LOOK30.ghostIn29); return { backgroundImage: `url(${src(29, 'l')})`, backgroundSize: bg.size, backgroundPosition: bg.position }; })() }) : null,
        h('div', { class: 'room__fly-30', style: { backgroundImage: `url(${src(30, 'l')})` } }),
      );
      Object.assign(fly.style, { left: `${to.left}px`, top: `${to.top}px`, width: `${to.width}px`, height: `${to.height}px` });
      dlg.append(fly);
      const sx = from.width / to.width;
      const sy = from.height / to.height;
      const dx = from.left - to.left;
      const dy = from.top - to.top;
      const travel = animate(fly, [
        { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
        { transform: 'none' },
      ], { duration: 1100, easing: 'cubic-bezier(.75,0,.15,1)' });
      if (ghost) {
        animate(fly.firstChild, [{ opacity: 1, filter: 'blur(0px)' }, { opacity: 1, offset: 0.45 }, { opacity: 0, filter: 'blur(6px)' }], { duration: 1100 });
        animate(fly.lastChild, [{ opacity: 0 }, { opacity: 0, offset: 0.35 }, { opacity: 1 }], { duration: 1100 });
      }
      await travel;
      inner.classList.remove('is-arriving');
      inner.classList.add('is-arrived');
      fly.remove();
      setTimeout(() => inner.classList.remove('is-arrived'), 1400);
    }

    async function close({ silent = false } = {}) {
      if (!dlg.open) return;
      clearInterval(afterTimer);
      if (!silent) await animate(inner, [{ opacity: 1 }, { opacity: 0 }], { duration: 380 });
      dlg.close();
      inner.getAnimations().forEach((a) => a.cancel());
      document.documentElement.classList.remove('has-modal');
      if (loupeOn) loupeBtn.click();
      if (!silent && returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    }

    return { open, close };
  }

  AFTERIMAGE['components/room30'] = { createRoom };
})();
