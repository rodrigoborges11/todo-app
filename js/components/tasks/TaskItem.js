import { html, useState } from '../../lib/preact.js';
import { setCompleted, deleteTask, restoreTask, taskIsOverdue } from '../../api/tasks.js';
import { showToast } from '../../state/store.js';
import { formatDateTimeShort, daysLate } from '../../lib/date.js';
import { areaColorVar } from '../../api/areas.js';
import { PriorityDot } from '../common/priority.js';
import { TagChip } from '../tags/TagChip.js';
import { Icon } from '../common/icons.js';

export function TaskItem({
  task, area, tags = [], showArea = false, showList = false, listName = '',
  draggable = false, onDragStart, onDragOver, onDrop, onDragEnd, isDragOver = false,
  onOpen,
}) {
  const [busy, setBusy] = useState(false);
  const overdue = taskIsOverdue(task);

  async function toggle(e) {
    e.stopPropagation();
    setBusy(true);
    const next = !task.isCompleted;
    await setCompleted(task.id, next);
    setBusy(false);
    if (next) {
      showToast({
        message: `"${task.title}" concluída.`,
        actionLabel: 'Anular',
        onAction: () => setCompleted(task.id, false),
      });
    }
  }

  async function remove(e) {
    e.stopPropagation();
    const backup = await deleteTask(task.id);
    showToast({
      message: `"${task.title}" eliminada.`,
      actionLabel: 'Anular',
      onAction: () => restoreTask(backup),
    });
  }

  return html`
    <div
      draggable=${draggable}
      onDragStart=${onDragStart} onDragOver=${onDragOver} onDrop=${onDrop} onDragEnd=${onDragEnd}
      onClick=${() => onOpen(task)}
      class="group flex items-start gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-surface-2/70 transition-colors ${isDragOver ? 'drop-target' : ''}"
      style=${area ? `box-shadow: inset 3px 0 0 0 ${areaColorVar(area)}` : ''}
    >
      ${draggable && html`<span class="text-ink-faint pt-0.5 opacity-0 group-hover:opacity-60 cursor-grab shrink-0"><${Icon} name="grip" size=${14} /></span>`}

      <button
        onClick=${toggle} disabled=${busy}
        aria-label=${task.isCompleted ? 'Marcar como não concluída' : 'Marcar como concluída'}
        class="mt-0.5 w-[19px] h-[19px] rounded-md border-2 shrink-0 flex items-center justify-center transition-colors
          ${task.isCompleted ? 'bg-success border-success' : 'border-border-strong hover:border-best'}"
      >
        ${task.isCompleted && html`<${Icon} name="check" size=${12} strokeWidth=${3} class="text-white" />`}
      </button>

      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <${PriorityDot} priority=${task.priority} />
          <p data-done=${task.isCompleted} class="task-title text-[14px] leading-snug truncate-1 ${task.isCompleted ? 'text-ink-faint' : 'text-ink'}">
            ${task.title}
          </p>
        </div>
        ${(task.dueAt || tags.length > 0 || showArea || showList) && html`
          <div class="flex items-center flex-wrap gap-x-2 gap-y-1 mt-1">
            ${task.dueAt && html`
              <span class="inline-flex items-center gap-1 text-[11px] font-mono ${overdue ? 'text-danger font-medium' : 'text-ink-faint'}">
                <${Icon} name="clock" size=${11} />
                ${formatDateTimeShort(task.dueAt)}
                ${overdue && ` · ${daysLate(task.dueAt)}d atraso`}
              </span>
            `}
            ${showArea && area && html`<span class="text-[11px] text-ink-faint" style=${`color:${areaColorVar(area)}`}>${area.name}</span>`}
            ${showList && listName && html`<span class="text-[11px] text-ink-faint">· ${listName}</span>`}
            ${tags.map((t) => html`<${TagChip} key=${t.id} tag=${t} />`)}
          </div>
        `}
      </div>

      <button
        onClick=${remove} aria-label="Eliminar tarefa"
        class="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-danger shrink-0 mt-0.5 transition-opacity"
      >
        <${Icon} name="trash" size=${15} />
      </button>
    </div>
  `;
}
