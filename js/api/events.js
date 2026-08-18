import { db } from '../db/schema.js';

export async function getCachedEvents({ fromTs, toTs, areaId = null }) {
  const events = await db.events.where('startsAt').between(fromTs, toTs, true, true).toArray();
  if (!events.length) return [];
  const accounts = await db.accounts.toArray();
  const accountById = Object.fromEntries(accounts.map((a) => [a.id, a]));
  const calendars = await db.calendars.toArray();
  const calendarById = Object.fromEntries(calendars.map((c) => [c.id, c]));

  return events
    .map((e) => ({ ...e, account: accountById[e.accountId], calendar: calendarById[e.calendarId] }))
    .filter((e) => e.account && (!areaId || areaId === 'all' || e.account.areaId === areaId))
    .sort((a, b) => a.startsAt - b.startsAt);
}
