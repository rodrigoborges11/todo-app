import { html, useState, useRef, useEffect } from '../../lib/preact.js';
import { useLiveQuery } from '../../state/useLiveQuery.js';
import { searchTasks } from '../../api/tasks.js';
import { TaskListSection } from '../tasks/TaskListSection.js';
import { TaskEditor } from '../tasks/TaskEditor.js';
import { EmptyState } from '../common/EmptyState.js';
import { Icon } from '../common/icons.js';

export function SearchView({ areaFilter }) {
  const [query, setQuery] = useState('');
  const [openTask, setOpenTask] = useState(null);
  const inputRef = useRef(null);
  const [results] = useLiveQuery(() => searchTasks(query, areaFilter), [query, areaFilter], []);

  useEffect(() => { inputRef.current?.focus(); }, []);

  return html`
    <div class="max-w-2xl mx-auto flex flex-col gap-5 view-enter">
      <h1 class="text-xl font-semibold">Pesquisar</h1>

      <div class="flex items-center gap-2 bg-surface-1 border border-border rounded-xl px-3 py-2.5 focus-within:border-best">
        <${Icon} name="search" size=${17} class="text-ink-faint shrink-0" />
        <input
          ref=${inputRef} value=${query} onInput=${(e) => setQuery(e.target.value)}
          placeholder="Pesquisar por título ou descrição…"
          class="flex-1 bg-transparent outline-none text-sm"
        />
      </div>

      ${query.trim() && results.length > 0 && html`<${TaskListSection} tasks=${results} showArea=${areaFilter === 'all'} showList=${true} onOpen=${setOpenTask} />`}
      ${query.trim() && results.length === 0 && html`<${EmptyState} icon="search" title="Sem resultados" message=${`Nada encontrado para "${query.trim()}".`} />`}
      ${!query.trim() && html`<${EmptyState} icon="search" title="Escreve para pesquisar" message="Procura em todas as tarefas, concluídas ou não." />`}
    </div>
    ${openTask && html`<${TaskEditor} task=${openTask} onClose=${() => setOpenTask(null)} />`}
  `;
}
