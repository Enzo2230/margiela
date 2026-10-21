// Global navigation: current chapter, object number, progress, chapter index dialog.
(() => {
  'use strict';

  const { $, $$, Bag } = AFTERIMAGE['utils/dom'];
  const { reduced } = AFTERIMAGE['utils/motion'];

  const NAMES = {
    object: '00 — The Object',
    runway: 'I — The Runway',
    material: 'II — Material Memory',
    anatomy: 'III — Anatomy',
    trace: 'IV — The Trace',
    footer: 'Colophon',
  };

  let objectEl = null;
  function setObject(value) {
    if (objectEl && objectEl.textContent !== value) objectEl.textContent = value;
  }

  function initHud({ onShowIndex, onOpenRoom }) {
    const bag = new Bag();
    objectEl = $('[data-hud-object]');
    const links = $$('[data-chapter-link]');
    const mobile = $('[data-mobile-chapter]');
    const progress = $('[data-progress]');
    const sections = $$('[data-chapter-section]');
    const footer = $('.footer');

    const setChapter = (id, el) => {
      if (document.body.dataset.chapter === id) return;
      document.body.dataset.chapter = id;
      links.forEach((a) => a.setAttribute('aria-current', String(a.dataset.chapterLink === id)));
      if (mobile) mobile.textContent = NAMES[id] || '';
      if (el?.dataset.object) setObject(el.dataset.object);
    };

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        if (e.target === footer) setChapter('footer');
        else setChapter(e.target.dataset.chapterSection, e.target);
      });
    }, { rootMargin: '-50% 0px -50% 0px' });
    sections.forEach((s) => io.observe(s));
    if (footer) io.observe(footer);
    bag.add(() => io.disconnect());

    // sub-zones that carry their own object number (e.g. the threshold of room 30)
    const subIo = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting && e.target.dataset.object) setObject(e.target.dataset.object); });
    }, { rootMargin: '-50% 0px -50% 0px' });
    const observeSub = () => $$('[data-threshold]').forEach((el) => subIo.observe(el));
    observeSub();
    bag.add(() => subIo.disconnect());

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const max = document.documentElement.scrollHeight - innerHeight;
        if (progress) progress.style.transform = `scaleY(${max > 0 ? scrollY / max : 0})`;
      });
    };
    bag.on(window, 'scroll', onScroll, { passive: true });
    onScroll();

    // chapter index dialog
    const dlg = $('[data-chapters]');
    const opener = $('[data-open-index]');
    bag.on(opener, 'click', () => dlg.showModal());
    bag.on($('[data-close]', dlg), 'click', () => dlg.close());
    bag.on(dlg, 'click', (e) => {
      if (e.target === dlg) { dlg.close(); return; }
      const a = e.target.closest('[data-goto]');
      if (!a) return;
      e.preventDefault();
      dlg.close();
      if ('gotoRoom' in a.dataset) { onOpenRoom?.(); return; }
      if ('gotoIndex' in a.dataset) { onShowIndex?.(); return; }
      const target = $(a.getAttribute('href'));
      target?.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth' });
    });

    bag.on($('[data-open-archive]'), 'click', () => onShowIndex?.());

    return { destroy: () => bag.clear() };
  }

  AFTERIMAGE['components/hud'] = { setObject, initHud };
})();
