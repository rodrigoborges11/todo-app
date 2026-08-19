(async () => {
  const { url, key } = window.SUPABASE_CONFIG || {};
  if (!url || !key) return console.error('❌ SUPABASE_CONFIG não encontrado. Abre o app primeiro.');

  const headers = {
    'Content-Type': 'application/json',
    'apikey': key,
    'Authorization': `Bearer ${key}`,
  };

  const toSnake = k => k.replace(/[A-Z]/g, l => '_' + l.toLowerCase());
  const convertRow = row => Object.fromEntries(Object.entries(row).map(([k, v]) => [toSnake(k), v]));

  // Lê um object store da IndexedDB; devolve [] se não existir
  function readStore(db, store) {
    if (!db.objectStoreNames.contains(store)) return Promise.resolve([]);
    return new Promise((res, rej) => {
      const req = db.transaction(store).objectStore(store).getAll();
      req.onsuccess = e => res(e.target.result);
      req.onerror = e => rej(e.target.error);
    });
  }

  // Upsert em lote para o Supabase (ignora duplicados via merge)
  async function upsert(table, rows) {
    if (!rows.length) { console.log(`⏭  ${table}: vazio`); return; }
    const res = await fetch(`${url}/rest/v1/${table}`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(rows),
    });
    if (!res.ok) {
      console.error(`❌ ${table}:`, await res.text());
    } else {
      console.log(`✅ ${table}: ${rows.length} registo(s)`);
    }
  }

  // Abre a IndexedDB antiga
  const db = await new Promise((res, rej) => {
    const r = indexedDB.open('todo-app');
    r.onsuccess = e => res(e.target.result);
    r.onerror = e => rej(e.target.error);
    r.onupgradeneeded = () => { r.result.close(); rej(new Error('Base de dados "todo-app" não existe neste browser.')); };
  });

  console.log('📦 Stores encontradas:', Array.from(db.objectStoreNames).join(', '));

  // Lê todos os stores
  const [areas, lists, tags, tasks, taskTags, settings, accounts, tokens, calendars, events] = await Promise.all([
    readStore(db, 'areas'),
    readStore(db, 'lists'),
    readStore(db, 'tags'),
    readStore(db, 'tasks'),
    readStore(db, 'taskTags'),
    readStore(db, 'settings'),
    readStore(db, 'accounts'),
    readStore(db, 'tokens'),
    readStore(db, 'calendars'),
    readStore(db, 'events'),
  ]);
  db.close();

  console.log(`\n📊 Dados encontrados:
  areas: ${areas.length}  lists: ${lists.length}  tags: ${tags.length}
  tasks: ${tasks.length}  taskTags: ${taskTags.length}  settings: ${settings.length}
  accounts: ${accounts.length}  calendars: ${calendars.length}  events: ${events.length}\n`);

  // Envia para o Supabase respeitando a ordem das FK
  await upsert('areas',     areas.map(convertRow));
  await upsert('lists',     lists.map(convertRow));
  await upsert('tags',      tags.map(convertRow));
  await upsert('tasks',     tasks.map(convertRow));
  // task_tags: autoId é gerado pelo Supabase (serial), não enviamos
  await upsert('task_tags', taskTags.map(r => ({ task_id: r.taskId, tag_id: r.tagId })));
  await upsert('settings',  settings.map(convertRow));
  await upsert('accounts',  accounts.map(convertRow));
  await upsert('tokens',    tokens.map(convertRow));
  await upsert('calendars', calendars.map(convertRow));
  await upsert('events',    events.map(convertRow));

  console.log('\n🎉 Migração concluída! Recarrega a página para veres os dados.');
})();
