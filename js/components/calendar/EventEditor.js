import { html, useState } from '../../lib/preact.js';
import { createManualEvent, updateManualEvent } from '../../api/events.js';
import { areaColorVar } from '../../api/areas.js';
import { Icon } from '../common/icons.js';

function pad(n) { return String(n).padStart(2, '0'); }
function toTimeStr(ts) {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function applyTime(dayTs, timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date(dayTs);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

export function EventEditor({ dayTs, areas, event, onClose }) {
  const editing = !!event;
  const baseDayTs = editing ? event.startsAt : dayTs;

  const [title, setTitle]       = useState(editing ? event.title : '');
  const [areaId, setAreaId]     = useState(editing ? (event.areaId || null) : (areas?.[0]?.id || null));
  const [isAllDay, setIsAllDay] = useState(editing ? event.isAllDay : false);
  const [startTime, setStart]   = useState(editing && !event.isAllDay ? toTimeStr(event.startsAt) : '09:00');
  const [endTime, setEnd]       = useState(editing && !event.isAllDay ? toTimeStr(event.endsAt) : '10:00');
  const [location, setLocation] = useState(editing ? (event.location || '') : '');
  const [saving, setSaving]     = useState(false);

  async function save(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const startsAt = isAllDay ? baseDayTs : applyTime(baseDayTs, startTime);
    const endsAt   = isAllDay ? baseDayTs + 86399999 : applyTime(baseDayTs, endTime);
    if (editing) {
      await updateManualEvent(event.id, { title, startsAt, endsAt, isAllDay, areaId, location });
    } else {
      await createManualEvent({ title, startsAt, endsAt, isAllDay, areaId, location });
    }
    onClose();
  }

  return html`
    <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick=${e => e.target === e.currentTarget && onClose()}>
      <form onSubmit=${save} class="w-full max-w-md bg-surface-0 rounded-2xl shadow-xl flex flex-col gap-4 p-5">
        <div class="flex items-center justify-between">
          <h2 class="font-semibold text-[15px]">${editing ? 'Editar evento' : 'Novo evento'}</h2>
          <button type="button" onClick=${onClose} class="text-ink-faint hover:text-ink">
            <${Icon} name="x" size=${18} />
          </button>
        </div>

        <input
          autofocus
          type="text"
          placeholder="Título do evento"
          value=${title}
          onInput=${e => setTitle(e.target.value)}
          class="w-full bg-surface-1 border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-border-strong"
        />

        <!-- Área -->
        <div class="flex items-center gap-2 flex-wrap">
          ${(areas || []).map(a => html`
            <button
              key=${a.id} type="button"
              onClick=${() => setAreaId(a.id)}
              class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors
                ${areaId === a.id ? 'border-border-strong text-ink' : 'border-transparent text-ink-faint hover:text-ink'}"
            >
              <span class="w-2 h-2 rounded-full shrink-0" style="background:${areaColorVar(a)}"></span>
              ${a.name}
            </button>
          `)}
        </div>

        <!-- Todo o dia -->
        <label class="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked=${isAllDay} onChange=${e => setIsAllDay(e.target.checked)} class="rounded" />
          Todo o dia
        </label>

        ${!isAllDay && html`
          <div class="grid grid-cols-2 gap-3">
            <label class="flex flex-col gap-1">
              <span class="text-[11px] text-ink-faint font-mono uppercase tracking-wide">Início</span>
              <input type="time" value=${startTime} onInput=${e => setStart(e.target.value)}
                class="bg-surface-1 border border-border rounded-lg px-2 py-2 text-sm outline-none focus:border-border-strong" />
            </label>
            <label class="flex flex-col gap-1">
              <span class="text-[11px] text-ink-faint font-mono uppercase tracking-wide">Fim</span>
              <input type="time" value=${endTime} onInput=${e => setEnd(e.target.value)}
                class="bg-surface-1 border border-border rounded-lg px-2 py-2 text-sm outline-none focus:border-border-strong" />
            </label>
          </div>
        `}

        <input
          type="text"
          placeholder="Local (opcional)"
          value=${location}
          onInput=${e => setLocation(e.target.value)}
          class="w-full bg-surface-1 border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-border-strong"
        />

        <div class="flex gap-2 justify-end pt-1">
          <button type="button" onClick=${onClose}
            class="px-4 py-2 rounded-xl text-sm text-ink-muted hover:text-ink hover:bg-surface-2">
            Cancelar
          </button>
          <button type="submit" disabled=${saving || !title.trim()}
            class="px-4 py-2 rounded-xl text-sm font-medium bg-best text-white disabled:opacity-40">
            ${saving ? 'A guardar…' : (editing ? 'Guardar alterações' : 'Criar evento')}
          </button>
        </div>
      </form>
    </div>
  `;
}
