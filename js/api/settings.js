import { supabase } from '../db/supabase.js';
import { rowToJs, jsToRow, check } from '../db/mapper.js';
import { invalidate } from '../db/invalidator.js';

export async function getSettings() {
  const data = check(await supabase.from('settings').select('*').eq('id', 'app').maybeSingle());
  return data ? rowToJs(data) : null;
}

export async function updateSettings(patch) {
  const current = await getSettings() || { id: 'app' };
  const next = { ...current, ...patch };
  check(await supabase.from('settings').upsert(jsToRow(next)));
  invalidate();
  return next;
}

export async function requestPersistentStorage() {
  if (navigator.storage?.persist) {
    try { return await navigator.storage.persist(); } catch { return false; }
  }
  return false;
}

export async function isStoragePersisted() {
  if (navigator.storage?.persisted) {
    try { return await navigator.storage.persisted(); } catch { return false; }
  }
  return false;
}

export async function storageEstimate() {
  if (navigator.storage?.estimate) {
    try {
      const { usage, quota } = await navigator.storage.estimate();
      return { usage, quota, ratio: quota ? usage / quota : 0 };
    } catch { return null; }
  }
  return null;
}

export async function checkStorageAvailable() {
  try {
    const { error } = await supabase.from('settings').select('id').eq('id', 'app').limit(1);
    return !error;
  } catch { return false; }
}

export async function wipeAllData() {
  await supabase.from('tasks').delete().neq('id', '');
  await supabase.from('lists').delete().neq('id', '');
  await supabase.from('tags').delete().neq('id', '');
  await supabase.from('areas').delete().neq('id', '');
  await supabase.from('settings').delete().neq('id', '');
  location.reload();
}
