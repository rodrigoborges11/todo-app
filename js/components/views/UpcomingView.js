import { html, useState } from '../../lib/preact.js';
import { useLiveQuery } from '../../state/useLiveQuery.js';
import { getUpcomingTasks } from '../../api/tasks.js';
import { getAreas } from '../../api/areas.js';
import { getAllTags } from '../../api/tags.js';
import { getCachedEvents } from '../../api/events.js';
import { addDays, startOfDay, formatDayLabel } from '../../lib/date.js';
import { QuickCapture } from '../capture/QuickCapture.js';
import { TaskItem } from '../tasks/TaskItem.js';
import { TaskEditor } from '../tasks/TaskEditor.js';
import { EventRow } from '../calendar/EventRow.js';
import { EmptyState } from '../common/EmptyState.js';

const DAYS_AHEAD = 7;

export function UpcomingView({ areaFilter }) {
  const [tasks] = useLiveQuery(() => getUpcomingTasks(areaFilter, DAYS_AHEAD), [areaFilter], null);
  const [areas] = useLiveQuery(() => getAreas(), [], []);
  const [tags] = useLiveQuery(() => getAllTags(), [], []);
  const from = addDays(startOfDay(Date.now()), 1);
  const to = addDays(from, DAYS_AHEAD) - 1;
  const [events] = useLiveQuery(
    () => getCachedEvents({ fromTs: from, toTs: to, areaId: areaFilter }),
    [areaFilter],
    [],
  );
  const [openTask, setOpenTask] = useState(null);

  const areasById = Object.fromEntries((areas || []).map((a) => [a.id, a]));
  const tagsById = Object.fromEntries((tags || []).map((t) => [t.id, t]));
  const loading = tasks === null;

  const dayKeys = Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(from, i));
  const byDay = dayKeys.map((dayTs) => {
    const dayStart = startOfDay(dayTs);
    const dayEnd = addDays(dayStart, 1) - 1;
    return {
      label: formatDayLabel(dayTs),
      dayTasks: (tasks || []).filter((t) => t.dueAt >= dayStart && t.dueAt <= dayEnd),
      dayEvents: (events || []).filter((e) => e.startsAt >= dayStart && e.startsAt <= dayEnd),
    };
  });
  const nothing = !loading && byDay.every((d) => d.dayTasks.length === 0 && d.dayEvents.length === 0);

  return html`
    <div class="max-w-2xl mx-auto flex flex-col gap-5 view-enter">
      <div>
        <h1 class="text-xl font-semibold">Próximas</h1>
        <p class="text-sm text-ink-faint">Os próximos ${DAYS_AHEAD} dias</p>
      </div>

      <${QuickCapture} areaFilter=${areaFilter} />

      ${!loading && !nothing && html`
        <div class="flex flex-col gap-4">
          ${byDay.filter((d) => d.dayTasks.length || d.dayEvents.length).map((d) => html`
            <div key=${d.label}>
              <p class="px-3 text-[11px] font-mono uppercase tracking-widest text-ink-faint mb-1">${d.label}</p>
              <div class="flex flex-col bg-surface-1/40 rounded-xl border border-border py-1">
                ${d.dayEvents.map((ev) => html`<${EventRow} key=${ev.id} event=${ev} area=${areasById[ev.account?.areaId]} />`)}
                ${d.dayTasks.map((t) => html`
                  <${TaskItem}
                    key=${t.id} task=${t} area=${areasById[t.areaId]}
                    tags=${(t.tagIds || []).map((id) => tagsById[id]).filter(Boolean)}
                    showArea=${areaFilter === 'all'} onOpen=${setOpenTask}
                  />
                `)}
              </div>
            </div>
          `)}
        </div>
      `}

      ${nothing && html`
        <${EmptyState} icon="calendar" title="Nada agendado para os próximos dias" message="Marca uma data numa tarefa para a veres aqui." />
      `}
    </div>
    ${openTask && html`<${TaskEditor} task=${openTask} onClose=${() => setOpenTask(null)} />`}
  `;
}
