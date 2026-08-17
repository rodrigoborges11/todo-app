import { html, useState, useMemo, useRef } from '../../lib/preact.js';
import { useLiveQuery } from '../../state/useLiveQuery.js';
import { getTagsForArea, createTag } from '../../api/tags.js';
import { TagChip } from './TagChip.js';
import { Icon } from '../common/icons.js';

export function TagPicker({ areaId, selectedIds, onChange }) {
  const [allTags] = useLiveQuery(() => getTagsForArea(areaId), [areaId], []);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);

  const selected = (allTags || []).filter((t) => selectedIds.includes(t.id));
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (allTags || [])
      .filter((t) => !selectedIds.includes(t.id))
      .filter((t) => !q || t.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [allTags, query, selectedIds]);

  async function addExisting(tag) {
    onChange([...selectedIds, tag.id]);
    setQuery('');
    inputRef.current?.focus();
  }

  async function addNew() {
    const name = query.trim();
    if (!name) return;
    const tag = await createTag(name, areaId);
    onChange([...selectedIds, tag.id]);
    setQuery('');
  }

  function remove(id) {
    onChange(selectedIds.filter((x) => x !== id));
  }

  const exactMatch = (allTags || []).some((t) => t.name.toLowerCase() === query.trim().toLowerCase());

  return html`
    <div class="relative">
      <div class="flex flex-wrap items-center gap-1.5 border border-border rounded-lg px-2.5 py-2 bg-surface-2/50 focus-within:border-best transition-colors">
        <${Icon} name="tag" size=${14} class="text-ink-faint shrink-0" />
        ${selected.map((t) => html`<${TagChip} key=${t.id} tag=${t} onRemove=${() => remove(t.id)} />`)}
        <input
          ref=${inputRef}
          value=${query}
          onInput=${(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus=${() => setOpen(true)}
          onBlur=${() => setTimeout(() => setOpen(false), 150)}
          onKeyDown=${(e) => {
            if (e.key === 'Enter') { e.preventDefault(); exactMatch ? addExisting((allTags || []).find((t) => t.name.toLowerCase() === query.trim().toLowerCase())) : addNew(); }
            if (e.key === 'Backspace' && !query && selected.length) remove(selected[selected.length - 1].id);
          }}
          placeholder=${selected.length ? '' : 'Escreve # para adicionar etiquetas'}
          class="flex-1 min-w-[80px] bg-transparent outline-none text-sm py-0.5"
        />
      </div>
      ${open && (suggestions.length > 0 || query.trim()) && html`
        <div class="absolute z-10 mt-1 w-full bg-surface-1 border border-border rounded-lg shadow-panel py-1 max-h-48 overflow-y-auto" style="box-shadow: var(--shadow-panel)">
          ${suggestions.map((t) => html`
            <button key=${t.id} onMouseDown=${() => addExisting(t)} class="w-full text-left px-3 py-1.5 text-sm hover:bg-surface-2 font-mono text-ink-muted">
              #${t.name}
            </button>
          `)}
          ${query.trim() && !exactMatch && html`
            <button onMouseDown=${addNew} class="w-full text-left px-3 py-1.5 text-sm hover:bg-surface-2 text-best font-medium">
              Criar etiqueta "${query.trim()}"
            </button>
          `}
        </div>
      `}
    </div>
  `;
}
