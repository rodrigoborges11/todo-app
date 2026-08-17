import { db } from '../db/schema.js';
import { uid } from '../lib/id.js';
import { startOfDay, addDays, isOverdue } from '../lib/date.js';

// ---------- Leitura ----------

async function withTagIds(tasks) {
  if (tasks.length === 0) return tasks;
  const ids = tasks.map((t) => t.id);
  const links = await db.taskTags.where('taskId').anyOf(ids).toArray();
  const byTask = new Map();
  for (const l of links) {
    if (!byTask.has(l.taskId)) byTask.set(l.taskId, []);
    byTask.get(l.taskId).push(l.tagId);
  }
  return tasks.map((t) => ({ ...t, tagIds: byTask.get(t.id) || [] }));
}

function matchesArea(task, areaFilter) {
  return areaFilter === 'all' || task.areaId === areaFilter;
}

/** Vista "Hoje": em atraso (não concluídas) + tarefas de hoje. */
export async function getTodayTasks(areaFilter = 'all') {
  const todayStart = startOfDay(Date.now());
  const todayEnd = addDays(todayStart, 1) - 1;
  const all = await db.tasks
    .where('dueAt')
    .belowOrEqual(todayEnd)
    .filter((t) => !t.isCompleted && t.dueAt != null && matchesArea(t, areaFilter))
    .toArray();

  const overdue = all.filter((t) => t.dueAt < todayStart).sort((a, b) => a.dueAt - b.dueAt);
  const today = all.filter((t) => t.dueAt >= todayStart).sort((a, b) => (a.dueAt - b.dueAt) || a.position - b.position);
  return withTagIds([...overdue, ...today]);
}

/** Vista "Próximas": N dias a partir de amanhã, agrupados por dia. */
export async function getUpcomingTasks(areaFilter = 'all', days = 7) {
  const from = addDays(startOfDay(Date.now()), 1);
  const to = addDays(from, days) - 1;
  const tasks = await db.tasks
    .where('dueAt')
    .between(from, to, true, true)
    .filter((t) => !t.isCompleted && matchesArea(t, areaFilter))
    .sortBy('dueAt');
  return withTagIds(tasks);
}

/** Todas as tarefas de uma lista, por ordem manual. */
export async function getListTasks(listId, { includeCompleted = false } = {}) {
  let tasks = await db.tasks.where('listId').equals(listId).toArray();
  if (!includeCompleted) tasks = tasks.filter((t) => !t.isCompleted);
  tasks.sort((a, b) => a.position - b.position);
  return withTagIds(tasks);
}

/** Todas as tarefas em aberto (vista "Todas"), com filtros combináveis. */
export async function getAllTasks(areaFilter = 'all', filters = {}) {
  let tasks = await db.tasks.filter((t) => !t.isCompleted && matchesArea(t, areaFilter)).toArray();
  tasks = applyFilters(tasks, filters);
  tasks = applySort(tasks, filters.sort || 'due');
  const withTags = await withTagIds(tasks);
  return filters.tagId ? withTags.filter((t) => t.tagIds.includes(filters.tagId)) : withTags;
}

/** Tarefas concluídas, mais recentes primeiro. */
export async function getCompletedTasks(areaFilter = 'all', limit = 200) {
  const tasks = await db.tasks
    .filter((t) => t.isCompleted && matchesArea(t, areaFilter))
    .toArray();
  tasks.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
  return withTagIds(tasks.slice(0, limit));
}

/** Pesquisa por texto no título/descrição. */
export async function searchTasks(query, areaFilter = 'all', filters = {}) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  let tasks = await db.tasks
    .filter((t) => matchesArea(t, areaFilter) && (
      t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q)
    ))
    .toArray();
  tasks = applyFilters(tasks, filters);
  tasks.sort((a, b) => (a.isCompleted === b.isCompleted ? 0 : a.isCompleted ? 1 : -1) || a.position - b.position);
  const withTags = await withTagIds(tasks);
  return filters.tagId ? withTags.filter((t) => t.tagIds.includes(filters.tagId)) : withTags;
}

function applyFilters(tasks, filters) {
  let out = tasks;
  if (filters.listId) out = out.filter((t) => t.listId === filters.listId);
  if (filters.priority) out = out.filter((t) => t.priority === filters.priority);
  if (filters.fromDate != null) out = out.filter((t) => t.dueAt != null && t.dueAt >= filters.fromDate);
  if (filters.toDate != null) out = out.filter((t) => t.dueAt != null && t.dueAt <= filters.toDate);
  return out;
}

function applySort(tasks, sort) {
  const arr = [...tasks];
  const prioRank = { high: 0, medium: 1, low: 2, none: 3 };
  switch (sort) {
    case 'priority':
      arr.sort((a, b) => prioRank[a.priority] - prioRank[b.priority] || (a.dueAt || Infinity) - (b.dueAt || Infinity));
      break;
    case 'created':
      arr.sort((a, b) => b.createdAt - a.createdAt);
      break;
    case 'manual':
      arr.sort((a, b) => a.position - b.position);
      break;
    case 'due':
    default:
      arr.sort((a, b) => (a.dueAt || Infinity) - (b.dueAt || Infinity) || a.position - b.position);
  }
  return arr;
}

export async function getTaskById(id) {
  const task = await db.tasks.get(id);
  if (!task) return null;
  const [withTags] = await withTagIds([task]);
  return withTags;
}

export function taskIsOverdue(task) {
  return isOverdue(task.dueAt, task.isCompleted);
}

// ---------- Escrita ----------

async function nextPosition(listId) {
  const siblings = await db.tasks.where('listId').equals(listId).toArray();
  if (siblings.length === 0) return 0;
  return Math.max(...siblings.map((t) => t.position)) + 1;
}

export async function createTask({ title, listId, areaId, description = null, dueAt = null, priority = 'none', tagIds = [] }) {
  const now = Date.now();
  const position = await nextPosition(listId);
  const task = {
    id: uid(), areaId, listId, parentId: null, sourceEventId: null,
    title: title.trim(), description, dueAt, priority,
    isCompleted: false, completedAt: null,
    position, createdAt: now, updatedAt: now, isExample: false,
  };
  await db.transaction('rw', db.tasks, db.taskTags, async () => {
    await db.tasks.add(task);
    if (tagIds.length) {
      await db.taskTags.bulkAdd(tagIds.map((tagId) => ({ taskId: task.id, tagId })));
    }
  });
  return task;
}

export async function updateTask(id, patch) {
  const clean = { ...patch, updatedAt: Date.now() };
  delete clean.tagIds;
  await db.tasks.update(id, clean);
  if (patch.tagIds) {
    await db.transaction('rw', db.taskTags, async () => {
      await db.taskTags.where('taskId').equals(id).delete();
      if (patch.tagIds.length) {
        await db.taskTags.bulkAdd(patch.tagIds.map((tagId) => ({ taskId: id, tagId })));
      }
    });
  }
  return getTaskById(id);
}

export async function setCompleted(id, isCompleted) {
  await db.tasks.update(id, { isCompleted, completedAt: isCompleted ? Date.now() : null, updatedAt: Date.now() });
}

/** Elimina e devolve os dados apagados (tarefa + associações de etiquetas), para permitir "Anular". */
export async function deleteTask(id) {
  const task = await db.tasks.get(id);
  const tagLinks = await db.taskTags.where('taskId').equals(id).toArray();
  await db.transaction('rw', db.tasks, db.taskTags, async () => {
    await db.taskTags.where('taskId').equals(id).delete();
    await db.tasks.delete(id);
  });
  return { task, tagLinks };
}

/** Restaura uma tarefa eliminada (usado pelo "Anular"). */
export async function restoreTask({ task, tagLinks }) {
  await db.transaction('rw', db.tasks, db.taskTags, async () => {
    await db.tasks.put(task);
    if (tagLinks?.length) await db.taskTags.bulkAdd(tagLinks.map(({ autoId, ...l }) => l));
  });
}

export async function moveTask(id, { listId, areaId }) {
  const position = await nextPosition(listId);
  await db.tasks.update(id, { listId, areaId, position, updatedAt: Date.now() });
}

/** Reordenação manual dentro de uma lista (arrastar-e-largar). */
export async function reorderTasks(listId, orderedIds) {
  await db.transaction('rw', db.tasks, async () => {
    await Promise.all(orderedIds.map((id, index) => db.tasks.update(id, { position: index })));
  });
}

export async function removeExampleTasks() {
  const examples = await db.tasks.filter((t) => t.isExample).toArray();
  await db.transaction('rw', db.tasks, db.taskTags, async () => {
    for (const t of examples) {
      await db.taskTags.where('taskId').equals(t.id).delete();
      await db.tasks.delete(t.id);
    }
  });
}

export async function countOpenByArea(areaId) {
  return db.tasks.filter((t) => t.areaId === areaId && !t.isCompleted).count();
}

export async function countOverdueByArea(areaId) {
  const todayStart = startOfDay(Date.now());
  return db.tasks.filter((t) => t.areaId === areaId && !t.isCompleted && t.dueAt != null && t.dueAt < todayStart).count();
}
