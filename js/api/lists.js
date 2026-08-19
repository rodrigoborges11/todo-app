import { supabase } from '../db/supabase.js';
import { uid } from '../lib/id.js';
import { rowToJs, jsToRow, check } from '../db/mapper.js';
import { invalidate } from '../db/invalidator.js';

export async function getLists(areaId = null) {
  let q = supabase.from('lists').select('*').order('position');
  if (areaId) q = q.eq('area_id', areaId);
  return check(await q).map(rowToJs);
}

export async function getListById(id) {
  const data = check(await supabase.from('lists').select('*').eq('id', id).maybeSingle());
  return data ? rowToJs(data) : null;
}

export async function createList(areaId, name) {
  const { data: siblings } = await supabase.from('lists').select('id').eq('area_id', areaId);
  const list = {
    id: uid(), areaId, name: name.trim(), color: null,
    position: siblings?.length || 0, isDefault: false,
  };
  check(await supabase.from('lists').insert(jsToRow(list)));
  invalidate();
  return list;
}

export async function renameList(id, name) {
  check(await supabase.from('lists').update({ name: name.trim() }).eq('id', id));
  invalidate();
}

export async function reorderLists(areaId, orderedIds) {
  await Promise.all(orderedIds.map((id, index) =>
    supabase.from('lists').update({ position: index }).eq('id', id)
  ));
  invalidate();
}

export async function deleteList(id, strategy) {
  const list = rowToJs(check(await supabase.from('lists').select('*').eq('id', id).single()));
  if (list.isDefault) throw new Error('A Caixa de entrada não pode ser eliminada.');

  if (strategy === 'delete') {
    // ON DELETE CASCADE em task_tags trata das associações; basta apagar as tasks
    check(await supabase.from('tasks').delete().eq('list_id', id));
  } else {
    const { data: inbox } = await supabase.from('lists')
      .select('id').eq('area_id', list.areaId).eq('is_default', true).maybeSingle();
    if (inbox) {
      check(await supabase.from('tasks').update({ list_id: inbox.id }).eq('list_id', id));
    }
  }
  check(await supabase.from('lists').delete().eq('id', id));
  invalidate();
}

export async function countTasksInList(id) {
  const { count } = await supabase.from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('list_id', id).eq('is_completed', false);
  return count || 0;
}
