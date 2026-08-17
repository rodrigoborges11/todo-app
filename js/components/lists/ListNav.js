import { html, useState } from '../../lib/preact.js';
import { useLiveQuery } from '../../state/useLiveQuery.js';
import { getLists, createList, renameList, deleteList, countTasksInList } from '../../api/lists.js';
import { Icon } from '../common/icons.js';
import { ConfirmDialog } from '../common/ConfirmDialog.js';

function ListCountBadge({ listId }) {
  const [count] = useLiveQuery(() => countTasksInList(listId), [listId], 0);
  if (!count) return null;
  return html`<span class="font-mono text-[10px] text-ink-faint">${count}</span>`;
}

function DeleteListDialog({ list, onClose }) {
  const [strategy, setStrategy] = useState('move');
  return html`
    <${ConfirmDialog}
      title=${`Eliminar "${list.name}"?`}
      danger=${true} confirmLabel="Eliminar lista"
      onCancel=${onClose}
      onConfirm=${async () => { await deleteList(list.id, strategy); onClose(); }}
      message="Escolhe o que fazer às tarefas desta lista antes de continuar."
    >
      <div class="flex flex-col gap-2 mt-3">
        <label class="flex items-center gap-2 text-sm">
          <input type="radio" name="strategy" checked=${strategy === 'move'} onChange=${() => setStrategy('move')} />
          Mover tarefas para a Caixa de entrada
        </label>
        <label class="flex items-center gap-2 text-sm">
          <input type="radio" name="strategy" checked=${strategy === 'delete'} onChange=${() => setStrategy('delete')} />
          Eliminar também as tarefas
        </label>
      </div>
    <//>
  `;
}

function ListRow({ list, active, onSelect }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(list.name);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  async function save() {
    if (name.trim()) await renameList(list.id, name.trim());
    setEditing(false);
  }

  if (editing) {
    return html`
      <input
        autofocus value=${name} onInput=${(e) => setName(e.target.value)}
        onBlur=${save} onKeyDown=${(e) => e.key === 'Enter' && save()}
        class="w-full text-sm bg-surface-2 rounded-md px-2.5 py-1.5 outline-none"
      />
    `;
  }

  return html`
    <div class="group flex items-center gap-1 relative">
      <button
        onClick=${() => onSelect(list.id)}
        class="flex-1 flex items-center justify-between gap-2 text-left px-2.5 py-1.5 rounded-md text-[13px] transition-colors
          ${active ? 'bg-surface-2 text-ink font-medium' : 'text-ink-muted hover:bg-surface-2/60 hover:text-ink'}"
      >
        <span class="truncate-1">${list.name}</span>
        <${ListCountBadge} listId=${list.id} />
      </button>
      ${!list.isDefault && html`
        <button
          onClick=${(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
          onBlur=${() => setTimeout(() => setMenuOpen(false), 150)}
          class="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-ink p-0.5 shrink-0"
          aria-label="Mais opções da lista"
        >
          <${Icon} name="dots" size=${14} />
        </button>
      `}
      ${menuOpen && html`
        <div class="absolute right-0 top-7 z-10 bg-surface-1 border border-border rounded-lg shadow-panel py-1 w-36" style="box-shadow: var(--shadow-panel)">
          <button onMouseDown=${() => { setEditing(true); setMenuOpen(false); }} class="w-full text-left px-3 py-1.5 text-xs hover:bg-surface-2">Renomear</button>
          <button onMouseDown=${() => { setConfirmingDelete(true); setMenuOpen(false); }} class="w-full text-left px-3 py-1.5 text-xs text-danger hover:bg-surface-2">Eliminar</button>
        </div>
      `}
      ${confirmingDelete && html`<${DeleteListDialog} list=${list} onClose=${() => setConfirmingDelete(false)} />`}
    </div>
  `;
}

export function ListNav({ areaId, activeListId, onSelect }) {
  const [lists] = useLiveQuery(() => getLists(areaId), [areaId], []);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');

  async function submitNew() {
    if (newName.trim()) {
      const list = await createList(areaId, newName.trim());
      onSelect(list.id);
    }
    setNewName('');
    setAdding(false);
  }

  return html`
    <div class="flex flex-col gap-0.5">
      ${(lists || []).map((l) => html`<${ListRow} key=${l.id} list=${l} active=${l.id === activeListId} onSelect=${onSelect} />`)}
      ${adding ? html`
        <input
          autofocus value=${newName} onInput=${(e) => setNewName(e.target.value)}
          onBlur=${submitNew} onKeyDown=${(e) => e.key === 'Enter' && submitNew()}
          placeholder="Nome da lista" class="w-full text-sm bg-surface-2 rounded-md px-2.5 py-1.5 outline-none"
        />
      ` : html`
        <button onClick=${() => setAdding(true)} class="flex items-center gap-1.5 text-[13px] text-ink-faint hover:text-ink px-2.5 py-1.5">
          <${Icon} name="plus" size=${13} /> Nova lista
        </button>
      `}
    </div>
  `;
}
