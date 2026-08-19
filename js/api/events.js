import { supabase } from '../db/supabase.js';
import { rowToJs, check } from '../db/mapper.js';

export async function getCachedEvents({ fromTs, toTs, areaId = null }) {
  let q = supabase.from('events').select('*, calendars(id, name, color, account_id), accounts(id, area_id, display_name)')
    .gte('starts_at', fromTs).lte('starts_at', toTs);
  const rows = check(await q);

  return rows
    .map(row => {
      const { calendars: cal, accounts: acc, ...ev } = row;
      const mapped = rowToJs(ev);
      mapped.calendar = cal ? rowToJs(cal) : null;
      mapped.account = acc ? rowToJs(acc) : null;
      return mapped;
    })
    .filter(e => e.account && (!areaId || areaId === 'all' || e.account.areaId === areaId))
    .sort((a, b) => a.startsAt - b.startsAt);
}
