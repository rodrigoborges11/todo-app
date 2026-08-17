import { html, useState } from '../../lib/preact.js';
import { useLiveQuery } from '../../state/useLiveQuery.js';
import { getAreas } from '../../api/areas.js';
import { getAllTags } from '../../api/tags.js';
import { getLists } from '../../api/lists.js';
import { reorderTasks } from '../../api/tasks.js';
import { TaskItem } from './TaskItem.js';
import { formatDayLabel } from '../../lib/date.js';

export function TaskListSection({
  tasks, groupByDay = false, showArea = false, showList = false,
  draggable = false, onOpen,
}) {
  const [areas] = useLiveQuery(() => getAreas(), [], []);
  const [tags] = useLiveQuery(() => getAllTags(), [], []);
  const [lists] = useLiveQuery(() => getLists(), [], []);
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);
  const [order, setOrder] = useState(null);

  const areasById = Object.fromEntries((areas || []).map((a) => [a.id, a]));
  const tagsById = Object.fromEntries((tags || []).map((t) => [t.id, t]));
  const listsById = Object.fromEntries((lists || []).map((l) => [l.id, l]));

  const displayTasks = order && draggable ? order.map((id) => tasks.find((t) => t.id === id)).filter(Boolean) : tasks;

  function renderTask(task) {
    return html`
      <${TaskItem}
        key=${task.id} task=${task}
        area=${areasById[task.areaId]}
        tags=${(task.tagIds || []).map((id) => tagsById[id]).filter(Boolean)}
        showArea=${showArea} showList=${showList} listName=${listsById[task.listId]?.name || ''}
        onOpen=${onOpen}
        draggable=${draggable}
        isDragOver=${overId === task.id && dragId !== task.id}
        onDragStart=${draggable ? (e) => { setDragId(task.id); setOrder(tasks.map((t) => t.id)); e.dataTransfer.effectAllowed = 'move'; } : undefined}
        onDragOver=${draggable ? (e) => { e.preventDefault(); setOverId(task.id); } : undefined}
        onDrop=${draggable ? (e) => {
          e.preventDefault();
          if (!dragId || dragId === task.id) return;
          setOrder((current) => {
            const list = [...(current || tasks.map((t) => t.id))];
            const from = list.indexOf(dragId);
            const to = list.indexOf(task.id);
            list.splice(from, 1);
            list.splice(to, 0, dragId);
            reorderTasks(task.listId, list);
            return list;
          });
          setDragId(null); setOverId(null);
        } : undefined}
        onDragEnd=${draggable ? () => { setDragId(null); setOverId(null); } : undefined}
      />
    `;
  }

  if (!groupByDay) {
    return html`<div class="flex flex-col">${displayTasks.map(renderTask)}</div>`;
  }

  const groups = new Map();
  for (const t of displayTasks) {
    const key = t.dueAt ? formatDayLabel(t.dueAt) : 'Sem data';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(t);
  }

  return html`
    <div class="flex flex-col gap-4">
      ${[...groups.entries()].map(([label, group]) => html`
        <div key=${label}>
          <p class="px-3 text-[11px] font-mono uppercase tracking-widest text-ink-faint mb-1">${label}</p>
          <div class="flex flex-col">${group.map(renderTask)}</div>
        </div>
      `)}
    </div>
  `;
}
