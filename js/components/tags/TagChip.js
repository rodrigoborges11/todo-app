import { html } from '../../lib/preact.js';
import { Icon } from '../common/icons.js';

export function TagChip({ tag, onRemove = null }) {
  if (!tag) return null;
  return html`
    <span class="inline-flex items-center gap-1 rounded-md bg-surface-2 text-ink-muted text-[11px] font-mono px-1.5 py-0.5">
      #${tag.name}
      ${onRemove && html`
        <button onClick=${onRemove} aria-label=${`Remover etiqueta ${tag.name}`} class="hover:text-ink">
          <${Icon} name="x" size=${10} strokeWidth=${2.2} />
        </button>
      `}
    </span>
  `;
}
