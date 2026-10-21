// The visitor's trace: looks consulted during the visit, in order.
// Kept in memory; mirrored to sessionStorage as a convenience (wrapped, may be unavailable).
(() => {
  'use strict';

  const KEY = 'after-image:trace';
  const listeners = new Set();
  let trace = [];

  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) trace = JSON.parse(raw).filter((n) => Number.isInteger(n) && n >= 1 && n <= 76);
  } catch { /* storage unavailable: memory only */ }

  function persist() {
    try { sessionStorage.setItem(KEY, JSON.stringify(trace)); } catch { /* ignore */ }
  }

  function visit(n) {
    if (trace[trace.length - 1] === n) return;
    trace = trace.filter((x) => x !== n);
    trace.push(n);
    if (trace.length > 24) trace.shift();
    persist();
    listeners.forEach((fn) => fn(trace.slice()));
  }

  const getTrace = () => trace.slice();
  const hasVisited = (n) => trace.includes(n);

  function onTrace(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  AFTERIMAGE['utils/trace'] = { visit, getTrace, hasVisited, onTrace };
})();
