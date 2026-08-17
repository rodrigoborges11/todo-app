import { db } from '../db/schema.js';
import { uid } from '../lib/id.js';

/** Etiquetas visíveis para uma área: as próprias da área + as globais (areaId null). */
export async function getTagsForArea(areaId) {
  const all = await db.tags.toArray();
  return all.filter((t) => t.areaId === areaId || t.areaId == null);
}

export async function getAllTags() {
  return db.tags.toArray();
}

export async function createTag(name, areaId = null) {
  const trimmed = name.trim();
  const existing = await db.tags.filter((t) => t.name.toLowerCase() === trimmed.toLowerCase() && (t.areaId === areaId || t.areaId == null)).first();
  if (existing) return existing;
  const tag = { id: uid(), areaId, name: trimmed, color: null };
  await db.tags.add(tag);
  return tag;
}

export async function renameTag(id, name) {
  await db.tags.update(id, { name: name.trim() });
}

export async function deleteTag(id) {
  await db.transaction('rw', db.tags, db.taskTags, async () => {
    await db.taskTags.where('tagId').equals(id).delete();
    await db.tags.delete(id);
  });
}

export async function tagUsageCount(id) {
  return db.taskTags.where('tagId').equals(id).count();
}
