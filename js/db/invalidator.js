const listeners = new Set();

export function invalidate() {
  listeners.forEach(fn => fn());
}

export function subscribeToChanges(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
