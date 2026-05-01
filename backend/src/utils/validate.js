/**
 * validate.js - Lightweight schema-based input validation middleware
 * Replaces regex blacklist approach with whitelist schemas.
 * No external dependencies.
 */

/**
 * Validate a value against a field schema
 * @param {*} value
 * @param {object} fieldSchema - { type, required, min, max, pattern, patternMsg, enum }
 * @returns {string|null} error message or null
 */
function validateField(value, fieldSchema, fieldName) {
  const isPresent = value !== undefined && value !== null && value !== '';

  if (fieldSchema.required && !isPresent) {
    return `${fieldName} is required`;
  }

  if (!isPresent) return null; // optional and absent — OK

  if (fieldSchema.type === 'string') {
    if (typeof value !== 'string') return `${fieldName} must be a string`;
    if (fieldSchema.min !== undefined && value.length < fieldSchema.min) return `${fieldName} must be at least ${fieldSchema.min} characters`;
    if (fieldSchema.max !== undefined && value.length > fieldSchema.max) return `${fieldName} must be at most ${fieldSchema.max} characters`;
    if (fieldSchema.pattern && !fieldSchema.pattern.test(value)) return fieldSchema.patternMsg || `${fieldName} has invalid format`;
    if (fieldSchema.enum && !fieldSchema.enum.includes(value)) return `${fieldName} must be one of: ${fieldSchema.enum.join(', ')}`;
  }

  if (fieldSchema.type === 'number') {
    const num = typeof value === 'number' ? value : Number(value);
    if (isNaN(num)) return `${fieldName} must be a number`;
  }

  if (fieldSchema.type === 'array') {
    if (!Array.isArray(value)) return `${fieldName} must be an array`;
    if (fieldSchema.maxItems && value.length > fieldSchema.maxItems) return `${fieldName} has too many items (max ${fieldSchema.maxItems})`;
  }

  return null;
}

/**
 * Express middleware factory — validates req.body against a schema
 * @param {object} schema - { fieldName: { type, required, min, max, pattern, patternMsg, enum } }
 * @returns Express middleware
 */
export function validateBody(schema) {
  return (req, res, next) => {
    const errors = [];
    for (const [field, rules] of Object.entries(schema)) {
      if (field.startsWith('__')) continue;
      const value = req.body[field];
      const err = validateField(value, rules, field);
      if (err) errors.push(err);
    }

    if (schema.__oneOf) {
      const present = schema.__oneOf.some(f => {
        const val = req.body[f];
        return val !== undefined && val !== null && val !== '';
      });
      if (!present) {
        errors.push(`At least one of ${schema.__oneOf.join(' or ')} is required`);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: errors[0], errors, code: 'VALIDATION_ERROR' });
    }
    next();
  };
}

// ── Auth Schemas ──────────────────────────────────────────────

export const loginSchema = {
  identifier: { type: 'string', max: 50 },
  phone: { type: 'string', max: 15 },
  dateOfBirth: { type: 'string', required: true, max: 20 },
  __oneOf: ['identifier', 'phone']
};

export const adminLoginSchema = {
  identifier: { type: 'string', max: 50 },
  phone: { type: 'string', max: 15 },
  password: { type: 'string', required: true, min: 1, max: 128 },
  __oneOf: ['identifier', 'phone']
};

export const teacherLoginSchema = {
  identifier: { type: 'string', max: 50 },
  phone: { type: 'string', max: 15 },
  password: { type: 'string', required: true, min: 1, max: 128 },
  __oneOf: ['identifier', 'phone']
};

export const registerSchema = {
  role: { type: 'string', required: false, enum: ['student', 'teacher', 'staff'] },
  username: { type: 'string', required: true, min: 5, max: 50 },
  phone: { type: 'string', required: true, min: 10, max: 15 },
  classLevel: { type: 'string', required: false, enum: ['7', '8', '9', '10', '11', '12'] }
};


export const changePasswordSchema = {
  currentPassword: { type: 'string', required: true, min: 1, max: 128 },
  newPassword: { type: 'string', required: true, min: 6, max: 128 },
};

export const validateUsername = (username) => {
  if (!username || typeof username !== 'string') return 'Username is required';
  const trimmed = username.trim();
  if (trimmed.length < 5) return 'Username must be at least 5 characters';
  if (trimmed.length > 50) return 'Username must be at most 50 characters';
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) return 'Username can only contain letters, numbers, and underscores';
  return null;
};
