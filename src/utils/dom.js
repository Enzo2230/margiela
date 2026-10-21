(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  /** Tiny element factory: h('button', { class: 'x', onclick }, 'label') */
  function h(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (k === 'style' && typeof v === 'object') {
        for (const [sk, sv] of Object.entries(v)) {
          if (sk.startsWith('--')) el.style.setProperty(sk, sv);
          else el.style[sk] = sv;
        }
      } else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'html') el.innerHTML = v;
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    }
    for (const c of children.flat()) {
      if (c == null || c === false) continue;
      el.append(c.nodeType ? c : document.createTextNode(String(c)));
    }
    return el;
  }

  const pad = (n, len = 2) => String(n).padStart(len, '0');
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  /** Collects listeners so a component can tear everything down. */
  class Bag {
    constructor() { this.fns = []; }
    on(target, type, fn, opts) {
      target.addEventListener(type, fn, opts);
      this.fns.push(() => target.removeEventListener(type, fn, opts));
      return fn;
    }
    add(fn) { this.fns.push(fn); }
    clear() { this.fns.splice(0).forEach((f) => f()); }
  }

  /** Announces a short message to screen readers. */
  function announce(msg) {
    const live = document.getElementById('live');
    if (!live) return;
    live.textContent = '';
    requestAnimationFrame(() => { live.textContent = msg; });
  }

  AFTERIMAGE['utils/dom'] = { $, $$, h, pad, clamp, lerp, Bag, announce };
})();
