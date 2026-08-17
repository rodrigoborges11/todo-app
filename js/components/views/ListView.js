import { html, useState } from '../../lib/preact.js';
import { useLiveQuery } from '../../state/useLiveQuery.js';
import { getListTasks } from '../../api/tasks.js';
import { getListById } from '../../api/lists.js';
import { getAreas } from '../../api/areas.js';
import { AreaDot } from '../areas/AreaBadge.js';
import { QuickCapture } from '../capture/QuickCapture.js';
import { TaskListSection } from '../tasks/TaskListSection.js';
import { TaskEditor } from '../tasks/TaskEditor.js';
import { EmptyState } from '../common/EmptyState.js';
import { Icon } from '../common/icons.js';

export function ListView({ listId }) {
  const [list] = useLiveQuery(() => getListById(listId), [listId], null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [tasks] = useLiveQuery(() => getListTasks(listId, { includeCompleted: showCompleted }), [listId, showCompleted], null);
  const [areas] = useLiveQuery(() => getAreas(), [], []);
  const [openTask, setOpenTask] = useState(null);

  if (!list) return null;
  const area = (areas || []).find((a) => a.id === list.areaId);
  const loading = tasks === null;

  return html`
    <div class="max-w-2xl mx-auto flex flex-col gap-5 view-enter">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-semibold flex items-center gap-2">
            ${area && html`<${AreaDot} area=${area} size=${10} />`}
            ${list.name}
          </h1>
        </div>
        <button
          onClick=${() => setShowCompleted((v) => !v)}
          class="flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink bg-surface-2 rounded-lg px-2.5 py-1.5"
        >
          <${Icon} name="check" size=${13} /> ${showCompleted ? 'Ocultar concluídas' : 'Mostrar concluídas'}
        </button>
      </div>

      <${QuickCapture} defaultListId=${listId} areaFilter=${list.areaId} />

      ${!loading && tasks.length > 0 && html`
        <${TaskListSection} tasks=${tasks} draggable=${!showCompleted} onOpen=${setOpenTask} />
      `}

      ${!loading && tasks.length === 0 && html`
        <${EmptyState} icon="inbox" title="Lista vazia" message="Adiciona a tua primeira tarefa acima." />
      `}
    </div>
    ${openTask && html`<${TaskEditor} task=${openTask} onClose=${() => setOpenTask(null)} />`}
  `;
}
