import { db } from '../db/schema.js';
import { uid } from '../lib/id.js';
import { parseIcs } from './icsParser.js';

export async function getAppleAccounts() {
  return (await db.accounts.toArray()).filter((a) => a.type === 'apple');
}

export async function importIcsFile(file, { areaId = null } = {}) {
  const text = await file.text();
  const { calName, calColor, events } = parseIcs(text);
  const name = calName || file.name.replace(/\.ics$/i, '');
  const accountId = uid();
  const calendarId = uid();

  const account = {
    id: accountId,
    type: 'apple',
    email: `apple:${accountId}`,
    displayName: name,
    areaId,
    status: 'connected',
    lastSyncAt: Date.now(),
    syncToken: null,
  };

  const calendar = {
    id: calendarId,
    accountId,
    name,
    color: calColor || null,
    isVisible: true,
  };

  const dbEvents = buildDbEvents(events, calendarId, accountId);

  await db.transaction('rw', db.accounts, db.calendars, db.events, async () => {
    await db.accounts.put(account);
    await db.calendars.put(calendar);
    if (dbEvents.length) await db.events.bulkPut(dbEvents);
  });

  return { account, eventCount: dbEvents.length };
}

export async function reimportIcsFile(accountId, file) {
  const text = await file.text();
  const { calName, calColor, events } = parseIcs(text);
  const name = calName || file.name.replace(/\.ics$/i, '');

  const calendar = await db.calendars.where('accountId').equals(accountId).first();
  if (!calendar) throw new Error('Calendário não encontrado.');

  const dbEvents = buildDbEvents(events, calendar.id, accountId);

  await db.transaction('rw', db.accounts, db.calendars, db.events, async () => {
    await db.events.where('calendarId').equals(calendar.id).delete();
    if (dbEvents.length) await db.events.bulkPut(dbEvents);
    await db.calendars.update(calendar.id, { name, color: calColor || calendar.color });
    await db.accounts.update(accountId, { displayName: name, lastSyncAt: Date.now() });
  });

  return { eventCount: dbEvents.length };
}

export async function setAppleAccountArea(accountId, areaId) {
  await db.accounts.update(accountId, { areaId });
}

export async function disconnectAppleAccount(accountId) {
  const eventIds = (await db.events.where('accountId').equals(accountId).toArray()).map((e) => e.id);
  await db.transaction('rw', db.accounts, db.calendars, db.events, db.tasks, async () => {
    if (eventIds.length) {
      await db.tasks.where('sourceEventId').anyOf(eventIds).modify({ sourceEventId: null });
    }
    await db.events.where('accountId').equals(accountId).delete();
    await db.calendars.where('accountId').equals(accountId).delete();
    await db.accounts.delete(accountId);
  });
}

function buildDbEvents(events, calendarId, accountId) {
  return events
    .filter((ev) => ev.status !== 'CANCELLED' && ev.startsAt != null)
    .map((ev) => ({
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
