import { html } from '../../lib/preact.js';
import { uiStore, useStore } from '../../state/store.js';
import { Sidebar } from './Sidebar.js';
import { TopBar } from './TopBar.js';
import { ToastHost } from '../common/Toast.js';
import { TodayView } from '../views/TodayView.js';
import { UpcomingView } from '../views/UpcomingView.js';
import { ListView } from '../views/ListView.js';
import { AllView } from '../views/AllView.js';
import { CompletedView } from '../views/CompletedView.js';
import { SearchView } from '../views/SearchView.js';
import { SettingsView } from '../views/SettingsView.js';

export function AppShell() {
  const { currentView, currentListId, areaFilter } = useStore(uiStore);

  let content;
  switch (currentView) {
    case 'upcoming': content = html`<${UpcomingView} areaFilter=${areaFilter} />`; break;
    case 'list': content = currentListId ? html`<${ListView} listId=${currentListId} />` : null; break;
    case 'all': content = html`<${AllView} areaFilter=${areaFilter} />`; break;
    case 'completed': content = html`<${CompletedView} areaFilter=${areaFilter} />`; break;
    case 'search': content = html`<${SearchView} areaFilter=${areaFilter} />`; break;
    case 'settings': content = html`<${SettingsView} />`; break;
    case 'today':
    default: content = html`<${TodayView} areaFilter=${areaFilter} />`;
  }

  return html`
    <div class="flex h-screen overflow-hidden">
      <${Sidebar} />
      <div class="flex-1 flex flex-col min-w-0">
        <${TopBar} />
        <main class="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
          ${content}
        </main>
      </div>
    </div>
    <${ToastHost} />
  `;
}
