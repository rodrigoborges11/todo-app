import { html, useState } from '../../lib/preact.js';
import { useLiveQuery } from '../../state/useLiveQuery.js';
import { getAllTasks } from '../../api/tasks.js';
import { getAreas } from '../../api/areas.js';
import { getAllTags } from '../../api/tags.js';
import { getCachedEvents } from '../../api/events.js';
import { startOfDay, formatFullDate } from '../../lib/date.js';
import { TaskItem } from '../tasks/TaskItem.js';
import { TaskEditor } from '../tasks/TaskEditor.js';
import { EventRow } from '../calendar/EventRow.js';
import { Icon } from '../common/icons.js';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const WEEKDAYS_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

function monthBounds(year, month) {
  const start = new Date(year, month, 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(year, month + 1, 0);
  end.setHours(23, 59, 59, 999);
  return { start: start.getTime(), end: end.getTime() };
}

function buildGrid(year, month) {
  const firstWeekday = new Date(year, month, 1).getDay(); // 0 = Dom
  const offset = (firstWeekday + 6) % 7; // Seg = 0
  const totalDays = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) {
    const dt = new Date(year, month, d);
    dt.setHours(0, 0, 0, 0);
    cells.push(dt.getTime());
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function groupByDay(items, getTs) {
  const map = {};
  for (const item of items) {
    const ts = getTs(item);
    if (ts == null) continue;
    const key = startOfDay(ts);
    if (!map[key]) map[key] = [];
    map[key].push(item);
  }
  return map;
}

export function CalendarView({ areaFilter }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(() => startOfDay(Date.now()));
  const [openTask, setOpenTask] = useState(null);

  const { start: monthStart, end: monthEnd } = monthBounds(year, month);

  const [tasks] = useLiveQuery(
    () => getAllTasks(areaFilter, { fromDate: monthStart, toDate: monthEnd }),
    [areaFilter, year, month],
    [],
  );
  const [events] = useLiveQuery(
    () => getCachedEvents({ fromTs: monthStart, toTs: monthEnd, areaId: areaFilter }),
    [areaFilter, year, month],
    [],
  );
  const [areas] = useLiveQuery(() => getAreas(), [], []);
  const [tags] = useLiveQuery(() => getAllTags(), [], []);

  const areasById = Object.fromEntries((areas || []).map((a) => [a.id, a]));
  const tagsById = Object.fromEntries((tags || []).map((t) => [t.id, t]));

  const tasksByDay = groupByDay(tasks || [], (t) => t.dueAt);
  const eventsByDay = groupByDay(events || [], (e) => e.startsAt);

  const grid = buildGrid(year, month);
  const todayTs = startOfDay(Date.now());

  function navigate(dir) {
    let y = year; let m = month + dir;
    if (m < 0) { y--; m = 11; }
    if (m > 11) { y++; m = 0; }
    setYear(y);
    setMonth(m);
    setSelectedDay(null);
  }

  function goToday() {
    const n = new Date();
    setYear(n.getFullYear());
    setMonth(n.getMonth());
    setSelectedDay(startOfDay(Date.now()));
  }

  const selTasks = selectedDay ? (tasksByDay[selectedDay] || []) : [];
  const selEvents = selectedDay ? (eventsByDay[selectedDay] || []) : [];
  const hasItems = selTasks.length > 0 || selEvents.length > 0;

  return html`
    <div class="max-w-3xl mx-auto flex flex-col gap-4 view-enter">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-1">
          <button
            onClick=${() => navigate(-1)}
            class="p-1.5 rounded-md text-ink-muted hover:text-ink hover:bg-surface-2"
          >
            <${Icon} name="chevronLeft" size=${17} />
          </button>
          <h1 class="text-[15px] font-semibold w-44 text-center select-none">
            ${MONTH_NAMES[month]} ${year}
          </h1>
          <button
            onClick=${() => navigate(1)}
            class="p-1.5 rounded-md text-ink-muted hover:text-ink hover:bg-surface-2"
          >
            <${Icon} name="chevronRight" size=${17} />
          </button>
        </div>
        <button
          onClick=${goToday}
          class="text-xs font-medium text-ink-muted hover:text-ink bg-surface-2 hover:bg-surface-3 px-3 py-1.5 rounded-lg"
        >
          Hoje
        </button>
      </div>

      <div class="rounded-xl border border-border overflow-hidden">
        <div class="grid grid-cols-7 border-b border-border bg-surface-1/60">
          ${WEEKDAYS_SHORT.map((d) => html`
            <div class="py-2 text-center text-[10px] font-mono uppercase tracking-widest text-ink-faint">${d}</div>
          `)}
        </div>
        <div class="grid grid-cols-7 gap-px bg-border">
          ${grid.map((dayTs, i) => {
            if (!dayTs) {
              return html`<div key=${'pad-' + i} class="min-h-[72px] bg-surface-1/20" />`;
            }

            const isToday = dayTs === todayTs;
            const isSelected = dayTs === selectedDay;
            const dayTasks = tasksByDay[dayTs] || [];
            const dayEvents = eventsByDay[dayTs] || [];
            const total = dayTasks.length + dayEvents.length;
            const evDots = dayEvents.slice(0, 3);
            const tkDots = dayTasks.slice(0, Math.max(0, 3 - evDots.length));
            const extra = total - evDots.length - tkDots.length;

            return html`
              <div
                key=${dayTs}
                onClick=${() => setSelectedDay(isSelected ? null : dayTs)}
                class="
                  min-h-[72px] p-1.5 cursor-pointer transition-colors select-none
                  ${isSelected ? 'bg-surface-2' : 'bg-surface-0 hover:bg-surface-1/60'}
                "
              >
                <span class="
                  flex items-center justify-center w-6 h-6 rounded-full mb-1
                  text-[12px] font-medium
                  ${isToday ? 'bg-best text-white' : 'text-ink-muted'}
                ">
                  ${new Date(dayTs).getDate()}
                </span>
                ${total > 0 && html`
                  <div class="flex flex-wrap gap-[3px]">
                    ${evDots.map((_, j) => html`
                      <span key=${'ev-' + j} class="block w-1.5 h-1.5 rounded-full" style="background:#56c4f1" />
                    `)}
                    ${tkDots.map((_, j) => html`
                      <span key=${'tk-' + j} class="block w-1.5 h-1.5 rounded-full" style="background:#cf0f68" />
                    `)}
                    ${extra > 0 && html`
                      <span class="text-[9px] font-mono text-ink-faint leading-tight">+${extra}</span>
                    `}
                  </div>
                `}
              </div>
            `;
          })}
        </div>
      </div>

      ${selectedDay && html`
        <div class="flex flex-col gap-2">
          <p class="px-1 text-[11px] font-mono uppercase tracking-widest text-ink-faint">
            ${formatFullDate(selectedDay)}${selectedDay === todayTs ? ' · hoje' : ''}
          </p>
          ${!hasItems && html`
            <p class="text-sm text-ink-faint text-center py-6 rounded-xl border border-dashed border-border">
              Nada agendado para este dia.
            </p>
          `}
          ${hasItems && html`
            <div class="flex flex-col bg-surface-1/40 rounded-xl border border-border py-1">
              ${selEvents.map((ev) => html`
                <${EventRow} key=${ev.id} event=${ev} area=${areasById[ev.account?.areaId]} />
              `)}
              ${selTasks.map((t) => html`
                <${TaskItem}
                  key=${t.id} task=${t}
                  area=${areasById[t.areaId]}
                  tags=${(t.tagIds || []).map((id) => tagsById[id]).filter(Boolean)}
                  showArea=${areaFilter === 'all'}
                  onOpen=${setOpenTask}
                />
              `)}
            </div>
          `}
        </div>
      `}
    </div>
    ${openTask && html`<${TaskEditor} task=${openTask} onClose=${() => setOpenTask(null)} />`}
  `;
}
