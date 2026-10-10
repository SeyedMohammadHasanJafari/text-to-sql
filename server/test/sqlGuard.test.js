import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MAX_QUERY_LENGTH, UnsafeQueryError, assertReadOnlyQuery } from '#sandbox/sqlGuard.js';

const rejects = (sql) => assert.throws(() => assertReadOnlyQuery(sql), UnsafeQueryError, sql);

describe('assertReadOnlyQuery', () => {
  describe('accepts read-only queries', () => {
    const cases = [
      ['plain select', 'SELECT * FROM sales', 'SELECT * FROM sales'],
      ['CTE', 'WITH m AS (SELECT 1) SELECT * FROM m', 'WITH m AS (SELECT 1) SELECT * FROM m'],
      ['parenthesised', '(SELECT 1) UNION (SELECT 2)', '(SELECT 1) UNION (SELECT 2)'],
      ['trailing semicolon', 'SELECT 1;  ', 'SELECT 1'],
      ['semicolon inside string', "SELECT ';' AS s", "SELECT ';' AS s"],
      ['forbidden name inside string', "SELECT 'set_config(' AS s", "SELECT 'set_config(' AS s"],
      ['escaped quote', "SELECT 'it''s' AS s", "SELECT 'it''s' AS s"],
      ['dollar-quoted string', 'SELECT $q$ ; DROP $q$ AS s', 'SELECT $q$ ; DROP $q$ AS s'],
      ['dollar sign inside identifier', 'SELECT a$b$ FROM t', 'SELECT a$b$ FROM t'],
      ['Persian literal', "SELECT * FROM sales WHERE city = 'تهران'", "SELECT * FROM sales WHERE city = 'تهران'"],
      ['leading comment', '-- monthly revenue\nSELECT 1', '-- monthly revenue\nSELECT 1'],
      ['nested block comment', '/* a /* b */ c */ SELECT 1', '/* a /* b */ c */ SELECT 1'],
    ];

    for (const [name, input, expected] of cases) {
      it(name, () => assert.equal(assertReadOnlyQuery(input), expected));
    }
  });

  describe('rejects unsafe or malformed input', () => {
    const cases = {
      'empty string': '   ',
      'non-string': 42,
      'too long': `SELECT '${'x'.repeat(MAX_QUERY_LENGTH)}'`,
      DELETE: 'DELETE FROM sales',
      'DROP hidden after comment': '/* SELECT */ DROP TABLE sales',
      'SET ROLE': 'SET ROLE someone',
      'stacked statements': 'SELECT 1; DROP TABLE sales',
      'stacked after comment': 'SELECT 1; -- harmless\nDELETE FROM sales',
      set_config: "SELECT set_config('role', 'x', true)",
      'quoted set_config': `SELECT "set_config"('role', 'x', true)`,
      'schema-qualified set_config': `SELECT pg_catalog.set_config('role', 'x', true)`,
      pg_sleep: 'SELECT pg_sleep(10)',
      'advisory lock': 'SELECT pg_advisory_lock(1)',
      'file read': "SELECT pg_read_file('/etc/passwd')",
      'dynamic SQL via xml': "SELECT query_to_xml('select 1', true, true, '')",
      'unicode escape identifier': 'SELECT U&"\\0073et_config"(1)',
      'unterminated string': "SELECT 'oops",
      'unterminated comment': 'SELECT 1 /* oops',
      'unterminated dollar quote': 'SELECT $x$ oops',
    };

    for (const [name, input] of Object.entries(cases)) {
      it(name, () => rejects(input));
    }
  });
});
