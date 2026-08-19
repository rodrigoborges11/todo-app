import { db, SCHEMA_VERSION } from '../db/schema.js';
import { updateSettings } from './settings.js';

const EXPORTABLE_TABLES = ['areas', 'lists', 'tasks', 'tags', 'taskTags'];

export async function buildExportPayload() {
  const data = {};
  for (const name of EXPORTABLE_TABLES) {
    data[name] = await db.table(name).toArray();
  }
  const settings = await db.settings.get('app');
  return {
    app: 'todo-cenas',
    schema_version: SCHEMA_VERSION,
    exported_at: new Date().toISOString(),
    settings: settings ? {
      theme: settings.theme, defaultView: settings.defaultView,
      activeAreaFilter: settings.activeAreaFilter,
      syncWindowPastDays: settings.syncWindowPastDays,
      syncWindowFutureDays: settings.syncWindowFutureDays,
    } : {},
    ...data,
  };
}

export async function exportToFile() {
  const payload = await buildExportPayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tarefas-${date}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  await updateSettings({ lastExportAt: Date.now() });
}

export function validateImportPayload(raw) {
  let json;
  try {
    json = JSON.parse(raw);
  } catch {
    return { valid: false, error: 'O ficheiro não é um JSON válido.' };
  }
  if (json.app !== 'todo-cenas' && json.app !== 'todo-app') {
    return { valid: false, error: 'Este ficheiro não foi exportado por esta aplicação.' };
  }
  if (typeof json.schema_version !== 'number') {
    return { valid: false, error: 'Falta a versão do esquema no ficheiro.' };
  }
  for (const name of EXPORTABLE_TABLES) {
    if (!Array.isArray(json[name])) {
      return { valid: false, error: `Secção em falta ou inválida: "${name}".` };
    }
  }
  const counts = Object.fromEntries(EXPORTABLE_TABLES.map((n) => [n, json[n].length]));
  return { valid: true, json, counts };
}

/**
 * Importa um payload já validado.
 * mode "replace": apaga tudo o que existe e substitui.
 * mode "merge": mantém o que já existe; ids repetidos são ignorados (RN-11).
 */
export async function importPayload(json, mode) {
  await db.transaction('rw', EXPORTABLE_TABLES.map((n) => db.table(n)), async () => {
    if (mode === 'replace') {
      for (const name of EXPORTABLE_TABLES) {
        await db.table(name).clear();
      }
      for (const name of EXPORTABLE_TABLES) {
        if (json[name].length) await db.table(name).bulkAdd(json[name]);
      }
    } else {
      for (const name of EXPORTABLE_TABLES) {
        const existingIds = new Set((await db.table(name).toArray()).map((r) => r.id ?? r.autoId));
        const toAdd = json[name].filter((r) => !existingIds.has(r.id));
        if (toAdd.length) await db.table(name).bulkAdd(toAdd.map((r) => {
          // taskTags usa autoId próprio; não reaproveitar o autoId importado.
          if (name === 'taskTags') { const { autoId, ...rest } = r; return rest; }
          return r;
        }));
      }
    }
  });
}

export async function exportToCsv() {
  const tasks = await db.tasks.toArray();
  const areas = await db.areas.toArray();
  const lists = await db.lists.toArray();
  const areaName = Object.fromEntries(areas.map((a) => [a.id, a.name]));
  const listName = Object.fromEntries(lists.map((l) => [l.id, l.name]));

  const header = ['título', 'área', 'lista', 'prioridade', 'data', 'concluída', 'descrição'];
  const rows = tasks.map((t) => [
    t.title, areaName[t.areaId] || '', listName[t.listId] || '', t.priority,
    t.dueAt ? new Date(t.dueAt).toISOString().slice(0, 10) : '',
    t.isCompleted ? 'sim' : 'não', t.description || '',
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map(csvEscape).join(','))
    .join('\n');

  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tarefas-${date}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  const s = String(value ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
