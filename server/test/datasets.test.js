import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sanitizeColumns, sanitizeIdentifier, sanitizeTableName } from '#modules/datasets/columnSanitizer.js';
import { parseCsvBuffer } from '#modules/datasets/fileParser.js';
import { coerceValue, inferColumnTypes, inferTypeFromSamples } from '#modules/datasets/typeInference.js';

describe('columnSanitizer', () => {
  it('sanitizes english headers to valid lowercase snake_case identifiers', () => {
    assert.equal(sanitizeIdentifier('Order ID #'), 'order_id');
    assert.equal(sanitizeIdentifier('Price ($ USD)'), 'price_usd');
    assert.equal(sanitizeIdentifier('  whitespace  '), 'whitespace');
  });

  it('transliterates Persian headers cleanly', () => {
    const res = sanitizeIdentifier('فروش ماهانه');
    assert.match(res, /^[a-z_][a-z0-9_]*$/);
    assert.equal(res, 'frvsh_mahAnh'.toLowerCase());
  });

  it('prefixes reserved PostgreSQL keywords', () => {
    assert.equal(sanitizeIdentifier('select'), 'col_select');
    assert.equal(sanitizeIdentifier('where'), 'col_where');
    assert.equal(sanitizeIdentifier('table'), 'col_table');
  });

  it('prefixes leading numbers', () => {
    assert.equal(sanitizeIdentifier('2024_sales'), 'col_2024_sales');
  });

  it('disambiguates duplicate column names', () => {
    const cols = sanitizeColumns(['Revenue', 'Revenue', 'Revenue']);
    assert.deepEqual(
      cols.map((c) => c.column_name),
      ['revenue', 'revenue_2', 'revenue_3'],
    );
  });

  it('sanitizes table names from file names', () => {
    assert.equal(sanitizeTableName('Monthly Sales (2024).csv'), 'dataset_monthly_sales_2024');
  });
});

describe('typeInference', () => {
  it('infers integer correctly', () => {
    assert.equal(inferTypeFromSamples([1, 2, '300', 4000]), 'integer');
  });

  it('infers bigint when numbers exceed 32-bit integer', () => {
    assert.equal(inferTypeFromSamples(['3000000000', '5000000000']), 'bigint');
  });

  it('infers numeric for decimals and currency', () => {
    assert.equal(inferTypeFromSamples(['19.99', '$45.50', '100.0']), 'numeric');
  });

  it('infers boolean for true/false and Persian yes/no', () => {
    assert.equal(inferTypeFromSamples(['true', 'false', 'true']), 'boolean');
    assert.equal(inferTypeFromSamples(['بله', 'خیر', 'بله']), 'boolean');
  });

  it('infers date for YYYY-MM-DD', () => {
    assert.equal(inferTypeFromSamples(['2024-01-15', '2024-02-20']), 'date');
  });

  it('infers timestamptz for ISO timestamps', () => {
    assert.equal(inferTypeFromSamples(['2024-01-15T12:00:00Z', '2024-02-20T18:30:00+03:30']), 'timestamptz');
  });

  it('falls back to text for mixed or string columns', () => {
    assert.equal(inferTypeFromSamples(['Apple', '123', 'Banana']), 'text');
    assert.equal(inferTypeFromSamples(['تهران', 'اصفهان', 'شیراز']), 'text');
  });

  it('coerces values accurately according to target type', () => {
    assert.equal(coerceValue('$1,250.50', 'numeric'), 1250.5);
    assert.equal(coerceValue(' 1,000 ', 'integer'), 1000);
    assert.equal(coerceValue('بله', 'boolean'), true);
    assert.equal(coerceValue('   ', 'text'), null);
    assert.equal(coerceValue(null, 'integer'), null);
  });
});

describe('fileParser (CSV)', () => {
  it('parses valid CSV buffer with BOM and headers', async () => {
    const csvContent = '\uFEFFname,age,city\nAli,28,Tehran\nSara,32,Shiraz';
    const parsed = await parseCsvBuffer(Buffer.from(csvContent, 'utf8'));

    assert.deepEqual(parsed.headers, ['name', 'age', 'city']);
    assert.equal(parsed.rows.length, 2);
    assert.equal(parsed.rows[0].name, 'Ali');
    assert.equal(parsed.rows[1].city, 'Shiraz');
  });
});
