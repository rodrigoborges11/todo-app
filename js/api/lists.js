import { db } from '../db/schema.js';
import { uid } from '../lib/id.js';

export async function getLists(areaId = null) {
  const all = await db.lists.orderBy('position').toArray();
  return areaId ? all.filter((l) => l.areaId === areaId) : all;
}

export async function getListById(id) {
  return db.lists.get(id);
}

export async function createList(areaId, name) {
  const siblings = await db.lists.where('areaId').equals(areaId).toArray();
  const list = {
    id: uid(), areaId, name: name.trim(), color: null,
    position: siblings.length, isDefault: false,
  };
  await db.lists.add(list);
  return list;
}

export async function renameList(id, name) {
  await db.lists.update(id, { name: name.trim() });
}

export async function reorderLists(areaId, orderedIds) {
  await db.transaction('rw', db.lists, async () => {
    await Promise.all(orderedIds.map((id, index) => db.lists.update(id, { position: index })));
  });
}

/**
 * Elimina uma lista. `strategy` é 'move' (move tarefas para a caixa de entrada
 * da área) ou 'delete' (apaga as tarefas também) — RF-34.
 */
export async function deleteList(id, strategy) {
  const list = await db.lists.get(id);
  if (list.isDefault) throw new Error('A Caixa de entrada não pode ser eliminada.');

  const tasks = await db.tasks.where('listId').equals(id).toArray();

  await db.transaction('rw', db.lists, db.tasks, db.taskTags, async () => {
    if (strategy === 'delete') {
      for (const t of tasks) {
        await db.taskTags.where('taskId').equals(t.id).delete();
      }
      await db.tasks.where('listId').equals(id).delete();
    } else {
      const inbox = await db.lists.where({ areaId: list.areaId, isDefault: true }).first();
      if (inbox) {
        await Promise.all(tasks.map((t) => db.tasks.update(t.id, { listId: inbox.id })));
      }
    }
    await db.lists.delete(id);
  });
}

export async function countTasksInList(id) {
  return db.tasks.where('listId').equals(id).and((t) => !t.isCompleted).count();
}
