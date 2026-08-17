import { html } from '../../lib/preact.js';
import { Icon } from './icons.js';

export function EmptyState({ icon = 'inbox', title, message, actionLabel = null, onAction = null }) {
  return html`
    <div class="flex flex-col items-center justify-center text-center py-16 px-6">
      <div class="w-12 h-12 rounded-2xl bg-surface-2 flex items-center justify-center text-ink-faint mb-4">
        <${Icon} name=${icon} size=${22} />
      </div>
      <p class="font-medium text-ink">${title}</p>
      ${message && html`<p class="text-sm text-ink-muted mt-1 max-w-xs">${message}</p>`}
      ${actionLabel && html`
        <button onClick=${onAction} class="mt-4 text-sm font-semibold text-best hover:opacity-80">
          ${actionLabel}
        </button>
      `}
    </div>
  `;
}
