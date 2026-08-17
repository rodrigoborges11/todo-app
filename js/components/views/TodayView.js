import { html, useState } from '../../lib/preact.js';
import { useLiveQuery } from '../../state/useLiveQuery.js';
import { getTodayTasks, removeExampleTasks } from '../../api/tasks.js';
import { getAreas } from '../../api/areas.js';
import { getCachedEvents } from '../../google/calendarClient.js';
import { googleIntegrationEnabled } from '../../google/config.js';
import { startOfDay, endOfDay, formatFullDate } from '../../lib/date.js';
import { QuickCapture } from '../capture/QuickCapture.js';
import { TaskListSection } from '../tasks/TaskListSection.js';
import { TaskEditor } from '../tasks/TaskEditor.js';
import { EventRow } from '../calendar/EventRow.js';
import { EmptyState } from '../common/EmptyState.js';

export function TodayView({ areaFilter }) {
  const [tasks] = useLiveQuery(() => getTodayTasks(areaFilter), [areaFilter], null);
  const [areas] = useLiveQuery(() => getAreas(), [], []);
  const [events] = useLiveQuery(
    () => (googleIntegrationEnabled() ? getCachedEvents({ fromTs: startOfDay(), toTs: endOfDay(), areaId: areaFilter }) : Promise.resolve([])),
    [areaFilter],
    [],
  );
  const [openTask, setOpenTask] = useState(null);
  const areasById = Object.fromEntries((areas || []).map((a) => [a.id, a]));
  const hasExamples = (tasks || []).some((t) => t.isExample);

  const loading = tasks === null;
  const nothing = !loading && (tasks || []).length === 0 && (events || []).length === 0;

  return html`
    <div class="max-w-2xl mx-auto flex flex-col gap-5 view-enter">
      <div>
        <h1 class="text-xl font-semibold">Hoje</h1>
        <p class="text-sm text-ink-faint">${formatFullDate(Date.now())}</p>
      </div>

      <${QuickCapture} areaFilter=${areaFilter} />

      ${hasExamples && html`
        <div class="flex items-center justify-between text-xs bg-surface-2/60 rounded-lg px-3 py-2 text-ink-faint">
          <span>Estas são tarefas de exemplo.</span>
          <button onClick=${removeExampleTasks} class="font-semibold text-best hover:opacity-80">Remover exemplos</button>
        </div>
      `}

      ${(events || []).length > 0 && html`
        <div>
          <p class="text-[11px] font-mono uppercase tracking-widest text-ink-faint mb-1.5 px-3">Agenda</p>
          <div class="flex flex-col bg-surface-1/50 rounded-xl border border-border py-1">
            ${events.map((ev) => html`<${EventRow} key=${ev.id} event=${ev} area=${areasById[ev.account?.areaId]} />`)}
          </div>
        </div>
      `}

      ${!loading && (tasks || []).length > 0 && html`
        <div>
          <p class="text-[11px] font-mono uppercase tracking-widest text-ink-faint mb-1.5 px-3">Tarefas</p>
          <${TaskListSection} tasks=${tasks} showArea=${areaFilter === 'all'} onOpen=${setOpenTask} />
        </div>
      `}

      ${nothing && html`
        <${EmptyState}
          icon="sun" title="Nada marcado para hoje"
          message="Usa o campo acima para criar a tua primeira tarefa do dia."
        />
      `}
    </div>
    ${openTask && html`<${TaskEditor} task=${openTask} onClose=${() => setOpenTask(null)} />`}
  `;
}
