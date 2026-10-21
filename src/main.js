// THE AFTER-IMAGE — entry point. Wires chapters and shared components together.
(() => {
  'use strict';

  const { initHud } = AFTERIMAGE['components/hud'];
  const { initSound } = AFTERIMAGE['components/sound'];
  const { createViewer } = AFTERIMAGE['components/viewer'];
  const { createRoom } = AFTERIMAGE['components/room30'];
  const { initOpening } = AFTERIMAGE['chapters/opening'];
  const { initRunway } = AFTERIMAGE['chapters/runway'];
  const { initMaterial } = AFTERIMAGE['chapters/material'];
  const { initAnatomy } = AFTERIMAGE['chapters/anatomy'];
  const { initTrace } = AFTERIMAGE['chapters/trace'];
  const { $ } = AFTERIMAGE['utils/dom'];
  const { reduced } = AFTERIMAGE['utils/motion'];

  document.documentElement.classList.add('js');

  function safe(name, fn) {
    try { return fn(); } catch (err) {
      console.error(`[after-image] ${name} n'a pas pu démarrer`, err);
      return null;
    }
  }

  let runway = null;
  let trace = null;
  let viewer = null;
  let room = null;

  const showIndex = () => runway?.showIndex();
  const openViewer = (n, opts) => viewer?.open(n, opts);
  const openRoom = (opts = {}) => {
    if (!opts.fromEl && !opts.returnFocus) {
      // opened from the chapter index: start from the threshold of the room
      const th = $('#salle-30');
      if (th) { th.scrollIntoView({ behavior: 'auto', block: 'start' }); opts.fromEl = $('.threshold__slit .clip'); }
    }
    room?.open(opts);
  };

  viewer = safe('viewer', () => createViewer({
    onOpenRoom: (o) => room?.open({ fromEl: $('.viewer__zoom'), ...o }),
    onCompose: (n) => trace?.setLook(n),
  }));
  room = safe('room 30', () => createRoom({
    onOpenViewer: (n) => viewer?.open(n),
    onShowIndex: showIndex,
  }));

  safe('sound', initSound);
  safe('opening', initOpening);
  runway = safe('runway', () => initRunway({ openViewer, openRoom }));
  safe('material', initMaterial);
  safe('anatomy', () => initAnatomy({ openRoom }));
  trace = safe('trace', initTrace);
  safe('hud', () => initHud({ onShowIndex: showIndex, onOpenRoom: () => openRoom() }));

  // deep link: #salle-30 opens the room once the page is ready
  if (location.hash === '#salle-30') {
    requestAnimationFrame(() => openRoom({ fromEl: $('.threshold__slit .clip') }));
  }

  if (reduced()) document.documentElement.style.scrollBehavior = 'auto';
})();
