import { supabase } from '../db/supabase.js';
import { uid } from '../lib/id.js';
import { jsToRow, mapTask, check } from '../db/mapper.js';
import { invalidate } from '../db/invalidator.js';
import { startOfDay, addDays, isOverdue } from '../lib/date.js';

const SEL = '*, task_tags(tag_id)';

function areaEq(q, areaFilter) {
  return areaFilter && areaFilter !== 'all' ? q.eq('area_id', areaFilter) : q;
}

export async function getTodayTasks(areaFilter = 'all') {
  const todayStart = startOfDay(Date.now());
  const todayEnd = addDays(todayStart, 1) - 1;
  let q = supabase.from('tasks').select(SEL)
    .lte('due_at', todayEnd).eq('is_completed', false).not('due_at', 'is', null);
  q = areaEq(q, areaFilter);
  const rows = check(await q).map(mapTask);
  const overdue = rows.filter(t => t.dueAt < todayStart).sort((a, b) => a.dueAt - b.dueAt);
  const today   = rows.filter(t => t.dueAt >= todayStart).sort((a, b) => (a.dueAt - b.dueAt) || a.position - b.position);
  return [...overdue, ...today];
}

export async function getUpcomingTasks(areaFilter = 'all', days = 7) {
  const from = addDays(startOfDay(Date.now()), 1);
  const to   = addDays(from, days) - 1;
  let q = supabase.from('tasks').select(SEL)
    .gte('due_at', from).lte('due_at', to).eq('is_completed', false).order('due_at');
  q = areaEq(q, areaFilter);
  return check(await q).map(mapTask);
}

export async function getListTasks(listId, { includeCompleted = false } = {}) {
  let q = supabase.from('tasks').select(SEL).eq('list_id', listId).order('position');
  if (!includeCompleted) q = q.eq('is_completed', false);
  return check(await q).map(mapTask);
}

export async function getAllTasks(areaFilter = 'all', filters = {}) {
  let q = supabase.from('tasks').select(SEL).eq('is_completed', false);
  q = areaEq(q, areaFilter);
  if (filters.listId)   q = q.eq('list_id', filters.listId);
  if (filters.priority) q = q.eq('priority', filters.priority);
  if (filters.fromDate != null) q = q.gte('due_at', filters.fromDate);
  if (filters.toDate   != null) q = q.lte('due_at', filters.toDate);
  let tasks = check(await q).map(mapTask);
  tasks = applySort(tasks, filters.sort || 'due');
  return filters.tagId ? tasks.filter(t => t.tagIds.includes(filters.tagId)) : tasks;
}

export async function getCompletedTasks(areaFilter = 'all', limit = 200) {
  let q = supabase.from('tasks').select(SEL).eq('is_completed', true).order('completed_at', { ascending: false }).limit(limit);
  q = areaEq(q, areaFilter);
  return check(await q).map(mapTask);
}

export async function searchTasks(query, areaFilter = 'all', filters = {}) {
  const q2 = query.trim();
  if (!q2) return [];
  let q = supabase.from('tasks').select(SEL)
    .or(`title.ilike.%${q2}%,description.ilike.%${q2}%`);
  q = areaEq(q, areaFilter);
  if (filters.listId)   q = q.eq('list_id', filters.listId);
  if (filters.priority) q = q.eq('priority', filters.priority);
  let tasks = check(await q).map(mapTask);
  tasks.sort((a, b) => (a.isCompleted === b.isCompleted ? 0 : a.isCompleted ? 1 : -1) || a.position - b.position);
  return filters.tagId ? tasks.filter(t => t.tagIds.includes(filters.tagId)) : tasks;
}

export async function getTaskById(id) {
  const row = check(await supabase.from('tasks').select(SEL).eq('id', id).maybeSingle());
  return row ? mapTask(row) : null;
}

export function taskIsOverdue(task) {
  return isOverdue(task.dueAt, task.isCompleted);
}

export async function createTask({ title, listId, areaId, description = null, dueAt = null, priority = 'none', tagIds = [] }) {
  const now = Date.now();
  const { count } = await supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('list_id', listId);
  const task = {
    id: uid(), areaId, listId, parentId: null, sourceEventId: null,
    title: title.trim(), description, dueAt, priority,
    isCompleted: false, completedAt: null,
    position: count || 0, createdAt: now, updatedAt: now, isExample: false,
  };
  check(await supabase.from('tasks').insert(jsToRow(task)));
  if (tagIds.length) {
    await supabase.from('task_tags').insert(tagIds.map(tagId => ({ task_id: task.id, tag_id: tagId })));
  }
  invalidate();
  return task;
}

export async function updateTask(id, patch) {
  const { tagIds, ...rest } = patch;
  const rowPatch = jsToRow({ ...rest, updatedAt: Date.now() });
  check(await supabase.from('tasks').update(rowPatch).eq('id', id));
  if (tagIds !== undefined) {
    await supabase.from('task_tags').delete().eq('task_id', id);
    if (tagIds.length) {
      await supabase.from('task_tags').insert(tagIds.map(tagId => ({ task_id: id, tag_id: tagId })));
    }
  }
  invalidate();
  return getTaskById(id);
}

export async function setCompleted(id, isCompleted) {
  check(await supabase.from('tasks').update({
    is_completed: isCompleted,
    completed_at: isCompleted ? Date.now() : null,
    updated_at: Date.now(),
  }).eq('id', id));
  invalidate();
}

export async function deleteTask(id) {
  const task = await getTaskById(id);
  const { data: tagLinks } = await supabase.from('task_tags').select('*').eq('task_id', id);
  // ON DELETE CASCADE apaga task_tags automaticamente
  check(await supabase.from('tasks').delete().eq('id', id));
  invalidate();
  return { task, tagLinks: tagLinks || [] };
}

export async function restoreTask({ task, tagLinks }) {
  check(await supabase.from('tasks').insert(jsToRow(task)));
  if (tagLinks?.length) {
    await supabase.from('task_tags').insert(tagLinks.map(({ id, ...l }) => ({ task_id: l.task_id || l.taskId, tag_id: l.tag_id || l.tagId })));
  }
  invalidate();
}

export async function moveTask(id, { listId, areaId }) {
  const { count } = await supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('list_id', listId);
  check(await supabase.from('tasks').update({ list_id: listId, area_id: areaId, position: count || 0, updated_at: Date.now() }).eq('id', id));
  invalidate();
}

export async function reorderTasks(listId, orderedIds) {
  await Promise.all(orderedIds.map((id, index) =>
    supabase.from('tasks').update({ position: index }).eq('id', id)
  ));
  invalidate();
}

export async function removeExampleTasks() {
  check(await supabase.from('tasks').delete().eq('is_example', true));
  invalidate();
}

export async function countOpenByArea(areaId) {
  const { count } = await supabase.from('tasks')
    .select('id', { count: 'exact', head: true }).eq('area_id', areaId).eq('is_completed', false);
  return count || 0;
}

export async function countOverdueByArea(areaId) {
  const todayStart = startOfDay(Date.now());
  const { count } = await supabase.from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('area_id', areaId).eq('is_completed', false)
    .not('due_at', 'is', null).lt('due_at', todayStart);
  return count || 0;
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
