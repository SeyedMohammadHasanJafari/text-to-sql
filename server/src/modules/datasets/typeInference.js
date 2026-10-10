/**
 * Data type inference and coercion for dynamic table columns.
 *
 * Supported PostgreSQL types:
 *  - integer
 *  - bigint
 *  - numeric
 *  - boolean
 *  - date
 *  - timestamptz
 *  - text
 */

const INT4_MIN = -2147483648;
const INT4_MAX = 2147483647;

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const ISO_TIMESTAMP_REGEX = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}(:?\d{2})?)?$/i;

const BOOLEAN_TRUE = new Set(['true', 't', 'yes', 'y', '1', 'بله', 'درست']);
const BOOLEAN_FALSE = new Set(['false', 'f', 'no', 'n', '0', 'خیر', 'نادرست']);

function isNullOrEmpty(val) {
  return val === null || val === undefined || (typeof val === 'string' && val.trim() === '');
}

function testBoolean(val) {
  if (typeof val === 'boolean') return true;
  const str = String(val).trim().toLowerCase();
  return BOOLEAN_TRUE.has(str) || BOOLEAN_FALSE.has(str);
}

function testInteger(val) {
  if (typeof val === 'number') return Number.isInteger(val);
  const str = String(val).trim();
  return /^-?\d+$/.test(str);
}

function testNumeric(val) {
  if (typeof val === 'number') return !Number.isNaN(val);
  const str = String(val).trim().replace(/[$,€£]/g, '');
  return /^-?\d+(\.\d+)?$/.test(str);
}

function testDate(val) {
  if (val instanceof Date) return true;
  const str = String(val).trim();
  if (!DATE_REGEX.test(str)) return false;
  const parsed = Date.parse(str);
  return !Number.isNaN(parsed);
}

function testTimestamp(val) {
  if (val instanceof Date) return true;
  const str = String(val).trim();
  if (!ISO_TIMESTAMP_REGEX.test(str)) return false;
  const parsed = Date.parse(str);
  return !Number.isNaN(parsed);
}

/**
 * Infers the optimal PostgreSQL column type from an array of sample values.
 *
 * @param {unknown[]} sampleValues
 * @returns {'integer' | 'bigint' | 'numeric' | 'boolean' | 'date' | 'timestamptz' | 'text'}
 */
export function inferTypeFromSamples(sampleValues) {
  const nonNulls = sampleValues.filter((v) => !isNullOrEmpty(v));

  if (nonNulls.length === 0) {
    return 'text';
  }

  // 1. Test Boolean
  if (nonNulls.every(testBoolean)) {
    return 'boolean';
  }

  // 2. Test Integer & Bigint
  if (nonNulls.every(testInteger)) {
    const isAllInt4 = nonNulls.every((v) => {
      const num = Number(v);
      return num >= INT4_MIN && num <= INT4_MAX;
    });
    return isAllInt4 ? 'integer' : 'bigint';
  }

  // 3. Test Numeric / Float
  if (nonNulls.every(testNumeric)) {
    return 'numeric';
  }

  // 4. Test Date (strictly YYYY-MM-DD)
  if (nonNulls.every(testDate)) {
    return 'date';
  }

  // 5. Test Timestamp
  if (nonNulls.every(testTimestamp)) {
    return 'timestamptz';
  }

  // Fallback to text
  return 'text';
}

/**
 * Infers types for all columns given sample rows.
 *
 * @param {Record<string, unknown>[]} sampleRows
 * @param {Array<{ column_name: string, original_name: string, ordinal: number }>} columns
 * @returns {Map<string, string>} Map of column_name -> data_type
 */
export function inferColumnTypes(sampleRows, columns) {
  const typeMap = new Map();

  for (const col of columns) {
    const samples = sampleRows.map((row) => row[col.original_name]);
    const inferred = inferTypeFromSamples(samples);
    typeMap.set(col.column_name, inferred);
  }

  return typeMap;
}

/**
 * Coerces raw parsed value into a suitable SQL parameter value based on column data_type.
 *
 * @param {unknown} val
 * @param {string} dataType
 * @returns {unknown}
 */
export function coerceValue(val, dataType) {
  if (isNullOrEmpty(val)) {
    return null;
  }

  if (val instanceof Date) {
    return val.toISOString();
  }

  const str = String(val).trim();

  switch (dataType) {
    case 'boolean': {
      const lower = str.toLowerCase();
      if (BOOLEAN_TRUE.has(lower)) return true;
      if (BOOLEAN_FALSE.has(lower)) return false;
      return null;
    }
    case 'integer':
    case 'bigint': {
      const cleanNum = str.replace(/,/g, '');
      const parsed = parseInt(cleanNum, 10);
      return Number.isNaN(parsed) ? null : parsed;
    }
    case 'numeric': {
      const cleanNum = str.replace(/[$,€£,\s]/g, '');
      const parsed = parseFloat(cleanNum);
      return Number.isNaN(parsed) ? null : parsed;
    }
    case 'date': {
      const d = new Date(str);
      return Number.isNaN(d.getTime()) ? null : str.slice(0, 10);
    }
    case 'timestamptz': {
      const d = new Date(str);
      return Number.isNaN(d.getTime()) ? null : d.toISOString();
    }
    case 'text':
    default:
      return str;
  }
}
