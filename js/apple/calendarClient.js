import { supabase } from '../db/supabase.js';
import { uid } from '../lib/id.js';
import { rowToJs, jsToRow, check } from '../db/mapper.js';
import { invalidate } from '../db/invalidator.js';
import { parseIcs } from './icsParser.js';

export async function getAppleAccounts() {
  const data = check(await supabase.from('accounts').select('*').eq('type', 'apple'));
  return data.map(rowToJs);
}

export async function importIcsFile(file, { areaId = null } = {}) {
  const text = await file.text();
  const { calName, calColor, events } = parseIcs(text);
  const name = calName || file.name.replace(/\.ics$/i, '');
  const accountId  = uid();
  const calendarId = uid();

  const account = {
    id: accountId, type: 'apple', email: `apple:${accountId}`,
    displayName: name, areaId, status: 'connected',
    lastSyncAt: Date.now(), syncToken: null,
  };
  const calendar = { id: calendarId, accountId, name, color: calColor || null, isVisible: true };
  const dbEvents = buildDbEvents(events, calendarId, accountId);

  check(await supabase.from('accounts').upsert(jsToRow(account)));
  check(await supabase.from('calendars').upsert(jsToRow(calendar)));
  if (dbEvents.length) check(await supabase.from('events').upsert(dbEvents.map(jsToRow)));

  invalidate();
  return { account: rowToJs(jsToRow(account)), eventCount: dbEvents.length };
}

export async function reimportIcsFile(accountId, file) {
  const text = await file.text();
  const { calName, calColor, events } = parseIcs(text);
  const name = calName || file.name.replace(/\.ics$/i, '');

  const { data: calRow } = await supabase.from('calendars').select('*').eq('account_id', accountId).maybeSingle();
  if (!calRow) throw new Error('Calendário não encontrado.');
  const calendar = rowToJs(calRow);

  const dbEvents = buildDbEvents(events, calendar.id, accountId);

  check(await supabase.from('events').delete().eq('calendar_id', calendar.id));
  if (dbEvents.length) check(await supabase.from('events').insert(dbEvents.map(jsToRow)));
  check(await supabase.from('calendars').update({ name, color: calColor || calRow.color }).eq('id', calendar.id));
  check(await supabase.from('accounts').update({ display_name: name, last_sync_at: Date.now() }).eq('id', accountId));

  invalidate();
  return { eventCount: dbEvents.length };
}

export async function setAppleAccountArea(accountId, areaId) {
  check(await supabase.from('accounts').update({ area_id: areaId }).eq('id', accountId));
  invalidate();
}

export async function disconnectAppleAccount(accountId) {
  const { data: evRows } = await supabase.from('events').select('id').eq('account_id', accountId);
  const eventIds = (evRows || []).map(e => e.id);

  if (eventIds.length) {
    await supabase.from('tasks').update({ source_event_id: null }).in('source_event_id', eventIds);
  }
  // ON DELETE CASCADE apaga calendars e events ao apagar o account
  check(await supabase.from('accounts').delete().eq('id', accountId));
  invalidate();
}

function buildDbEvents(events, calendarId, accountId) {
  return events
    .filter(ev => ev.status !== 'CANCELLED' && ev.startsAt != null)
    .map(ev => ({
      id: ev.uid,
      calendarId,
      accountId,
      title: ev.summary || '(sem título)',
      startsAt: ev.startsAt,
      endsAt: ev.endsAt ?? ev.startsAt,
      isAllDay: ev.isAllDay ?? false,
      location: ev.location || null,
      updatedAt: Date.now(),
      isCancelled: false,
    }));
}
