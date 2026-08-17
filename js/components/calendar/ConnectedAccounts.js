import { html, useState } from '../../lib/preact.js';
import { useLiveQuery } from '../../state/useLiveQuery.js';
import { getAreas } from '../../api/areas.js';
import {
  getAccounts, connectAccount, disconnectAccount, reconnectAccount,
  syncAccountEvents, setAccountArea, getCalendarsForAccount, setCalendarVisibility,
} from '../../google/calendarClient.js';
import { googleIntegrationEnabled, getEffectiveClientId, setStoredClientId } from '../../google/config.js';
import { getSettings } from '../../api/settings.js';
import { showToast, uiStore } from '../../state/store.js';
import { AreaDot } from '../areas/AreaBadge.js';
import { Icon } from '../common/icons.js';
import { ConfirmDialog } from '../common/ConfirmDialog.js';

function AccountCalendars({ accountId }) {
  const [calendars] = useLiveQuery(() => getCalendarsForAccount(accountId), [accountId], []);
  const [open, setOpen] = useState(false);
  if (!calendars?.length) return null;
  return html`
    <div class="mt-2">
      <button onClick=${() => setOpen((v) => !v)} class="text-[11px] text-ink-faint hover:text-ink-muted flex items-center gap-1">
        <${Icon} name=${open ? 'chevronDown' : 'chevronRight'} size=${11} /> Calendários (${calendars.filter((c) => c.isVisible).length}/${calendars.length})
      </button>
      ${open && html`
        <div class="mt-1.5 space-y-1 pl-3">
          ${calendars.map((c) => html`
            <label key=${c.id} class="flex items-center gap-2 text-xs text-ink-muted">
              <input type="checkbox" checked=${c.isVisible} onChange=${(e) => setCalendarVisibility(c.id, e.target.checked)} class="accent-current" />
              ${c.name}
            </label>
          `)}
        </div>
      `}
    </div>
  `;
}

function AccountRow({ account, areas }) {
  const [syncing, setSyncing] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const area = areas.find((a) => a.id === account.areaId);

  async function sync() {
    setSyncing(true);
    const settings = await getSettings();
    const result = await syncAccountEvents(account.id, {
      pastDays: settings?.syncWindowPastDays ?? 30, futureDays: settings?.syncWindowFutureDays ?? 90,
    });
    setSyncing(false);
    if (!result.ok) showToast({ message: 'Não foi possível sincronizar. Talvez seja preciso voltar a autorizar.' });
  }

  async function reconnect() {
    try {
      await reconnectAccount(account.id);
      showToast({ message: 'Conta reautorizada.' });
    } catch (e) {
      showToast({ message: e.message || 'Não foi possível reautorizar.' });
    }
  }

  return html`
    <div class="border border-border rounded-xl p-3.5">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-sm font-medium truncate-1">${account.displayName}</p>
          <p class="text-xs text-ink-faint truncate-1">${account.email}</p>
        </div>
        <button onClick=${() => setConfirmingRemove(true)} class="text-ink-faint hover:text-danger shrink-0" aria-label="Desligar conta">
          <${Icon} name="unlink" size=${16} />
        </button>
      </div>

      ${account.status === 'needs_reauth' && html`
        <div class="mt-2.5 flex items-center gap-2 bg-danger-soft text-danger text-xs rounded-lg px-2.5 py-2">
          <${Icon} name="alert" size=${14} class="shrink-0" />
          <span class="flex-1">A autorização expirou.</span>
          <button onClick=${reconnect} class="font-semibold underline underline-offset-2">Voltar a ligar</button>
        </div>
      `}

      <div class="flex items-center gap-2 mt-3">
        <span class="text-[11px] text-ink-faint">Área:</span>
        <div class="flex gap-1">
          ${areas.map((a) => html`
            <button
              key=${a.id} onClick=${() => setAccountArea(account.id, a.id)}
              class="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border ${a.id === account.areaId ? 'border-border-strong text-ink' : 'border-transparent text-ink-faint hover:text-ink-muted'}"
            >
              <${AreaDot} area=${a} size=${6} /> ${a.name}
            </button>
          `)}
        </div>
      </div>

      <${AccountCalendars} accountId=${account.id} />

      <div class="flex items-center justify-between mt-3 pt-3 border-t border-border">
        <span class="text-[11px] font-mono text-ink-faint">
          ${account.lastSyncAt ? `sincronizado às ${new Date(account.lastSyncAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}` : 'ainda não sincronizado'}
        </span>
        <button onClick=${sync} disabled=${syncing} class="flex items-center gap-1.5 text-xs font-medium text-best hover:opacity-80 disabled:opacity-50">
          <${Icon} name="refresh" size=${13} class=${syncing ? 'animate-spin' : ''} /> ${syncing ? 'A sincronizar…' : 'Sincronizar agora'}
        </button>
      </div>
      ${confirmingRemove && html`
        <${ConfirmDialog}
          title="Desligar esta conta?"
          message=${`Os eventos em cache de ${account.email} serão apagados. As tuas tarefas não são afetadas.`}
          confirmLabel="Desligar" danger=${true}
          onCancel=${() => setConfirmingRemove(false)}
          onConfirm=${async () => { await disconnectAccount(account.id); setConfirmingRemove(false); }}
        />
      `}
    </div>
  `;
}

function ClientIdSetup({ onConfigured }) {
  const [draft, setDraft] = useState(getEffectiveClientId());

  function save() {
    const val = draft.trim();
    setStoredClientId(val);
    if (val) onConfigured();
  }

  return html`
    <div class="border border-dashed border-border rounded-xl p-4 flex flex-col gap-3">
      <div>
        <p class="text-sm font-medium mb-1">Configurar Google Calendar</p>
        <p class="text-xs text-ink-muted leading-relaxed">
          Cola aqui o teu Client ID OAuth do Google Cloud Console para ativar a integração.
        </p>
      </div>
      <div class="flex gap-2">
        <input
          type="text"
          placeholder="xxxx.apps.googleusercontent.com"
          value=${draft}
          onInput=${(e) => setDraft(e.target.value)}
          onKeyDown=${(e) => e.key === 'Enter' && save()}
          class="flex-1 bg-surface-2 border border-border rounded-lg px-2.5 py-1.5 text-xs font-mono outline-none focus:border-best min-w-0"
        />
        <button
          onClick=${save}
          disabled=${!draft.trim()}
          class="shrink-0 text-xs font-semibold bg-best text-white rounded-lg px-3 py-1.5 disabled:opacity-40 hover:opacity-80"
        >
          Guardar
        </button>
      </div>
    </div>
  `;
}

export function ConnectedAccounts() {
  const [areas] = useLiveQuery(() => getAreas(), [], []);
  const [accounts] = useLiveQuery(() => getAccounts(), [], []);
  const [connecting, setConnecting] = useState(false);
  const [configured, setConfigured] = useState(googleIntegrationEnabled());

  if (!configured) {
    return html`<${ClientIdSetup} onConfigured=${() => setConfigured(true)} />`;
  }

  async function connect() {
    setConnecting(true);
    try {
      await connectAccount(areas || []);
      showToast({ message: 'Conta Google ligada.' });
    } catch (e) {
      showToast({ message: e.message || 'Não foi possível ligar a conta.' });
    }
    setConnecting(false);
  }

  return html`
    <div class="space-y-3">
      ${(accounts || []).map((acc) => html`<${AccountRow} key=${acc.id} account=${acc} areas=${areas || []} />`)}
      <button
        onClick=${connect} disabled=${connecting}
        class="w-full flex items-center justify-center gap-2 border border-dashed border-border-strong rounded-xl py-3 text-sm font-medium text-ink-muted hover:text-ink hover:border-best transition-colors disabled:opacity-50"
      >
        <${Icon} name="plus" size=${16} /> ${connecting ? 'A abrir consentimento Google…' : 'Ligar conta Google'}
      </button>
      <p class="text-[11px] text-ink-faint leading-relaxed">
        Só é pedida permissão de leitura do calendário. A app nunca cria, altera nem apaga
        nada no teu Google Calendar (RN-04).
      </p>
    </div>
  `;
}
