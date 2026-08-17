import { html } from '../../lib/preact.js';

export const PRIORITY_META = {
  high: { label: 'Alta', color: 'var(--priority-high)' },
  medium: { label: 'Média', color: 'var(--priority-medium)' },
  low: { label: 'Baixa', color: 'var(--priority-low)' },
  none: { label: 'Sem prioridade', color: 'transparent' },
};

export function PriorityDot({ priority, size = 8 }) {
  const meta = PRIORITY_META[priority] || PRIORITY_META.none;
  if (priority === 'none') return null;
  return html`
    <span
      title=${`Prioridade ${meta.label.toLowerCase()}`}
      class="inline-block rounded-full shrink-0"
      style=${`width:${size}px;height:${size}px;background:${meta.color}`}
    ></span>
  `;
}
