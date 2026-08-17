import { useState, useEffect } from '../lib/preact.js';

/** Store minimalista de publicação/subscrição — evita depender de uma lib externa de estado. */
export function createStore(initial) {
  let state = initial;
  const listeners = new Set();
  return {
    get: () => state,
    set(patch) {
      state = typeof patch === 'function' ? patch(state) : { ...state, ...patch };
      listeners.forEach((l) => l(state));
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

export function useStore(store) {
  const [state, setState] = useState(store.get());
  useEffect(() => store.subscribe(setState), [store]);
  return state;
}

// Estado global de UI (não persistido em Dexie, exceto o que é espelhado nas settings).
export const uiStore = createStore({
  theme: 'system',
  areaFilter: 'all',
  currentView: 'today',
  currentListId: null,
  sidebarOpen: false,
  toast: null, // { message, actionLabel, onAction, id }
});

export function showToast({ message, actionLabel, onAction, duration = 5000 }) {
  const id = Math.random().toString(36).slice(2);
  uiStore.set({ toast: { id, message, actionLabel, onAction } });
  setTimeout(() => {
    if (uiStore.get().toast?.id === id) uiStore.set({ toast: null });
  }, duration);
}

export function applyTheme(theme) {
  const resolved = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;
  document.documentElement.setAttribute('data-theme', resolved);
}
