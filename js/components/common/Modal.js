import { html, useEffect, useRef } from '../../lib/preact.js';
import { Icon } from './icons.js';

/**
 * Modal centrado (para diálogos curtos) ou painel lateral (para o editor de
 * tarefa, mais rico em campos). `side="right"` ativa o modo painel.
 */
export function Modal({ title, onClose, children, side = null, footer = null, wide = false }) {
  const ref = useRef(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.querySelector('[data-autofocus]')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const panelClasses = side === 'right'
    ? 'ml-auto h-full w-full sm:w-[420px] rounded-l-2xl'
    : `w-full ${wide ? 'max-w-2xl' : 'max-w-md'} rounded-2xl mx-4`;

  return html`
    <div class="fixed inset-0 z-50 flex" role="presentation">
      <div class="absolute inset-0 bg-black/50" onClick=${onClose}></div>
      <div
        ref=${ref}
        role="dialog" aria-modal="true" aria-label=${title}
        class="relative view-enter bg-surface-1 border border-border shadow-panel flex flex-col max-h-full ${panelClasses}"
        style="box-shadow: var(--shadow-panel)"
      >
        <div class="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 class="font-semibold text-[15px]">${title}</h2>
          <button
            onClick=${onClose} aria-label="Fechar"
            class="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-2 transition-colors"
          >
            <${Icon} name="x" size=${18} />
          </button>
        </div>
        <div class="overflow-y-auto px-5 py-4 grow">${children}</div>
        ${footer && html`<div class="px-5 py-4 border-t border-border shrink-0 flex justify-end gap-2">${footer}</div>`}
      </div>
    </div>
  `;
}
