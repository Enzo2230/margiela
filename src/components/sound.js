// Discreet synthesised sound (Web Audio). Off by default; nothing plays before the
// visitor explicitly turns it on. No audio files, no music, no autoplay.
(() => {
  'use strict';

  const { $ } = AFTERIMAGE['utils/dom'];

  let ctx = null;
  let master = null;
  let enabled = false;
  let volume = 0.5;
  let noiseBuf = null;

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = volume * 0.6;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }

  function noise({ dur = 0.2, freq = 2000, q = 0.8, gain = 0.3, type = 'bandpass', attack = 0.005, at = 0 }) {
    const t = ctx.currentTime + at;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(master);
    src.start(t, Math.random() * 0.5, dur + 0.05);
  }

  const SOUNDS = {
    // camera shutter: two short filtered clicks
    shutter() {
      noise({ dur: 0.035, freq: 3800, q: 1.2, gain: 0.55 });
      noise({ dur: 0.05, freq: 2400, q: 1.0, gain: 0.4, at: 0.07 });
    },
    // paper / fabric handled: a few grains of rustle
    paper() {
      const n = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        noise({ dur: 0.05 + Math.random() * 0.09, freq: 1800 + Math.random() * 3200, q: 0.6, gain: 0.12 + Math.random() * 0.1, at: i * (0.02 + Math.random() * 0.05) });
      }
    },
    // archive drawer: low muffled thud
    drawer() {
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(90, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.35);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      o.connect(g).connect(master);
      o.start(t);
      o.stop(t + 0.55);
      noise({ dur: 0.25, freq: 500, q: 0.7, gain: 0.12, type: 'lowpass' });
    },
  };

  function play(name) {
    if (!enabled || !ctx || !SOUNDS[name]) return;
    try { SOUNDS[name](); } catch { /* audio is decorative */ }
  }

  function initSound() {
    const btn = $('[data-sound-toggle]');
    const vol = $('[data-sound-volume]');
    const label = $('[data-sound-label]');
    if (!btn) return;
    if (!(window.AudioContext || window.webkitAudioContext)) {
      btn.hidden = true;
      return;
    }
    btn.addEventListener('click', async () => {
      enabled = !enabled;
      if (enabled) {
        ensure();
        if (ctx.state === 'suspended') await ctx.resume();
      } else if (ctx) {
        await ctx.suspend();
      }
      btn.setAttribute('aria-pressed', String(enabled));
      if (label) label.textContent = enabled ? 'on' : 'off';
      if (vol) vol.hidden = !enabled;
      if (enabled) play('paper');
    });
    vol?.addEventListener('input', () => {
      volume = Number(vol.value) / 100;
      if (master) master.gain.setTargetAtTime(volume * 0.6, ctx.currentTime, 0.05);
    });
  }

  AFTERIMAGE['components/sound'] = { play, initSound };
})();
