import { supabase } from '../db/supabase.js';
import { SCHEMA_VERSION } from '../db/schema.js';
import { rowToJs, jsToRow } from '../db/mapper.js';
import { updateSettings } from './settings.js';
import { invalidate } from '../db/invalidator.js';

const TABLES = ['areas', 'lists', 'tags', 'tasks', 'task_tags'];

export async function buildExportPayload() {
  const data = {};
  for (const name of TABLES) {
    const { data: rows } = await supabase.from(name).select('*');
    data[name] = (rows || []).map(rowToJs);
  }
  const { data: settings } = await supabase.from('settings').select('*').eq('id', 'app').maybeSingle();
  const s = settings ? rowToJs(settings) : {};
  return {
    app: 'todo-cenas',
    schema_version: SCHEMA_VERSION,
    exported_at: new Date().toISOString(),
    settings: {
      theme: s.theme, defaultView: s.defaultView,
      activeAreaFilter: s.activeAreaFilter,
      syncWindowPastDays: s.syncWindowPastDays,
      syncWindowFutureDays: s.syncWindowFutureDays,
    },
    ...data,
  };
}

export async function exportToFile() {
  const payload = await buildExportPayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url; a.download = `tarefas-${date}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  await updateSettings({ lastExportAt: Date.now() });
}

export function validateImportPayload(raw) {
  let json;
  try { json = JSON.parse(raw); } catch {
    return { valid: false, error: 'O ficheiro não é um JSON válido.' };
  }
  if (json.app !== 'todo-cenas' && json.app !== 'todo-app') {
    return { valid: false, error: 'Este ficheiro não foi exportado por esta aplicação.' };
  }
  if (typeof json.schema_version !== 'number') {
    return { valid: false, error: 'Falta a versão do esquema no ficheiro.' };
  }
  for (const name of ['areas', 'lists', 'tasks', 'tags', 'task_tags']) {
    if (!Array.isArray(json[name])) {
      return { valid: false, error: `Secção em falta ou inválida: "${name}".` };
    }
  }
  const counts = Object.fromEntries(TABLES.map(n => [n, json[n].length]));
  return { valid: true, json, counts };
}

export async function importPayload(json, mode) {
  if (mode === 'replace') {
    await supabase.from('tasks').delete().neq('id', '');
    await supabase.from('lists').delete().neq('id', '');
    await supabase.from('tags').delete().neq('id', '');
    await supabase.from('areas').delete().neq('id', '');
    await supabase.from('settings').delete().neq('id', '');
    for (const name of ['areas', 'lists', 'tags', 'tasks', 'task_tags']) {
      if (json[name].length) await supabase.from(name).insert(json[name].map(jsToRow));
    }
  } else {
    for (const name of ['areas', 'lists', 'tags', 'tasks']) {
      const { data: existing } = await supabase.from(name).select('id');
      const existingIds = new Set((existing || []).map(r => r.id));
      const toAdd = json[name].filter(r => !existingIds.has(r.id));
      if (toAdd.length) await supabase.from(name).insert(toAdd.map(jsToRow));
    }
    // task_tags: ignora duplicados via upsert
    if (json.task_tags?.length) {
      const { data: existing } = await supabase.from('task_tags').select('task_id, tag_id');
      const existingSet = new Set((existing || []).map(r => `${r.task_id}:${r.tag_id}`));
      const toAdd = json.task_tags.filter(r => {
        const key = `${r.taskId || r.task_id}:${r.tagId || r.tag_id}`;
        return !existingSet.has(key);
      });
      if (toAdd.length) await supabase.from('task_tags').insert(toAdd.map(jsToRow));
    }
  }
  invalidate();
}

export async function exportToCsv() {
  const { data: tasks } = await supabase.from('tasks').select('*');
  const { data: areas } = await supabase.from('areas').select('*');
  const { data: lists } = await supabase.from('lists').select('*');

  const areaName = Object.fromEntries((areas || []).map(a => [a.id, a.name]));
  const listName = Object.fromEntries((lists || []).map(l => [l.id, l.name]));

  const header = ['título', 'área', 'lista', 'prioridade', 'data', 'concluída', 'descrição'];
  const rows = (tasks || []).map(t => [
    t.title, areaName[t.area_id] || '', listName[t.list_id] || '', t.priority,
    t.due_at ? new Date(t.due_at).toISOString().slice(0, 10) : '',
    t.is_completed ? 'sim' : 'não', t.description || '',
  ]);
  const csv = [header, ...rows].map(row => row.map(csvEscape).join(',')).join('\n');

  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url; a.download = `tarefas-${date}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  const s = String(value ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
