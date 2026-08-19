(async () => {
  function readStore(db, store) {
    if (!db.objectStoreNames.contains(store)) return Promise.resolve([]);
    return new Promise((res, rej) => {
      const req = db.transaction(store).objectStore(store).getAll();
      req.onsuccess = e => res(e.target.result);
      req.onerror = e => rej(e.target.error);
    });
  }

  const db = await new Promise((res, rej) => {
    const r = indexedDB.open('todo-app');
    r.onsuccess = e => res(e.target.result);
    r.onerror = e => rej(e.target.error);
    r.onupgradeneeded = () => { r.result.close(); rej(new Error('IndexedDB "todo-app" não existe.')); };
  });

  const stores = Array.from(db.objectStoreNames);
  const data = {};
  for (const s of stores) data[s] = await readStore(db, s);
  db.close();

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'idb-export.json';
  a.click();

  console.log('✅ Exportado! Stores:', stores.join(', '));
  console.table(Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v.length])));
})();
