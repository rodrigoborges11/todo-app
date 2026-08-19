import { supabase } from '../db/supabase.js';
import { db } from '../db/schema.js';
import { uid } from '../lib/id.js';
import { rowToJs, jsToRow, check } from '../db/mapper.js';
import { invalidate } from '../db/invalidator.js';

const PALETTE = ['#C9820F', '#8B5CF6', '#EA5FA0', '#4FAE4A', '#3AAEC9'];

export async function getAreas() {
  const data = check(await supabase.from('areas').select('*').order('position'));
  return data.map(rowToJs);
}

export function areaColorVar(area) {
  if (area.colorToken === 'pessoal') return 'var(--area-pessoal)';
  if (area.colorToken === 'best') return 'var(--area-best)';
  return area.colorToken || '#8B92A6';
}

export function areaSoftVar(area) {
  if (area.colorToken === 'pessoal') return 'var(--area-pessoal-soft)';
  if (area.colorToken === 'best') return 'var(--area-best-soft)';
  return `${area.colorToken}22`;
}

export async function createArea({ name, icon = 'tag' }) {
  const { data: all } = await supabase.from('areas').select('id');
  const count = all?.length || 0;
  const area = {
    id: uid(), name: name.trim(),
    colorToken: PALETTE[count % PALETTE.length],
    icon, position: count, isDefault: false,
  };
  const list = { id: uid(), areaId: area.id, name: 'Caixa de entrada', color: null, position: 0, isDefault: true };
  check(await supabase.from('areas').insert(jsToRow(area)));
  check(await supabase.from('lists').insert(jsToRow(list)));
  invalidate();
  return area;
}

export async function renameArea(id, name) {
  check(await supabase.from('areas').update({ name: name.trim() }).eq('id', id));
  invalidate();
}

export async function deleteArea(id) {
  const { data: area } = await supabase.from('areas').select('is_default').eq('id', id).single();
  if (area?.is_default) throw new Error('As áreas Pessoal e BEST não podem ser eliminadas.');
  const { count } = await supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('area_id', id);
  if (count > 0) throw new Error('Move ou elimina primeiro as tarefas desta área.');
  // ON DELETE CASCADE apaga listas e tags; eliminamos accounts locais manualmente
  await db.accounts.where('areaId').equals(id).delete();
  check(await supabase.from('areas').delete().eq('id', id));
  invalidate();
}
