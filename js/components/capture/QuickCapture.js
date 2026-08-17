import { html, useState, useRef, useEffect, useMemo } from '../../lib/preact.js';
import { useLiveQuery } from '../../state/useLiveQuery.js';
import { getAreas } from '../../api/areas.js';
import { getLists } from '../../api/lists.js';
import { createTask } from '../../api/tasks.js';
import { Icon } from '../common/icons.js';
import { AreaDot } from '../areas/AreaBadge.js';

export function QuickCapture({ areaFilter, defaultListId = null }) {
  const [areas] = useLiveQuery(() => getAreas(), [], []);
  const [lists] = useLiveQuery(() => getLists(), [], []);
  const [title, setTitle] = useState('');
  const [targetAreaId, setTargetAreaId] = useState(null);
  const [targetListId, setTargetListId] = useState(defaultListId);
  const [pickerOpen, setPickerOpen] = useState(false);
  const inputRef = useRef(null);

  const defaultArea = useMemo(() => {
    if (areaFilter && areaFilter !== 'all') return areaFilter;
    return areas?.[0]?.id || null;
  }, [areaFilter, areas]);

  useEffect(() => {
    if (!targetAreaId) setTargetAreaId(defaultArea);
  }, [defaultArea]);

  useEffect(() => {
    if (defaultListId) { setTargetListId(defaultListId); return; }
    if (!targetAreaId || !lists) return;
    const inbox = lists.find((l) => l.areaId === targetAreaId && l.isDefault);
    setTargetListId((current) => {
      const stillValid = lists.some((l) => l.id === current && l.areaId === targetAreaId);
      return stillValid ? current : (inbox?.id || null);
    });
  }, [targetAreaId, lists, defaultListId]);

  // Atalho global "N" para focar a captura rápida (RF-51)
  useEffect(() => {
    function onKey(e) {
      const tag = document.activeElement?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA';
      if (e.key.toLowerCase() === 'n' && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const area = areas?.find((a) => a.id === targetAreaId);
  const listsForArea = (lists || []).filter((l) => l.areaId === targetAreaId);

  async function submit(e) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || !targetListId || !targetAreaId) return;
    await createTask({ title: trimmed, listId: targetListId, areaId: targetAreaId });
    setTitle('');
    inputRef.current?.focus();
  }

  if (!areas?.length) return null;

  return html`
    <form onSubmit=${submit} class="relative flex items-center gap-2 bg-surface-1 border border-border rounded-xl px-3 py-2.5 shadow-sm focus-within:border-best transition-colors">
      <${Icon} name="plus" size=${18} class="text-ink-faint shrink-0" />
      <input
        ref=${inputRef}
        value=${title}
        onInput=${(e) => setTitle(e.target.value)}
        placeholder="Nova tarefa — Enter para adicionar (atalho: N)"
        class="quick-capture-input flex-1 bg-transparent outline-none text-sm"
      />
      <div class="relative shrink-0">
        <button
          type="button" onClick=${() => setPickerOpen((v) => !v)}
          class="flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink bg-surface-2 rounded-lg px-2.5 py-1.5"
        >
          <${AreaDot} area=${area} size=${7} />
          ${lists?.find((l) => l.id === targetListId)?.name || area?.name || '—'}
          <${Icon} name="chevronDown" size=${13} />
        </button>
        ${pickerOpen && html`
          <div class="absolute right-0 mt-1 w-52 bg-surface-1 border border-border rounded-lg shadow-panel py-1.5 z-20" style="box-shadow: var(--shadow-panel)">
            ${areas.map((a) => html`
              <div key=${a.id}>
                <button
                  type="button"
                  onClick=${() => setTargetAreaId(a.id)}
                  class="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold ${a.id === targetAreaId ? 'text-ink' : 'text-ink-muted'} hover:bg-surface-2"
                >
                  <${AreaDot} area=${a} size=${7} /> ${a.name}
                </button>
                ${a.id === targetAreaId && listsForArea.map((l) => html`
                  <button
                    key=${l.id} type="button"
                    onClick=${() => { setTargetListId(l.id); setPickerOpen(false); }}
                    class="w-full text-left pl-8 pr-3 py-1.5 text-xs ${l.id === targetListId ? 'text-best font-medium' : 'text-ink-muted'} hover:bg-surface-2"
                  >
                    ${l.name}
                  </button>
                `)}
              </div>
            `)}
          </div>
        `}
      </div>
    </form>
  `;
}
