// Safe parsing for query-string filters so malformed values are ignored
// rather than producing `$gte: NaN` / `$gte: Invalid Date`, which silently
// match zero documents and make the UI look empty for no reason.

export function finiteNumber(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function startOfDay(value) {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

// Inclusive end-of-day. Accepts a bare YYYY-MM-DD or a full ISO string.
export function endOfDay(value) {
  if (!value) return undefined;
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T23:59:59.999` : value;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

// Build a Mongo range object from optional lower/upper bounds; returns
// undefined when neither bound is valid so the caller can skip the field.
export function range(lower, upper) {
  const out = {};
  if (lower !== undefined) out.$gte = lower;
  if (upper !== undefined) out.$lte = upper;
  return Object.keys(out).length ? out : undefined;
}
