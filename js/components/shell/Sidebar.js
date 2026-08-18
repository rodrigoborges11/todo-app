import { html } from '../../lib/preact.js';
import { useLiveQuery } from '../../state/useLiveQuery.js';
import { getAreas, createArea } from '../../api/areas.js';
import { getTodayTasks } from '../../api/tasks.js';
import { uiStore, useStore, applyTheme } from '../../state/store.js';
import { AreaSwitcher } from '../areas/AreaSwitcher.js';
import { ListNav } from '../lists/ListNav.js';
import { Icon } from '../common/icons.js';
import { updateSettings } from '../../api/settings.js';

const NAV_ITEMS = [
  { id: 'today', label: 'Hoje', icon: 'sun' },
  { id: 'upcoming', label: 'Próximas', icon: 'calendar' },
  { id: 'calendar', label: 'Calendário', icon: 'grid' },
  { id: 'all', label: 'Todas', icon: 'inbox' },
  { id: 'completed', label: 'Concluídas', icon: 'check' },
  { id: 'search', label: 'Pesquisar', icon: 'search' },
];

export function Sidebar() {
  const { areaFilter, currentView, currentListId, sidebarOpen, theme } = useStore(uiStore);
  const [areas] = useLiveQuery(() => getAreas(), [], []);
  const [todayCount] = useLiveQuery(async () => (await getTodayTasks(areaFilter)).length, [areaFilter], 0);

  function goto(view, listId = null) {
    uiStore.set({ currentView: view, currentListId: listId, sidebarOpen: false });
  }

  function setAreaFilter(id) {
    uiStore.set({ areaFilter: id, currentListId: null });
    updateSettings({ activeAreaFilter: id });
  }

  async function addArea() {
    const name = prompt('Nome da nova área (ex.: Faculdade):');
    if (name?.trim()) {
      const area = await createArea({ name: name.trim() });
      setAreaFilter(area.id);
    }
  }

  function cycleTheme() {
    const next = theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark';
    uiStore.set({ theme: next });
    applyTheme(next);
    updateSettings({ theme: next });
  }

  const singleArea = areaFilter !== 'all' ? (areas || []).find((a) => a.id === areaFilter) : null;

  return html`
    <aside class="${sidebarOpen ? 'flex' : 'hidden'} lg:flex fixed lg:static inset-0 z-40 lg:z-auto w-full lg:w-64 shrink-0 flex-col bg-surface-0 lg:border-r border-border">
      <div class="flex items-center justify-between px-4 pt-4 lg:pt-5 pb-1 shrink-0">
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 rounded-md bg-best/15 flex items-center justify-center">
            <div class="w-2 h-2 rounded-sm bg-best"></div>
          </div>
          <span class="font-semibold text-[14px] tracking-tight">Ledger</span>
        </div>
        <button onClick=${() => uiStore.set({ sidebarOpen: false })} class="lg:hidden text-ink-muted" aria-label="Fechar menu">
          <${Icon} name="x" size=${20} />
        </button>
      </div>

      <${AreaSwitcher} areas=${areas || []} value=${areaFilter} onChange=${setAreaFilter} />

      <nav class="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-4 bg-surface-1/60 mx-2 mb-2 rounded-xl border border-border">
        <div class="flex flex-col gap-0.5">
          ${NAV_ITEMS.map((item) => html`
            <button
              key=${item.id} onClick=${() => goto(item.id)}
              class="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13.5px] transition-colors
                ${currentView === item.id ? 'bg-surface-2 text-ink font-medium' : 'text-ink-muted hover:bg-surface-2/60 hover:text-ink'}"
            >
              <${Icon} name=${item.icon} size=${15} />
              ${item.label}
              ${item.id === 'today' && !!todayCount && html`<span class="ml-auto font-mono text-[10px] text-ink-faint">${todayCount}</span>`}
            </button>
          `)}
        </div>

        ${singleArea && html`
          <div>
            <p class="px-2.5 text-[10px] font-mono uppercase tracking-widest text-ink-faint mb-1.5">Listas — ${singleArea.name}</p>
            <${ListNav} areaId=${singleArea.id} activeListId=${currentListId} onSelect=${(id) => goto('list', id)} />
          </div>
        `}
        ${!singleArea && html`
          <p class="px-2.5 text-[11px] text-ink-faint leading-relaxed">
            Escolhe uma área acima para veres e organizares as respetivas listas.
          </p>
        `}

        <button onClick=${addArea} class="flex items-center gap-2 px-2.5 py-1.5 text-[12px] text-ink-faint hover:text-ink-muted mt-auto">
          <${Icon} name="plus" size=${13} /> Nova área
        </button>
      </nav>

      <div class="flex items-center justify-between px-4 py-3 shrink-0 border-t border-border">
        <button onClick=${cycleTheme} aria-label="Alternar tema" class="text-ink-faint hover:text-ink flex items-center gap-1.5 text-xs">
          <${Icon} name=${theme === 'light' ? 'sun' : theme === 'dark' ? 'moon' : 'settings'} size=${15} />
          ${theme === 'system' ? 'Automático' : theme === 'dark' ? 'Escuro' : 'Claro'}
        </button>
        <button onClick=${() => goto('settings')} aria-label="Definições" class="text-ink-faint hover:text-ink">
          <${Icon} name="settings" size=${17} />
        </button>
      </div>
    </aside>
  `;
}
