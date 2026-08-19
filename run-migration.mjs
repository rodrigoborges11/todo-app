import { readFileSync } from 'fs';

const URL = 'https://athqrfmmkapvomozlylr.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0aHFyZm1ta2Fwdm9tb3pseWxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxNTE3NDgsImV4cCI6MjEwMjcyNzc0OH0.pgCcYZaNGIqQ-S8r3QIlmG7v1yxoWvseitfoRQOH-Kk';

const HEADERS = {
  'Content-Type': 'application/json',
  'apikey': KEY,
  'Authorization': `Bearer ${KEY}`,
  'Prefer': 'resolution=merge-duplicates,return=minimal',
};

const toSnake = k => k.replace(/[A-Z]/g, l => '_' + l.toLowerCase());
const convertRow = row => Object.fromEntries(Object.entries(row).map(([k, v]) => [toSnake(k), v]));

async function upsert(table, rows, batchSize = 200) {
  if (!rows.length) { console.log(`⏭  ${table}: vazio`); return; }
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const res = await fetch(`${URL}/rest/v1/${table}`, {
      method: 'POST', headers: HEADERS, body: JSON.stringify(batch),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`❌ ${table} (batch ${i}–${i + batch.length}): ${err}`);
    }
  }
  console.log(`✅ ${table}: ${rows.length} registos`);
}

const data = JSON.parse(readFileSync('/Users/rodrigo/Downloads/todo-app/idb-export.json', 'utf8'));

console.log(`\n📊 A importar:
  areas: ${data.areas?.length}  lists: ${data.lists?.length}  tags: ${data.tags?.length}
  tasks: ${data.tasks?.length}  taskTags: ${data.taskTags?.length}  settings: ${data.settings?.length}
  accounts: ${data.accounts?.length}  calendars: ${data.calendars?.length}  events: ${data.events?.length}\n`);

// Ordem respeita FK: areas primeiro, depois dependentes
await upsert('areas',     (data.areas     || []).map(convertRow));
await upsert('lists',     (data.lists     || []).map(convertRow));
await upsert('tags',      (data.tags      || []).map(convertRow));
await upsert('tasks',     (data.tasks     || []).map(convertRow));
await upsert('task_tags', (data.taskTags  || []).map(r => ({ task_id: r.taskId, tag_id: r.tagId })));
await upsert('settings',  (data.settings  || []).map(convertRow));
await upsert('accounts',  (data.accounts  || []).map(convertRow));
await upsert('calendars', (data.calendars || []).map(convertRow));
await upsert('events',    (data.events    || []).map(convertRow));

console.log('\n🎉 Migração concluída!');
