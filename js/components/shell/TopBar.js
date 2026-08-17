import { html } from '../../lib/preact.js';
import { uiStore, useStore } from '../../state/store.js';
import { Icon } from '../common/icons.js';

const TITLES = { today: 'Hoje', upcoming: 'Próximas', all: 'Todas', completed: 'Concluídas', search: 'Pesquisar', settings: 'Definições', list: 'Lista' };

export function TopBar() {
  const { currentView } = useStore(uiStore);
  return html`
    <div class="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
      <button onClick=${() => uiStore.set({ sidebarOpen: true })} aria-label="Abrir menu" class="text-ink-muted">
        <${Icon} name="menu" size=${20} />
      </button>
      <h1 class="font-semibold text-[15px]">${TITLES[currentView] || 'Ledger'}</h1>
    </div>
  `;
}
