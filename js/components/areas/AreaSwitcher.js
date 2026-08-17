import { html } from '../../lib/preact.js';
import { areaColorVar } from '../../api/areas.js';

export function AreaSwitcher({ areas, value, onChange, counts = {} }) {
  const tabs = [{ id: 'all', name: 'Tudo', colorVar: 'var(--text-faint)' }, ...areas.map((a) => ({
    id: a.id, name: a.name, colorVar: areaColorVar(a),
  }))];

  return html`
    <div class="flex items-end gap-0.5 px-2 pt-2" role="tablist" aria-label="Filtrar por área">
      ${tabs.map((tab) => {
        const active = value === tab.id;
        const count = counts[tab.id];
        return html`
          <button
            key=${tab.id} role="tab" aria-selected=${active}
            data-active=${active}
            onClick=${() => onChange(tab.id)}
            style=${`--tab-color:${tab.colorVar}`}
            class="ledger-tab flex items-center gap-1.5 px-3.5 pt-2 pb-2.5 text-[13px] font-medium transition-colors
              ${active ? 'bg-surface-1 text-ink' : 'bg-surface-2/60 text-ink-muted hover:text-ink hover:bg-surface-2'}"
          >
            ${tab.name}
            ${!!count && html`<span class="font-mono text-[10px] ${active ? 'text-ink-muted' : 'text-ink-faint'}">${count}</span>`}
          </button>
        `;
      })}
    </div>
  `;
}
