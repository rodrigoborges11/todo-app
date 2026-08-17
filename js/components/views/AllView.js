import { html, useState } from '../../lib/preact.js';
import { useLiveQuery } from '../../state/useLiveQuery.js';
import { getAllTasks, removeExampleTasks } from '../../api/tasks.js';
import { getLists } from '../../api/lists.js';
import { getTagsForArea } from '../../api/tags.js';
import { QuickCapture } from '../capture/QuickCapture.js';
import { TaskListSection } from '../tasks/TaskListSection.js';
import { TaskEditor } from '../tasks/TaskEditor.js';
import { EmptyState } from '../common/EmptyState.js';
import { Icon } from '../common/icons.js';

export function AllView({ areaFilter }) {
  const [priority, setPriority] = useState('');
  const [listId, setListId] = useState('');
  const [tagId, setTagId] = useState('');
  const [sort, setSort] = useState('due');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [openTask, setOpenTask] = useState(null);

  const filters = { priority: priority || undefined, listId: listId || undefined, tagId: tagId || undefined, sort };
  const [tasks] = useLiveQuery(() => getAllTasks(areaFilter, filters), [areaFilter, priority, listId, tagId, sort], null);
  const [lists] = useLiveQuery(() => getLists(areaFilter !== 'all' ? areaFilter : null), [areaFilter], []);
  const [tags] = useLiveQuery(() => (areaFilter !== 'all' ? getTagsForArea(areaFilter) : Promise.resolve([])), [areaFilter], []);

  const loading = tasks === null;
  const hasExamples = (tasks || []).some((t) => t.isExample);
  const activeFilterCount = [priority, listId, tagId].filter(Boolean).length;

  return html`
    <div class="max-w-2xl mx-auto flex flex-col gap-5 view-enter">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-semibold">Todas</h1>
        <button
          onClick=${() => setFiltersOpen((v) => !v)}
          class="flex items-center gap-1.5 text-xs font-medium ${activeFilterCount ? 'text-best' : 'text-ink-muted'} hover:text-ink bg-surface-2 rounded-lg px-2.5 py-1.5"
        >
          <${Icon} name="filter" size=${13} /> Filtros ${activeFilterCount ? `(${activeFilterCount})` : ''}
        </button>
      </div>

      <${QuickCapture} areaFilter=${areaFilter} />

      ${filtersOpen && html`
        <div class="flex flex-wrap gap-2 bg-surface-1/60 border border-border rounded-xl p-3">
          <select value=${priority} onChange=${(e) => setPriority(e.target.value)} class="bg-surface-2 rounded-lg px-2.5 py-1.5 text-xs outline-none">
            <option value="">Qualquer prioridade</option>
            <option value="high">Alta</option>
            <option value="medium">Média</option>
            <option value="low">Baixa</option>
            <option value="none">Sem prioridade</option>
          </select>
          ${areaFilter !== 'all' && html`
            <select value=${listId} onChange=${(e) => setListId(e.target.value)} class="bg-surface-2 rounded-lg px-2.5 py-1.5 text-xs outline-none">
              <option value="">Qualquer lista</option>
              ${(lists || []).map((l) => html`<option key=${l.id} value=${l.id}>${l.name}</option>`)}
            </select>
            <select value=${tagId} onChange=${(e) => setTagId(e.target.value)} class="bg-surface-2 rounded-lg px-2.5 py-1.5 text-xs outline-none">
              <option value="">Qualquer etiqueta</option>
              ${(tags || []).map((t) => html`<option key=${t.id} value=${t.id}>#${t.name}</option>`)}
            </select>
          `}
          <select value=${sort} onChange=${(e) => setSort(e.target.value)} class="bg-surface-2 rounded-lg px-2.5 py-1.5 text-xs outline-none ml-auto">
            <option value="due">Ordenar por data</option>
            <option value="priority">Ordenar por prioridade</option>
            <option value="created">Ordenar por criação</option>
          </select>
          ${activeFilterCount > 0 && html`
            <button onClick=${() => { setPriority(''); setListId(''); setTagId(''); }} class="text-xs text-ink-faint hover:text-danger">Limpar</button>
          `}
        </div>
      `}

      ${hasExamples && html`
        <div class="flex items-center justify-between text-xs bg-surface-2/60 rounded-lg px-3 py-2 text-ink-faint">
          <span>Estas são tarefas de exemplo.</span>
          <button onClick=${removeExampleTasks} class="font-semibold text-best hover:opacity-80">Remover exemplos</button>
        </div>
      `}

      ${!loading && tasks.length > 0 && html`
        <${TaskListSection} tasks=${tasks} showArea=${areaFilter === 'all'} showList=${true} onOpen=${setOpenTask} />
      `}
      ${!loading && tasks.length === 0 && html`
        <${EmptyState} icon="inbox" title="Sem tarefas em aberto" message="Ou não criaste nenhuma ainda, ou os filtros estão a escondê-las todas." />
      `}
    </div>
    ${openTask && html`<${TaskEditor} task=${openTask} onClose=${() => setOpenTask(null)} />`}
  `;
}
