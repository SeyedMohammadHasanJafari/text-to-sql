/**
 * Column and table name sanitization for PostgreSQL schemas.
 *
 * Requirements:
 *  - Must match /^[a-z_][a-z0-9_]{0,62}$/
 *  - Must avoid PostgreSQL reserved keywords
 *  - Must handle empty headers, non-ASCII characters, duplicates, and symbols
 *  - Preserves original name alongside sanitized name
 */

const RESERVED_WORDS = new Set([
  'all', 'analyse', 'analyze', 'and', 'any', 'array', 'as', 'asc', 'asymmetric',
  'both', 'case', 'cast', 'check', 'collate', 'column', 'constraint', 'create',
  'current_catalog', 'current_date', 'current_role', 'current_time', 'current_timestamp',
  'current_user', 'default', 'deferrable', 'desc', 'distinct', 'do', 'else', 'end',
  'except', 'false', 'fetch', 'for', 'foreign', 'from', 'grant', 'group', 'having',
  'in', 'initially', 'intersect', 'into', 'lateral', 'leading', 'limit', 'localtime',
  'localtimestamp', 'not', 'null', 'offset', 'on', 'only', 'or', 'order', 'placing',
  'primary', 'references', 'returning', 'select', 'session_user', 'some', 'symmetric',
  'table', 'then', 'to', 'trailing', 'true', 'union', 'unique', 'user', 'using',
  'variadic', 'when', 'where', 'window', 'with'
]);

/**
 * Transliteration dictionary for Persian/Arabic characters to ASCII snake_case
 */
const PERSIAN_MAP = {
  'آ': 'a', 'ا': 'a', 'ب': 'b', 'پ': 'p', 'ت': 't', 'ث': 's', 'ج': 'j', 'چ': 'ch',
  'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'z', 'ر': 'r', 'ز': 'z', 'ژ': 'zh', 'س': 's',
  'ش': 'sh', 'ص': 's', 'ض': 'z', 'ط': 't', 'ظ': 'z', 'ع': 'a', 'غ': 'gh', 'ف': 'f',
  'ق': 'gh', 'ک': 'k', 'گ': 'g', 'ل': 'l', 'م': 'm', 'ن': 'n', 'و': 'v', 'ه': 'h',
  'ی': 'y', 'ي': 'y', 'ك': 'k', '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
  '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9'
};

function transliteratePersian(str) {
  return str.split('').map(ch => PERSIAN_MAP[ch] || ch).join('');
}

/**
 * Converts any header string into a safe, valid PostgreSQL identifier.
 *
 * @param {string} rawHeader
 * @param {number} fallbackIndex
 * @returns {string}
 */
export function sanitizeIdentifier(rawHeader, fallbackIndex = 1) {
  if (typeof rawHeader !== 'string' || !rawHeader.trim()) {
    return `col_${fallbackIndex}`;
  }

  // Transliterate Persian/Arabic characters
  let cleaned = transliteratePersian(rawHeader.trim());

  // Replace whitespace and special punctuation with underscores
  cleaned = cleaned
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  // Must not start with a number
  if (/^[0-9]/.test(cleaned)) {
    cleaned = `col_${cleaned}`;
  }

  // If empty after stripping
  if (!cleaned) {
    cleaned = `col_${fallbackIndex}`;
  }

  // If reserved keyword, prefix with col_
  if (RESERVED_WORDS.has(cleaned)) {
    cleaned = `col_${cleaned}`;
  }

  // Maximum 63 bytes in PostgreSQL
  return cleaned.slice(0, 63);
}

/**
 * Sanitizes an array of raw column headers and guarantees uniqueness.
 *
 * @param {string[]} rawHeaders
 * @returns {Array<{ column_name: string, original_name: string, ordinal: number }>}
 */
export function sanitizeColumns(rawHeaders) {
  const seen = new Map();

  return rawHeaders.map((raw, idx) => {
    const originalName = String(raw ?? '').trim() || `Column ${idx + 1}`;
    let sanitized = sanitizeIdentifier(originalName, idx + 1);

    if (seen.has(sanitized)) {
      const count = seen.get(sanitized) + 1;
      seen.set(sanitized, count);
      // Guarantee length constraint when appending suffix
      const suffix = `_${count}`;
      sanitized = `${sanitized.slice(0, 63 - suffix.length)}${suffix}`;
    } else {
      seen.set(sanitized, 1);
    }

    return {
      ordinal: idx,
      column_name: sanitized,
      original_name: originalName,
    };
  });
}

/**
 * Generates a safe table name from the uploaded filename.
 * Example: "Sales Report 2024.xlsx" -> "sales_report_2024"
 *
 * @param {string} filename
 * @returns {string}
 */
export function sanitizeTableName(filename) {
  const baseName = filename.replace(/\.[^/.]+$/, '');
  const sanitized = sanitizeIdentifier(baseName, 1);
  return sanitized.startsWith('dataset_') ? sanitized : `dataset_${sanitized}`.slice(0, 63);
}
