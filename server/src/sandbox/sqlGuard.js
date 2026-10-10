import { AppError } from '#lib/errors.js';

/**
 * Pre-flight validation for AI-generated SQL.
 *
 * IMPORTANT: this is defense-in-depth and a source of fast, friendly errors —
 * it is NOT the security boundary. The boundary is enforced by PostgreSQL itself
 * (read-only transaction, privilege-less agent role, per-user reader role,
 * revoked `set_config`). Every check here fails closed.
 */

export const MAX_QUERY_LENGTH = 10_000;

const ALLOWED_LEADING_KEYWORDS = new Set(['select', 'with']);

/** Functions that can sleep, lock, touch the filesystem, run dynamic SQL or change session state. */
const FORBIDDEN_FUNCTION_CALL = new RegExp(
  String.raw`\b(` +
    [
      'set_config',
      String.raw`pg_sleep\w*`,
      String.raw`pg_(try_)?advisory\w*`,
      String.raw`pg_read_\w+`,
      String.raw`pg_ls_\w+`,
      'pg_stat_file',
      'pg_terminate_backend',
      'pg_cancel_backend',
      'pg_reload_conf',
      String.raw`lo_\w+`,
      String.raw`dblink\w*`,
      String.raw`query_to_xml\w*`,
      String.raw`cursor_to_xml\w*`,
    ].join('|') +
    String.raw`)\s*\(`,
  'i',
);

export class UnsafeQueryError extends AppError {
  constructor(reason) {
    super(422, 'UNSAFE_QUERY', `Query rejected: ${reason}`);
    this.name = 'UnsafeQueryError';
  }
}

/**
 * Validates `rawSql` and returns it normalised (trimmed, without the optional
 * trailing semicolon). Throws {@link UnsafeQueryError} otherwise.
 *
 * @param {unknown} rawSql
 * @returns {string}
 */
export function assertReadOnlyQuery(rawSql) {
  if (typeof rawSql !== 'string' || rawSql.trim() === '') {
    throw new UnsafeQueryError('the query is empty');
  }
  if (rawSql.length > MAX_QUERY_LENGTH) {
    throw new UnsafeQueryError(`the query exceeds ${MAX_QUERY_LENGTH} characters`);
  }

  const skeleton = toSkeleton(rawSql);
  const sql = stripTerminator(rawSql, skeleton);
  const statement = skeleton.slice(0, sql.length);

  const leadingKeyword = statement.match(/^[\s(]*([a-z]+)/i)?.[1]?.toLowerCase();
  if (!ALLOWED_LEADING_KEYWORDS.has(leadingKeyword)) {
    throw new UnsafeQueryError('only SELECT / WITH queries are allowed');
  }

  const forbidden = statement.match(FORBIDDEN_FUNCTION_CALL);
  if (forbidden) {
    throw new UnsafeQueryError(`function "${forbidden[1].toLowerCase()}" is not allowed`);
  }

  return sql.trim();
}

/**
 * Accepts at most one statement with an optional trailing `;`.
 * Because the skeleton is position-preserving, a `;` found in it maps 1:1 to
 * the same index in the original SQL.
 */
function stripTerminator(sql, skeleton) {
  const terminator = skeleton.indexOf(';');
  if (terminator === -1) return sql;

  if (skeleton.slice(terminator + 1).trim() !== '') {
    throw new UnsafeQueryError('only a single statement is allowed');
  }
  return sql.slice(0, terminator);
}

/**
 * Produces a same-length "skeleton" of the SQL in which comments and literal
 * contents are blanked out, so keyword/function checks cannot be fooled by text
 * inside strings — and cannot be evaded by hiding code in comments.
 *
 * Quoted identifiers keep their (unquoted) content: `"set_config"(...)` is
 * still detected as a call to set_config.
 */
function toSkeleton(sql) {
  let out = '';
  let i = 0;

  const blank = (text) => text.replace(/[^\n]/g, ' ');

  while (i < sql.length) {
    const ch = sql[i];
    const pair = sql.slice(i, i + 2);

    if (pair === '--') {
      const end = sql.indexOf('\n', i);
      const stop = end === -1 ? sql.length : end;
      out += blank(sql.slice(i, stop));
      i = stop;
    } else if (pair === '/*') {
      const stop = findBlockCommentEnd(sql, i);
      out += blank(sql.slice(i, stop));
      i = stop;
    } else if (isTokenStart(sql, i) && (ch === 'u' || ch === 'U') && sql[i + 1] === '&' && /["']/.test(sql[i + 2])) {
      throw new UnsafeQueryError('Unicode-escaped literals/identifiers (U&) are not allowed');
    } else if (ch === "'") {
      const stop = findQuoteEnd(sql, i, "'");
      out += blank(sql.slice(i, stop));
      i = stop;
    } else if (ch === '"') {
      const stop = findQuoteEnd(sql, i, '"');
      out += ` ${sql.slice(i + 1, stop - 1).replaceAll('""', '  ')} `;
      i = stop;
    } else if (ch === '$' && isTokenStart(sql, i) && DOLLAR_TAG.test(sql.slice(i, i + 64))) {
      const tag = sql.slice(i, i + 64).match(DOLLAR_TAG)[0];
      const close = sql.indexOf(tag, i + tag.length);
      if (close === -1) throw new UnsafeQueryError('unterminated dollar-quoted string');
      const stop = close + tag.length;
      out += blank(sql.slice(i, stop));
      i = stop;
    } else {
      out += ch;
      i += 1;
    }
  }

  return out;
}

const DOLLAR_TAG = /^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/;
const IDENTIFIER_CHAR = /[A-Za-z0-9_$]/;

/** True when `index` does not continue an identifier (PostgreSQL allows `$` inside identifiers). */
function isTokenStart(sql, index) {
  return index === 0 || !IDENTIFIER_CHAR.test(sql[index - 1]);
}

/** Returns the index just past a quoted token; `''` / `""` are escaped quotes. */
function findQuoteEnd(sql, start, quote) {
  let i = start + 1;
  while (i < sql.length) {
    if (sql[i] === quote) {
      if (sql[i + 1] === quote) {
        i += 2;
        continue;
      }
      return i + 1;
    }
    i += 1;
  }
  throw new UnsafeQueryError('unterminated quoted string or identifier');
}

/** PostgreSQL block comments nest: `/* a /* b *\/ c *\/`. */
function findBlockCommentEnd(sql, start) {
  let depth = 0;
  let i = start;
  while (i < sql.length) {
    const pair = sql.slice(i, i + 2);
    if (pair === '/*') {
      depth += 1;
      i += 2;
    } else if (pair === '*/') {
      depth -= 1;
      i += 2;
      if (depth === 0) return i;
    } else {
      i += 1;
    }
  }
  throw new UnsafeQueryError('unterminated block comment');
}
