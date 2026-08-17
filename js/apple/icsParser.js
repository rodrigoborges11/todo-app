// Unfold ICS line continuations (RFC 5545 §3.1)
function unfoldLines(text) {
  return text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
}

function unescape(val) {
  return val.replace(/\\n/g, '\n').replace(/\\N/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');
}

function parseDate(value) {
  // UTC datetime: 20240101T120000Z
  const utc = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(value);
  if (utc) {
    const [, y, mo, d, h, mi, s] = utc;
    return { ts: Date.UTC(+y, +mo - 1, +d, +h, +mi, +s), isAllDay: false };
  }
  // Local datetime: 20240101T120000
  const local = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/.exec(value);
  if (local) {
    const [, y, mo, d, h, mi, s] = local;
    return { ts: new Date(+y, +mo - 1, +d, +h, +mi, +s).getTime(), isAllDay: false };
  }
  // All-day: 20240101
  const date = /^(\d{4})(\d{2})(\d{2})$/.exec(value);
  if (date) {
    const [, y, mo, d] = date;
    return { ts: new Date(+y, +mo - 1, +d).getTime(), isAllDay: true };
  }
  return null;
}

export function parseIcs(text) {
  const lines = unfoldLines(text).split(/\r?\n/);

  let calName = null;
  let calColor = null;
  const events = [];
  let ev = null;

  for (const line of lines) {
    if (!line) continue;
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const rawKey = line.substring(0, colonIdx);
    const value = line.substring(colonIdx + 1);
    const semiIdx = rawKey.indexOf(';');
    const key = semiIdx === -1 ? rawKey : rawKey.substring(0, semiIdx);

    if (line === 'BEGIN:VEVENT') { ev = {}; continue; }
    if (line === 'END:VEVENT') {
      if (ev?.uid && ev?.startsAt != null) events.push(ev);
      ev = null;
      continue;
    }

    if (!ev) {
      if (key === 'X-WR-CALNAME') calName = unescape(value);
      if (key === 'X-APPLE-CALENDAR-COLOR') calColor = value.split(';')[0].trim(); // strip alpha
      continue;
    }

    switch (key) {
      case 'UID':     ev.uid = value; break;
      case 'SUMMARY': ev.summary = unescape(value); break;
      case 'LOCATION': ev.location = unescape(value).replace(/\n/g, ' '); break;
      case 'STATUS':  ev.status = value.toUpperCase(); break;
      case 'DTSTART': {
        const p = parseDate(value);
        if (p) { ev.startsAt = p.ts; ev.isAllDay = p.isAllDay; }
        break;
      }
      case 'DTEND': {
        const p = parseDate(value);
        if (p) ev.endsAt = p.ts;
        break;
      }
    }
  }

  return { calName, calColor, events };
}
