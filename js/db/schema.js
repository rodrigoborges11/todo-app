import { Dexie } from '../lib/dexie.js';
import { uid } from '../lib/id.js';
import { supabase } from './supabase.js';
import { jsToRow } from './mapper.js';

export const SCHEMA_VERSION = 1;
export const AREA_SLUG = { PESSOAL: 'pessoal', BEST: 'best' };
export const NON_EXPORTABLE_TABLES = new Set(['tokens', 'calendars', 'events']);

// Dexie permanece apenas para cache de calendário (dados locais/sensíveis)
export const db = new Dexie('todo-cenas-cal');
db.version(1).stores({
  accounts: 'id, areaId, email, status',
  tokens: 'accountId',
  calendars: 'id, accountId, isVisible',
  events: 'id, calendarId, accountId, startsAt, [accountId+startsAt]',
});

async function seedIfEmpty() {
  const { data } = await supabase.from('settings').select('id').eq('id', 'app').maybeSingle();
  if (data) return;

  const now = Date.now();

  const pessoalArea = { id: uid(), name: 'Pessoal', colorToken: AREA_SLUG.PESSOAL, icon: 'user', position: 0, isDefault: true };
  const bestArea    = { id: uid(), name: 'BEST',    colorToken: AREA_SLUG.BEST,    icon: 'building', position: 1, isDefault: true };
  const pessoalList = { id: uid(), areaId: pessoalArea.id, name: 'Caixa de entrada', color: null, position: 0, isDefault: true };
  const bestList    = { id: uid(), areaId: bestArea.id,    name: 'Caixa de entrada', color: null, position: 0, isDefault: true };

  const bestTagNames = ['reunião', 'evento', 'departamento', 'candidatura', 'relatório', 'formação'];
  const bestTags = bestTagNames.map(name => ({ id: uid(), areaId: bestArea.id, name, color: null }));

  const exampleTasks = [
    {
      id: uid(), areaId: pessoalArea.id, listId: pessoalList.id, parentId: null, sourceEventId: null,
      title: 'Experimenta arrastar esta tarefa para reordenar',
      description: 'Podes editar, mover de lista ou apagar — isto é só um exemplo.',
      dueAt: null, priority: 'none', isCompleted: false, completedAt: null,
      position: 0, createdAt: now, updatedAt: now, isExample: true,
    },
    {
      id: uid(), areaId: bestArea.id, listId: bestList.id, parentId: null, sourceEventId: null,
      title: 'Importa o calendário do BEST nas Definições',
      description: 'Exporta um .ics do Apple Calendar e importa nas Definições para ver as reuniões ao lado das tarefas.',
      dueAt: null, priority: 'medium', isCompleted: false, completedAt: null,
      position: 0, createdAt: now, updatedAt: now, isExample: true,
    },
  ];

  await supabase.from('areas').insert([pessoalArea, bestArea].map(jsToRow));
  await supabase.from('lists').insert([pessoalList, bestList].map(jsToRow));
  if (bestTags.length) await supabase.from('tags').insert(bestTags.map(jsToRow));
  await supabase.from('tasks').insert(exampleTasks.map(jsToRow));
  await supabase.from('settings').insert({
    id: 'app', schema_version: SCHEMA_VERSION, theme: 'system',
    default_view: 'today', active_area_filter: 'all',
    sync_window_past_days: 30, sync_window_future_days: 90,
    last_export_at: null, created_at: now,
  });
}

let readyPromise = null;
export function dbReady() {
  if (!readyPromise) readyPromise = db.open().then(seedIfEmpty);
  return readyPromise;
}
