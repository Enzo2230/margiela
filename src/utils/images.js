(() => {
  'use strict';

  const { LOOKS } = AFTERIMAGE['data/looks'];
  const { NOTES } = AFTERIMAGE['data/notes'];
  const { h, pad } = AFTERIMAGE['utils/dom'];

  const TOTAL = LOOKS.length;
  const look = (n) => LOOKS[n - 1];

  /** Optimised derivative: s = 360px, m = 720px, l = 1080px (WebP). */
  const src = (n, size = 'm') => `assets/looks/look-${pad(n)}-${size}.webp`;
  const srcset = (n) => `${src(n, 's')} 360w, ${src(n, 'm')} 720w, ${src(n, 'l')} 1080w`;
  /** The untouched source photograph, loaded only for close inspection. */
  const original = (n) => LOOKS[n - 1].file;

  const note = (n) => NOTES[n] || '';
  const altFor = (n) => `Look ${n} — ${note(n)}`;

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Image introuvable : ${url}`));
      img.src = url;
    });
  }

  /** Responsive, lazy <img> with the sampled average colour as placeholder. */
  function lookImg(n, { sizes = '(max-width: 760px) 92vw, 40vw', cls = '', eager = false, alt } = {}) {
    const l = look(n);
    return h('img', {
      class: `look-img ${cls}`.trim(),
      src: src(n, 'm'),
      srcset: srcset(n),
      sizes,
      width: l.w,
      height: l.h,
      alt: alt ?? altFor(n),
      loading: eager ? 'eager' : 'lazy',
      decoding: 'async',
      style: { backgroundColor: l.avg },
      onerror: (e) => e.currentTarget.classList.add('is-broken'),
    });
  }

  AFTERIMAGE['utils/images'] = { TOTAL, look, src, srcset, original, note, altFor, loadImage, lookImg };
})();
