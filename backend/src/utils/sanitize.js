import xss from 'xss';

const CONTROL_RE = /[\u0000-\u001F\u007F]/g;

/**
 * Sanitize text to prevent XSS and remove control characters.
 * Always returns a string.
 */
export function sanitizeText(value, maxLength = 5000) {
  if (value === null || value === undefined) return '';
  
  // Ensure we are working with a string
  const str = String(value);

  const sanitized = xss(str)
    .replace(CONTROL_RE, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return sanitized.slice(0, maxLength);
}

export function sanitizeNullableText(value, maxLength = 5000) {
  if (value === undefined || value === null || value === '') return null;
  return sanitizeText(value, maxLength);
}

export function sanitizeIdentifier(value, maxLength = 120) {
  if (value === null || value === undefined) return null;
  const str = String(value);
  const sanitized = sanitizeText(str, maxLength);
  return sanitized || null;
}

export function sanitizeStringArray(values, maxItemLength = 120) {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => sanitizeIdentifier(value, maxItemLength))
    .filter(Boolean);
}
