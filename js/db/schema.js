import { Dexie } from '../lib/dexie.js';
import { uid } from '../lib/id.js';

export const SCHEMA_VERSION = 1;

export const db = new Dexie('todo-app');

// Nota sobre migrações: cada nova versão do esquema deve adicionar um novo
// db.version(N).stores({...}).upgrade(tx => {...}) SEM alterar os anteriores,
// para que utilizadores em versões antigas migrem passo a passo (RNF-11).
db.version(1).stores({
  settings: 'id',
  areas: 'id, position',
  lists: 'id, areaId, position',
  tasks: 'id, areaId, listId, parentId, dueAt, isCompleted, position, createdAt',
  tags: 'id, areaId, name',
  taskTags: '++autoId, taskId, tagId, &[taskId+tagId]',

  accounts: 'id, areaId, email, status',
  tokens: 'accountId',
  calendars: 'id, accountId, isVisible',
  events: 'id, calendarId, accountId, startsAt, [accountId+startsAt]',
});

// Tabelas nunca incluídas na exportação (dados sensíveis ou meramente cache,
// reconstruíveis a qualquer momento — ver RF-64 e secção 2.2 do documento de requisitos).
export const NON_EXPORTABLE_TABLES = new Set(['tokens', 'calendars', 'events']);

export const AREA_SLUG = { PESSOAL: 'pessoal', BEST: 'best' };

async function seedIfEmpty() {
  const alreadySeeded = await db.settings.get('app');
  if (alreadySeeded) return;

  const now = Date.now();

  const pessoalArea = {
    id: uid(), name: 'Pessoal', colorToken: AREA_SLUG.PESSOAL, icon: 'user',
    position: 0, isDefault: true,
  };
  const bestArea = {
    id: uid(), name: 'BEST', colorToken: AREA_SLUG.BEST, icon: 'building',
    position: 1, isDefault: true,
  };

  const pessoalList = {
    id: uid(), areaId: pessoalArea.id, name: 'Caixa de entrada',
    color: null, position: 0, isDefault: true,
  };
  const bestList = {
    id: uid(), areaId: bestArea.id, name: 'Caixa de entrada',
    color: null, position: 0, isDefault: true,
  };

  const bestTagNames = ['reunião', 'evento', 'departamento', 'candidatura', 'relatório', 'formação'];
  const bestTags = bestTagNames.map((name) => ({ id: uid(), areaId: bestArea.id, name, color: null }));

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

  await db.transaction('rw', db.settings, db.areas, db.lists, db.tags, db.tasks, async () => {
    await db.settings.put({
      id: 'app',
      schemaVersion: SCHEMA_VERSION,
      theme: 'system',
      defaultView: 'today',
      activeAreaFilter: 'all',
      syncWindowPastDays: 30,
      syncWindowFutureDays: 90,
      lastExportAt: null,
      createdAt: now,
    });
    await db.areas.bulkAdd([pessoalArea, bestArea]);
    await db.lists.bulkAdd([pessoalList, bestList]);
    await db.tags.bulkAdd(bestTags);
    await db.tasks.bulkAdd(exampleTasks);
  });
}

let readyPromise = null;
export function dbReady() {
  if (!readyPromise) {
    readyPromise = db.open().then(seedIfEmpty);
  }
  return readyPromise;
}
