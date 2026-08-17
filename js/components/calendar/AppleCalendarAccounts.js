import { html, useState } from '../../lib/preact.js';
import { useLiveQuery } from '../../state/useLiveQuery.js';
import { getAreas } from '../../api/areas.js';
import {
  getAppleAccounts, importIcsFile, reimportIcsFile,
  disconnectAppleAccount, setAppleAccountArea,
} from '../../apple/calendarClient.js';
import { showToast } from '../../state/store.js';
import { AreaDot } from '../areas/AreaBadge.js';
import { Icon } from '../common/icons.js';
import { ConfirmDialog } from '../common/ConfirmDialog.js';

function AccountRow({ account, areas }) {
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [updating, setUpdating] = useState(false);

  async function handleReimport(e) {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    setUpdating(true);
    try {
      const { eventCount } = await reimportIcsFile(account.id, file);
      showToast({ message: `Calendário atualizado — ${eventCount} evento(s) importado(s).` });
    } catch (err) {
      showToast({ message: err.message || 'Erro ao reimportar o ficheiro.' });
    }
    setUpdating(false);
  }

  return html`
    <div class="border border-border rounded-xl p-3.5">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="flex items-center gap-1.5">
            <svg class="shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <p class="text-sm font-medium truncate">${account.displayName}</p>
          </div>
          <p class="text-xs text-ink-faint mt-0.5 pl-[22px]">Apple Calendar (.ics)</p>
        </div>
        <button onClick=${() => setConfirmingRemove(true)} class="text-ink-faint hover:text-danger shrink-0" aria-label="Remover calendário">
          <${Icon} name="unlink" size=${16} />
        </button>
      </div>

      <div class="flex items-center gap-2 mt-3">
        <span class="text-[11px] text-ink-faint">Área:</span>
        <div class="flex gap-1">
          ${areas.map((a) => html`
            <button
              key=${a.id} onClick=${() => setAppleAccountArea(account.id, a.id)}
              class="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border ${a.id === account.areaId ? 'border-border-strong text-ink' : 'border-transparent text-ink-faint hover:text-ink-muted'}"
            >
              <${AreaDot} area=${a} size=${6} /> ${a.name}
            </button>
          `)}
        </div>
      </div>

      <div class="flex items-center justify-between mt-3 pt-3 border-t border-border">
        <span class="text-[11px] font-mono text-ink-faint">
          ${account.lastSyncAt ? `importado às ${new Date(account.lastSyncAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}` : 'sem data'}
        </span>
        <label class="flex items-center gap-1.5 text-xs font-medium text-best hover:opacity-80 cursor-pointer ${updating ? 'opacity-50 pointer-events-none' : ''}">
          <${Icon} name="refresh" size=${13} /> ${updating ? 'A atualizar…' : 'Atualizar ficheiro'}
          <input type="file" accept=".ics,text/calendar" class="hidden" onChange=${handleReimport} />
        </label>
      </div>

      ${confirmingRemove && html`
        <${ConfirmDialog}
          title="Remover este calendário?"
          message=${`Os eventos de "${account.displayName}" serão apagados. As tuas tarefas não são afetadas.`}
          confirmLabel="Remover" danger=${true}
          onCancel=${() => setConfirmingRemove(false)}
          onConfirm=${async () => { await disconnectAppleAccount(account.id); setConfirmingRemove(false); }}
        />
      `}
    </div>
  `;
}

export function AppleCalendarAccounts() {
  const [areas] = useLiveQuery(() => getAreas(), [], []);
  const [accounts] = useLiveQuery(() => getAppleAccounts(), [], []);
  const [importing, setImporting] = useState(false);

  async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    setImporting(true);
    try {
      const { eventCount } = await importIcsFile(file, { areaId: areas?.[0]?.id || null });
      showToast({ message: `${eventCount} evento(s) importado(s) com sucesso.` });
    } catch (err) {
      showToast({ message: err.message || 'Erro ao importar o ficheiro.' });
    }
    setImporting(false);
  }

  return html`
    <div class="space-y-3">
      ${(accounts || []).map((acc) => html`<${AccountRow} key=${acc.id} account=${acc} areas=${areas || []} />`)}

      <label class="w-full flex items-center justify-center gap-2 border border-dashed border-border-strong rounded-xl py-3 text-sm font-medium text-ink-muted hover:text-ink hover:border-best transition-colors cursor-pointer ${importing ? 'opacity-50 pointer-events-none' : ''}">
        <${Icon} name="plus" size=${16} /> ${importing ? 'A importar…' : 'Importar calendário (.ics)'}
        <input type="file" accept=".ics,text/calendar" class="hidden" onChange=${handleImport} />
      </label>

      <div class="text-[11px] text-ink-faint leading-relaxed space-y-1">
        <p>No Mac: abre o <strong>Calendário</strong> → clica com o botão direito num calendário → Exportar…</p>
        <p>Os eventos ficam guardados localmente. Para atualizar, reimporta o ficheiro.</p>
      </div>
    </div>
  `;
}
