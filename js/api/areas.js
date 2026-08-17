import { db } from '../db/schema.js';
import { uid } from '../lib/id.js';

const PALETTE = ['#C9820F', '#8B5CF6', '#EA5FA0', '#4FAE4A', '#3AAEC9'];

export async function getAreas() {
  return db.areas.orderBy('position').toArray();
}

export function areaColorVar(area) {
  // As duas áreas por omissão usam variáveis CSS (adaptam-se a claro/escuro);
  // áreas extra criadas pelo utilizador usam uma cor fixa (RF-75).
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
  const count = await db.areas.count();
  const area = {
    id: uid(), name: name.trim(),
    colorToken: PALETTE[count % PALETTE.length],
    icon, position: count, isDefault: false,
  };
  const list = { id: uid(), areaId: area.id, name: 'Caixa de entrada', color: null, position: 0, isDefault: true };
  await db.transaction('rw', db.areas, db.lists, async () => {
    await db.areas.add(area);
    await db.lists.add(list);
  });
  return area;
}

export async function renameArea(id, name) {
  await db.areas.update(id, { name: name.trim() });
}

/** Elimina uma área. Só permitido depois de mover/apagar as suas tarefas e listas (RN-05). */
export async function deleteArea(id) {
  const area = await db.areas.get(id);
  if (area?.isDefault) throw new Error('As áreas Pessoal e BEST não podem ser eliminadas.');
  const remainingTasks = await db.tasks.where('areaId').equals(id).count();
  if (remainingTasks > 0) throw new Error('Move ou elimina primeiro as tarefas desta área.');
  await db.transaction('rw', db.areas, db.lists, db.tags, db.accounts, async () => {
    await db.lists.where('areaId').equals(id).delete();
    await db.tags.where('areaId').equals(id).delete();
    await db.accounts.where('areaId').equals(id).delete();
    await db.areas.delete(id);
  });
}
