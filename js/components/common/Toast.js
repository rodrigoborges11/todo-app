import { html } from '../../lib/preact.js';
import { uiStore, useStore } from '../../state/store.js';
import { Icon } from './icons.js';

export function ToastHost() {
  const { toast } = useStore(uiStore);
  if (!toast) return null;
  return html`
    <div class="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] px-4 w-full max-w-sm">
      <div class="toast-enter bg-surface-2 border border-border-strong rounded-xl shadow-panel px-4 py-3 flex items-center gap-3" style="box-shadow: var(--shadow-panel)">
        <p class="text-sm flex-1">${toast.message}</p>
        ${toast.actionLabel && html`
          <button
            onClick=${() => { toast.onAction?.(); uiStore.set({ toast: null }); }}
            class="text-sm font-semibold text-best hover:opacity-80 shrink-0 flex items-center gap-1"
          >
            <${Icon} name="undo" size=${14} /> ${toast.actionLabel}
          </button>
        `}
        <button onClick=${() => uiStore.set({ toast: null })} aria-label="Fechar aviso" class="text-ink-faint hover:text-ink shrink-0">
          <${Icon} name="x" size=${14} />
        </button>
      </div>
    </div>
  `;
}
