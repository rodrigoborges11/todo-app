import { html } from '../../lib/preact.js';
import { Modal } from './Modal.js';

export function ConfirmDialog({
  title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar',
  danger = false, onConfirm, onCancel, children = null,
}) {
  return html`
    <${Modal} title=${title} onClose=${onCancel} footer=${html`
      <button onClick=${onCancel} class="px-3.5 py-2 rounded-lg text-sm font-medium text-ink-muted hover:bg-surface-2 transition-colors">
        ${cancelLabel}
      </button>
      <button
        data-autofocus onClick=${onConfirm}
        class="px-3.5 py-2 rounded-lg text-sm font-medium text-white transition-colors ${danger ? 'bg-danger hover:opacity-90' : 'bg-best hover:opacity-90'}"
      >
        ${confirmLabel}
      </button>
    `}>
      <p class="text-sm text-ink-muted leading-relaxed">${message}</p>
      ${children}
    <//>
  `;
}
