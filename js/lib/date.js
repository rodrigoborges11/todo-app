// Utilitários de data. Tudo trabalha com timestamps (ms) para simplificar
// a comparação e a indexação no IndexedDB.

export function startOfDay(ts = Date.now()) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function endOfDay(ts = Date.now()) {
  const d = new Date(ts);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export function addDays(ts, days) {
  const d = new Date(ts);
  d.setDate(d.getDate() + days);
  return d.getTime();
}

export function isSameDay(a, b) {
  return startOfDay(a) === startOfDay(b);
}

export function isOverdue(dueAt, isCompleted) {
  if (!dueAt || isCompleted) return false;
  return dueAt < startOfDay(Date.now());
}

export function daysLate(dueAt) {
  if (!dueAt) return 0;
  const diff = startOfDay(Date.now()) - startOfDay(dueAt);
  return Math.max(0, Math.round(diff / 86400000));
}

const WEEKDAYS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const WEEKDAYS_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function formatDayLabel(ts) {
  const today = startOfDay(Date.now());
  const day = startOfDay(ts);
  const diff = Math.round((day - today) / 86400000);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  if (diff === -1) return 'Ontem';
  const d = new Date(ts);
  const weekday = WEEKDAYS_SHORT[d.getDay()];
  return `${weekday}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

export function formatFullDate(ts) {
  const d = new Date(ts);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS_SHORT[d.getMonth()]}`;
}

export function formatTime(ts) {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function hasTime(ts) {
  // Convenção: se os segundos+ms forem exatamente 0 E hh:mm também for 00:00,
  // tratamos como "sem hora definida" (apenas data).
  const d = new Date(ts);
  return !(d.getHours() === 0 && d.getMinutes() === 0);
}

export function formatDateTimeShort(ts) {
  const label = formatDayLabel(ts);
  return hasTime(ts) ? `${label} · ${formatTime(ts)}` : label;
}

// Devolve uma data (timestamp, meia-noite) a partir de um <input type="date">
export function dateInputToTs(value) {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

export function tsToDateInput(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function tsToTimeInput(ts) {
  if (!ts || !hasTime(ts)) return '';
  return formatTime(ts);
}

export function combineDateTime(dateTs, timeValue) {
  if (!dateTs) return null;
  if (!timeValue) return dateTs;
  const [hh, mm] = timeValue.split(':').map(Number);
  const d = new Date(dateTs);
  d.setHours(hh, mm, 0, 0);
  return d.getTime();
}
