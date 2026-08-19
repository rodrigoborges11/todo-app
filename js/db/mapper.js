const toCamel = k => k.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
const toSnake = k => k.replace(/[A-Z]/g, l => '_' + l.toLowerCase());

export function rowToJs(row) {
  if (!row) return row;
  return Object.fromEntries(Object.entries(row).map(([k, v]) => [toCamel(k), v]));
}

export function jsToRow(obj) {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [toSnake(k), v]));
}

export function check({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}

export function mapTask(row) {
  const { task_tags, ...rest } = row;
  return { ...rowToJs(rest), tagIds: (task_tags || []).map(t => t.tag_id) };
}
