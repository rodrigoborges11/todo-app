import { render, html } from './lib/preact.js';
import { dbReady } from './db/schema.js';
import { getSettings, requestPersistentStorage, checkStorageAvailable } from './api/settings.js';
import { uiStore, applyTheme } from './state/store.js';
import { AppShell } from './components/shell/AppShell.js';

const root = document.getElementById('app');

function renderFatalError(message) {
  root.innerHTML = `
    <div style="min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui,sans-serif;">
      <div style="max-width:420px;text-align:center;color:#E7EAF2;">
        <p style="font-weight:600;margin-bottom:8px;">Não foi possível abrir a aplicação</p>
        <p style="font-size:14px;color:#8B92A6;line-height:1.5;">${message}</p>
      </div>
    </div>
  `;
}

async function boot() {
  const available = await checkStorageAvailable();
  if (!available) {
    renderFatalError(
      'O armazenamento local (IndexedDB) não está disponível neste browser — pode estar em modo privado ou com o armazenamento bloqueado nas definições. A app não consegue guardar tarefas sem ele.',
    );
    return;
  }

  try {
    await dbReady();
  } catch (e) {
    renderFatalError(`Erro ao preparar a base de dados local: ${e.message}`);
    return;
  }

  const settings = await getSettings();
  const theme = settings?.theme || 'system';
  applyTheme(theme);
  uiStore.set({
    theme,
    areaFilter: settings?.activeAreaFilter || 'all',
    currentView: settings?.defaultView || 'today',
  });

  // Preferência de tema do sistema pode mudar sem o utilizador tocar em nada.
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (uiStore.get().theme === 'system') applyTheme('system');
  });

  requestPersistentStorage();

  render(html`<${AppShell} />`, root);
}

boot();
