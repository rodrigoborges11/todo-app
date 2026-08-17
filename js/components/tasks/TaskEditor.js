import { html, useState, useEffect } from '../../lib/preact.js';
import { Modal } from '../common/Modal.js';
import { useLiveQuery } from '../../state/useLiveQuery.js';
import { getAreas } from '../../api/areas.js';
import { getLists } from '../../api/lists.js';
import { updateTask, deleteTask, restoreTask } from '../../api/tasks.js';
import { showToast } from '../../state/store.js';
import { PRIORITY_META } from '../common/priority.js';
import { TagPicker } from '../tags/TagPicker.js';
import { Icon } from '../common/icons.js';
import { dateInputToTs, tsToDateInput, tsToTimeInput, combineDateTime, formatFullDate } from '../../lib/date.js';

export function TaskEditor({ task, onClose }) {
  const [areas] = useLiveQuery(() => getAreas(), [], []);
  const [lists] = useLiveQuery(() => getLists(), [], []);

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [areaId, setAreaId] = useState(task.areaId);
  const [listId, setListId] = useState(task.listId);
  const [dateVal, setDateVal] = useState(tsToDateInput(task.dueAt));
  const [timeVal, setTimeVal] = useState(tsToTimeInput(task.dueAt));
  const [priority, setPriority] = useState(task.priority);
  const [tagIds, setTagIds] = useState(task.tagIds || []);
  const [savedAt, setSavedAt] = useState(null);

  const listsForArea = (lists || []).filter((l) => l.areaId === areaId);

  useEffect(() => {
    if (listsForArea.length && !listsForArea.some((l) => l.id === listId)) {
      const inbox = listsForArea.find((l) => l.isDefault) || listsForArea[0];
      setListId(inbox.id);
    }
  }, [areaId, lists]);

  // Guardar automaticamente (com pequeno atraso) sempre que algo muda — RF-04.
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!title.trim()) return;
      const dueAt = dateVal ? combineDateTime(dateInputToTs(dateVal), timeVal) : null;
      await updateTask(task.id, {
        title: title.trim(), description: description.trim() || null,
        areaId, listId, dueAt, priority, tagIds,
      });
      setSavedAt(Date.now());
    }, 350);
    return () => clearTimeout(t);
  }, [title, description, areaId, listId, dateVal, timeVal, priority, tagIds]);

  async function handleDelete() {
    const backup = await deleteTask(task.id);
    showToast({ message: `"${task.title}" eliminada.`, actionLabel: 'Anular', onAction: () => restoreTask(backup) });
    onClose();
  }

  if (!areas?.length) return null;

  return html`
    <${Modal} title="Editar tarefa" onClose=${onClose} side="right">
      <div class="flex flex-col gap-5">
        <div>
          <input
            data-autofocus
            value=${title}
            onInput=${(e) => setTitle(e.target.value)}
            placeholder="Título da tarefa"
            class="w-full text-[17px] font-medium bg-transparent outline-none border-b border-transparent focus:border-border pb-1"
          />
        </div>

        <div>
          <textarea
            value=${description}
            onInput=${(e) => setDescription(e.target.value)}
            placeholder="Adicionar notas…"
            rows="3"
            class="w-full text-sm bg-surface-2/50 border border-border rounded-lg px-3 py-2 outline-none focus:border-best resize-none"
          ></textarea>
        </div>

        <div>
          <label class="block text-[11px] font-mono uppercase tracking-wide text-ink-faint mb-1.5">Área</label>
          <div class="flex gap-1.5 flex-wrap">
            ${areas.map((a) => html`
              <button
                key=${a.id} onClick=${() => setAreaId(a.id)}
                class="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
                  ${areaId === a.id ? 'border-best text-best bg-best-soft' : 'border-border text-ink-muted hover:border-border-strong'}"
              >${a.name}</button>
            `)}
          </div>
        </div>

        <div>
          <label class="block text-[11px] font-mono uppercase tracking-wide text-ink-faint mb-1.5">Lista</label>
          <select
            value=${listId} onChange=${(e) => setListId(e.target.value)}
            class="w-full bg-surface-2/50 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-best"
          >
            ${listsForArea.map((l) => html`<option key=${l.id} value=${l.id}>${l.name}</option>`)}
          </select>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-[11px] font-mono uppercase tracking-wide text-ink-faint mb-1.5">Data</label>
            <input
              type="date" value=${dateVal}
              onInput=${(e) => setDateVal(e.target.value)}
              class="w-full bg-surface-2/50 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-best"
            />
          </div>
          <div>
            <label class="block text-[11px] font-mono uppercase tracking-wide text-ink-faint mb-1.5">Hora (opcional)</label>
            <input
              type="time" value=${timeVal} disabled=${!dateVal}
              onInput=${(e) => setTimeVal(e.target.value)}
              class="w-full bg-surface-2/50 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-best disabled:opacity-40"
            />
          </div>
        </div>
        ${dateVal && html`<p class="text-xs text-ink-faint -mt-3">${formatFullDate(dateInputToTs(dateVal))}</p>`}

        <div>
          <label class="block text-[11px] font-mono uppercase tracking-wide text-ink-faint mb-1.5">Prioridade</label>
          <div class="flex gap-1.5">
            ${Object.entries(PRIORITY_META).map(([key, meta]) => html`
              <button
                key=${key} onClick=${() => setPriority(key)}
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
                  ${priority === key ? 'border-best text-ink bg-surface-2' : 'border-border text-ink-muted hover:border-border-strong'}"
              >
                ${key !== 'none' && html`<span class="w-2 h-2 rounded-full" style=${`background:${meta.color}`}></span>`}
                ${meta.label}
              </button>
            `)}
          </div>
        </div>

        <div>
          <label class="block text-[11px] font-mono uppercase tracking-wide text-ink-faint mb-1.5">Etiquetas</label>
          <${TagPicker} areaId=${areaId} selectedIds=${tagIds} onChange=${setTagIds} />
        </div>

        <div class="flex items-center justify-between pt-2 border-t border-border">
          <span class="text-[11px] text-ink-faint font-mono">${savedAt ? 'guardado' : ' '}</span>
          <button onClick=${handleDelete} class="flex items-center gap-1.5 text-xs font-medium text-danger hover:opacity-80">
            <${Icon} name="trash" size=${14} /> Eliminar tarefa
          </button>
        </div>
      </div>
    <//>
  `;
}
