import { db } from '../db/schema.js';

export async function getSettings() {
  return db.settings.get('app');
}

export async function updateSettings(patch) {
  const current = (await db.settings.get('app')) || { id: 'app' };
  const next = { ...current, ...patch };
  await db.settings.put(next);
  return next;
}

/** Pede armazenamento persistente ao browser, para reduzir o risco de limpeza automática (RF-08). */
export async function requestPersistentStorage() {
  if (navigator.storage?.persist) {
    try {
      return await navigator.storage.persist();
    } catch {
      return false;
    }
  }
  return false;
}

export async function isStoragePersisted() {
  if (navigator.storage?.persisted) {
    try {
      return await navigator.storage.persisted();
    } catch {
      return false;
    }
  }
  return false;
}

/** Estimativa de quota usada — usado para avisar perto do limite (RNF do risco de quota). */
export async function storageEstimate() {
  if (navigator.storage?.estimate) {
    try {
      const { usage, quota } = await navigator.storage.estimate();
      return { usage, quota, ratio: quota ? usage / quota : 0 };
    } catch {
      return null;
    }
  }
  return null;
}

/** Deteta se o IndexedDB está de facto disponível e utilizável (modo privado em alguns browsers bloqueia-o). */
export async function checkStorageAvailable() {
  try {
    const testDb = indexedDB.open('__storage_test__');
    return await new Promise((resolve) => {
      testDb.onsuccess = () => {
        testDb.result.close();
        indexedDB.deleteDatabase('__storage_test__');
        resolve(true);
      };
      testDb.onerror = () => resolve(false);
      setTimeout(() => resolve(false), 2000);
    });
  } catch {
    return false;
  }
}

/** Apaga TODOS os dados locais (RF-07). Irreversível — sem undo. */
export async function wipeAllData() {
  await db.delete();
  location.reload();
}
