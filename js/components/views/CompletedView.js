import { html, useState } from '../../lib/preact.js';
import { useLiveQuery } from '../../state/useLiveQuery.js';
import { getCompletedTasks } from '../../api/tasks.js';
import { TaskListSection } from '../tasks/TaskListSection.js';
import { TaskEditor } from '../tasks/TaskEditor.js';
import { EmptyState } from '../common/EmptyState.js';

export function CompletedView({ areaFilter }) {
  const [tasks] = useLiveQuery(() => getCompletedTasks(areaFilter), [areaFilter], null);
  const [openTask, setOpenTask] = useState(null);
  const loading = tasks === null;

  return html`
    <div class="max-w-2xl mx-auto flex flex-col gap-5 view-enter">
      <div>
        <h1 class="text-xl font-semibold">Concluídas</h1>
        <p class="text-sm text-ink-faint">Histórico das tarefas terminadas</p>
      </div>

      ${!loading && tasks.length > 0 && html`
        <${TaskListSection} tasks=${tasks} showArea=${areaFilter === 'all'} onOpen=${setOpenTask} />
      `}
      ${!loading && tasks.length === 0 && html`
        <${EmptyState} icon="check" title="Ainda sem tarefas concluídas" message="As tarefas que marcares como feitas aparecem aqui." />
      `}
    </div>
    ${openTask && html`<${TaskEditor} task=${openTask} onClose=${() => setOpenTask(null)} />`}
  `;
}
