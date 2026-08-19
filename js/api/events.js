import { supabase } from '../db/supabase.js';
import { uid } from '../lib/id.js';
import { rowToJs, jsToRow, check } from '../db/mapper.js';
import { invalidate } from '../db/invalidator.js';

export async function getCachedEvents({ fromTs, toTs, areaId = null }) {
  const rows = check(await supabase
    .from('events')
    .select('*, calendars(id, name, color, account_id), accounts(id, area_id, display_name)')
    .gte('starts_at', fromTs)
    .lte('starts_at', toTs)
    .eq('is_cancelled', false));

  return rows
    .map(row => {
      const { calendars: cal, accounts: acc, ...ev } = row;
      const mapped = rowToJs(ev);
      mapped.calendar = cal ? rowToJs(cal) : null;
      mapped.account  = acc ? rowToJs(acc) : null;
      return mapped;
    })
    .filter(e => {
      if (!areaId || areaId === 'all') return true;
      return (e.account?.areaId === areaId) || (e.areaId === areaId);
    })
    .sort((a, b) => a.startsAt - b.startsAt);
}

export async function createManualEvent({ title, startsAt, endsAt, isAllDay = false, areaId, location = null }) {
  const event = {
    id: uid(),
    calendar_id: null,
    account_id: null,
    area_id: areaId || null,
    title: title.trim(),
    starts_at: startsAt,
    ends_at: endsAt,
    is_all_day: isAllDay,
    location: location?.trim() || null,
    updated_at: Date.now(),
    is_cancelled: false,
  };
  check(await supabase.from('events').insert(event));
  invalidate();
}

export async function deleteEvent(id) {
  check(await supabase.from('events').delete().eq('id', id));
  invalidate();
}
