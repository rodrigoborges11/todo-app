import { html } from '../../lib/preact.js';
import { formatTime } from '../../lib/date.js';
import { areaColorVar } from '../../api/areas.js';
import { deleteEvent } from '../../api/events.js';
import { Icon } from '../common/icons.js';

export function EventRow({ event, area }) {
  const isManual = !event.account && !event.calendar;

  async function handleDelete() {
    if (!confirm(`Apagar "${event.title}"?`)) return;
    await deleteEvent(event.id);
  }

  return html`
    <div
      class="flex items-start gap-3 px-3 py-2 rounded-lg group"
      style=${area ? `box-shadow: inset 3px 0 0 0 ${areaColorVar(area)}` : ''}
    >
      <div class="mt-0.5 text-ink-faint shrink-0"><${Icon} name="calendar" size=${15} /></div>
      <div class="flex-1 min-w-0">
        <p class="text-[13.5px] text-ink-muted truncate-1">${event.title}</p>
        <div class="flex items-center gap-2 mt-0.5">
          <span class="text-[11px] font-mono text-ink-faint">
            ${event.isAllDay ? 'Todo o dia' : `${formatTime(event.startsAt)}–${formatTime(event.endsAt)}`}
          </span>
          ${event.location && html`<span class="text-[11px] text-ink-faint truncate-1">· ${event.location}</span>`}
        </div>
      </div>
      ${isManual
        ? html`<button onClick=${handleDelete} class="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-danger shrink-0 mt-0.5 transition-opacity" aria-label="Apagar evento">
            <${Icon} name="trash" size=${14} />
          </button>`
        : html`<span class="text-[10px] font-mono text-ink-faint shrink-0 mt-1">${event.account?.displayName?.split('@')[0] || ''}</span>`
      }
    </div>
  `;
}

export function EventsSkeletonNote({ children }) {
  return html`<p class="text-[11px] text-ink-faint px-3 py-1 font-mono uppercase tracking-wide">${children}</p>`;
}
