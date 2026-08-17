import { html } from '../../lib/preact.js';
import { areaColorVar, areaSoftVar } from '../../api/areas.js';

export function AreaDot({ area, size = 8 }) {
  if (!area) return null;
  return html`<span class="inline-block rounded-full shrink-0" style=${`width:${size}px;height:${size}px;background:${areaColorVar(area)}`}></span>`;
}

export function AreaBadge({ area, size = 'sm' }) {
  if (!area) return null;
  const pad = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';
  return html`
    <span
      class="inline-flex items-center gap-1.5 rounded-full font-medium ${pad}"
      style=${`background:${areaSoftVar(area)}; color:${areaColorVar(area)}`}
    >
      <${AreaDot} area=${area} size=${6} />
      ${area.name}
    </span>
  `;
}
