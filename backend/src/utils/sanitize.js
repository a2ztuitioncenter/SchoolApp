const TAG_RE = /<[^>]*>/g;
const CONTROL_RE = /[\u0000-\u001F\u007F]/g;

export function sanitizeText(value, maxLength = 5000) {
  if (typeof value !== 'string') return value;

  const normalized = value
    .replace(CONTROL_RE, ' ')
    .replace(TAG_RE, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return normalized.slice(0, maxLength);
}

export function sanitizeNullableText(value, maxLength = 5000) {
  if (value === undefined || value === null || value === '') return null;
  return sanitizeText(value, maxLength);
}

export function sanitizeIdentifier(value, maxLength = 120) {
  const sanitized = sanitizeText(value, maxLength);
  return sanitized || null;
}

export function sanitizeStringArray(values, maxItemLength = 120) {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => sanitizeIdentifier(value, maxItemLength))
    .filter(Boolean);
}
