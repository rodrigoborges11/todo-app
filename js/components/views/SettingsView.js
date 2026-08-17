import { html, useState, useEffect, useRef } from '../../lib/preact.js';
import { useLiveQuery } from '../../state/useLiveQuery.js';
import {
  requestPersistentStorage, isStoragePersisted, storageEstimate, wipeAllData,
} from '../../api/settings.js';
import { exportToFile, exportToCsv, validateImportPayload, importPayload } from '../../api/exportImport.js';
import { getAllTags, renameTag, deleteTag, tagUsageCount } from '../../api/tags.js';
import { getAreas } from '../../api/areas.js';
import { ConnectedAccounts } from '../calendar/ConnectedAccounts.js';
import { ConfirmDialog } from '../common/ConfirmDialog.js';
import { Icon } from '../common/icons.js';
import { showToast } from '../../state/store.js';

function SectionCard({ title, description, children }) {
  return html`
    <section class="border border-border rounded-xl p-4 flex flex-col gap-3">
      <div>
        <h2 class="text-sm font-semibold">${title}</h2>
        ${description && html`<p class="text-xs text-ink-faint mt-0.5">${description}</p>`}
      </div>
      ${children}
    </section>
  `;
}

function StorageSection() {
  const [persisted, setPersisted] = useState(null);
  const [estimate, setEstimate] = useState(null);

  async function refresh() {
    setPersisted(await isStoragePersisted());
    setEstimate(await storageEstimate());
  }
  useEffect(() => { refresh(); }, []);

  const mb = (bytes) => (bytes ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : '—');

  return html`
    <${SectionCard} title="Armazenamento local" description="As tuas tarefas vivem só neste dispositivo — não há conta nem servidor (RF-09).">
      <div class="flex items-center justify-between text-xs text-ink-muted">
        <span>Persistência garantida pelo browser</span>
        <span class="font-mono ${persisted ? 'text-success' : 'text-ink-faint'}">${persisted === null ? '…' : persisted ? 'ativa' : 'não pedida'}</span>
      </div>
      ${estimate && html`
        <div class="flex items-center justify-between text-xs text-ink-muted">
          <span>Espaço usado</span>
          <span class="font-mono">${mb(estimate.usage)} de ${mb(estimate.quota)}</span>
        </div>
      `}
      ${!persisted && html`
        <button
          onClick=${async () => { await requestPersistentStorage(); refresh(); }}
          class="text-xs font-semibold text-best hover:opacity-80 self-start"
        >
          Pedir armazenamento persistente
        </button>
      `}
    <//>
  `;
}

function ExportImportSection() {
  const fileRef = useRef(null);
  const [pending, setPending] = useState(null);

  function onFileChosen(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = validateImportPayload(reader.result);
      setPending(result.valid ? result : { error: result.error });
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  async function confirmImport(mode) {
    await importPayload(pending.json, mode);
    showToast({ message: 'Importação concluída.' });
    setPending(null);
  }

  return html`
    <${SectionCard} title="Exportar e importar" description="Sem conta, a exportação é a tua cópia de segurança e a forma de levar os dados para outro dispositivo (RF-60).">
      <div class="flex gap-2 flex-wrap">
        <button onClick=${exportToFile} class="flex items-center gap-1.5 text-xs font-medium bg-surface-2 hover:bg-surface-3 rounded-lg px-3 py-2">
          <${Icon} name="download" size=${14} /> Exportar JSON
        </button>
        <button onClick=${exportToCsv} class="flex items-center gap-1.5 text-xs font-medium bg-surface-2 hover:bg-surface-3 rounded-lg px-3 py-2">
          <${Icon} name="download" size=${14} /> Exportar CSV
        </button>
        <button onClick=${() => fileRef.current?.click()} class="flex items-center gap-1.5 text-xs font-medium bg-surface-2 hover:bg-surface-3 rounded-lg px-3 py-2">
          <${Icon} name="upload" size=${14} /> Importar JSON
        </button>
        <input ref=${fileRef} type="file" accept="application/json" class="hidden" onChange=${onFileChosen} />
      </div>

      ${pending?.error && html`<p class="text-xs text-danger">${pending.error}</p>`}
      ${pending?.counts && html`
        <${ConfirmDialog}
          title="Importar ficheiro"
          message=${`Encontrei ${pending.counts.tasks} tarefa(s), ${pending.counts.lists} lista(s) e ${pending.counts.areas} área(s). Como queres importar?`}
          confirmLabel="Juntar aos dados atuais"
          cancelLabel="Cancelar"
          onCancel=${() => setPending(null)}
          onConfirm=${() => confirmImport('merge')}
        >
          <button onClick=${() => confirmImport('replace')} class="mt-2 text-xs text-danger hover:opacity-80">
            Ou substituir tudo o que já existe (elimina os dados atuais)
          </button>
        <//>
      `}
    <//>
  `;
}

function TagRow({ tag, area }) {
  const [count] = useLiveQuery(() => tagUsageCount(tag.id), [tag.id], 0);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(tag.name);
  const [confirming, setConfirming] = useState(false);

  async function save() {
    if (name.trim()) await renameTag(tag.id, name.trim());
    setEditing(false);
  }

  return html`
    <div class="flex items-center justify-between gap-2 py-1.5">
      ${editing ? html`
        <input autofocus value=${name} onInput=${(e) => setName(e.target.value)} onBlur=${save} onKeyDown=${(e) => e.key === 'Enter' && save()}
          class="flex-1 bg-surface-2 rounded-md px-2 py-1 text-xs outline-none" />
      ` : html`
        <button onClick=${() => setEditing(true)} class="font-mono text-xs text-ink-muted hover:text-ink text-left">#${tag.name}</button>
      `}
      <span class="text-[11px] text-ink-faint">${area ? area.name : 'global'} · ${count}</span>
      <button onClick=${() => setConfirming(true)} class="text-ink-faint hover:text-danger"><${Icon} name="x" size=${13} /></button>
      ${confirming && html`
        <${ConfirmDialog}
          title="Eliminar etiqueta?" danger=${true} confirmLabel="Eliminar"
          message=${`"#${tag.name}" será removida de ${count} tarefa(s).`}
          onCancel=${() => setConfirming(false)}
          onConfirm=${async () => { await deleteTag(tag.id); setConfirming(false); }}
        />
      `}
    </div>
  `;
}

function TagsSection() {
  const [tags] = useLiveQuery(() => getAllTags(), [], []);
  const [areas] = useLiveQuery(() => getAreas(), [], []);
  const areasById = Object.fromEntries((areas || []).map((a) => [a.id, a]));

  if (!tags?.length) return null;
  return html`
    <${SectionCard} title="Etiquetas" description="Geridas aqui; também podes criar novas diretamente ao editar uma tarefa.">
      <div class="divide-y divide-border">
        ${tags.map((t) => html`<${TagRow} key=${t.id} tag=${t} area=${areasById[t.areaId]} />`)}
      </div>
    <//>
  `;
}

function DangerZone() {
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  return html`
    <${SectionCard} title="Zona de risco">
      <button onClick=${() => setConfirming(true)} class="flex items-center gap-1.5 text-xs font-medium text-danger hover:opacity-80 self-start">
        <${Icon} name="trash" size=${14} /> Apagar todos os dados
      </button>
      ${confirming && html`
        <${ConfirmDialog}
          title="Apagar tudo?" danger=${true}
          confirmLabel="Apagar definitivamente"
          message="Isto elimina todas as áreas, listas, tarefas e etiquetas deste dispositivo. Não há Anular. Exporta primeiro se não tiveres a certeza."
          onCancel=${() => { setConfirming(false); setConfirmText(''); }}
          onConfirm=${() => confirmText === 'APAGAR' && wipeAllData()}
        >
          <label class="block text-xs text-ink-muted mt-3 mb-1">Escreve APAGAR para confirmar</label>
          <input
            value=${confirmText} onInput=${(e) => setConfirmText(e.target.value)}
            class="w-full bg-surface-2 border border-border rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-danger"
          />
        <//>
      `}
    <//>
  `;
}

export function SettingsView() {
  return html`
    <div class="max-w-2xl mx-auto flex flex-col gap-4 view-enter pb-10">
      <h1 class="text-xl font-semibold mb-1">Definições</h1>

      <${SectionCard} title="Google Calendar" description="Apenas leitura — a app nunca escreve no teu calendário (secção 2.2 do documento de requisitos).">
        <${ConnectedAccounts} />
      <//>

      <${StorageSection} />
      <${ExportImportSection} />
      <${TagsSection} />
      <${DangerZone} />
    </div>
  `;
}
