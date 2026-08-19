import { supabase } from '../db/supabase.js';
import { uid } from '../lib/id.js';
import { rowToJs, jsToRow, check } from '../db/mapper.js';
import { invalidate } from '../db/invalidator.js';

export async function getTagsForArea(areaId) {
  const data = check(await supabase.from('tags').select('*'));
  return data.map(rowToJs).filter(t => t.areaId === areaId || t.areaId == null);
}

export async function getAllTags() {
  return check(await supabase.from('tags').select('*')).map(rowToJs);
}

export async function createTag(name, areaId = null) {
  const trimmed = name.trim();
  const data = check(await supabase.from('tags').select('*'));
  const existing = data.map(rowToJs).find(t =>
    t.name.toLowerCase() === trimmed.toLowerCase() && (t.areaId === areaId || t.areaId == null)
  );
  if (existing) return existing;
  const tag = { id: uid(), areaId, name: trimmed, color: null };
  check(await supabase.from('tags').insert(jsToRow(tag)));
  invalidate();
  return tag;
}

export async function renameTag(id, name) {
  check(await supabase.from('tags').update({ name: name.trim() }).eq('id', id));
  invalidate();
}

export async function deleteTag(id) {
  // ON DELETE CASCADE em task_tags apaga as associações
  check(await supabase.from('tags').delete().eq('id', id));
  invalidate();
}

export async function tagUsageCount(id) {
  const { count } = await supabase.from('task_tags')
    .select('id', { count: 'exact', head: true }).eq('tag_id', id);
  return count || 0;
}
