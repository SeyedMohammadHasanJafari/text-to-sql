import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { quoteIdentifier } from '#db/identifiers.js';
import { hashPassword, verifyPassword } from '#lib/password.js';
import { sandboxFor } from '#sandbox/sandboxNaming.js';

describe('sandboxFor', () => {
  it('derives deterministic, safe identifiers from a UUID', () => {
    const sandbox = sandboxFor('3F2504E0-4F89-11D3-9A0C-0305E82C3301');
    assert.deepEqual(sandbox, {
      schema: 'sbx_3f2504e04f8911d39a0c0305e82c3301',
      readerRole: 'sbx_3f2504e04f8911d39a0c0305e82c3301_reader',
    });
    assert.doesNotThrow(() => quoteIdentifier(sandbox.readerRole));
  });

  it('rejects anything that is not a UUID', () => {
    for (const input of ['1', 'x; DROP ROLE postgres', '', null]) {
      assert.throws(() => sandboxFor(input), TypeError);
    }
  });
});

describe('quoteIdentifier', () => {
  it('quotes safe identifiers', () => assert.equal(quoteIdentifier('dataset_sales'), '"dataset_sales"'));

  it('refuses unsafe identifiers', () => {
    for (const input of ['Sales', 'a"b', 'a b', '1abc', 'x'.repeat(64)]) {
      assert.throws(() => quoteIdentifier(input));
    }
  });
});

describe('password hashing', () => {
  it('verifies the right password and rejects a wrong one', async () => {
    const hash = await hashPassword('correct horse battery');
    assert.match(hash, /^scrypt\$\d+\$\d+\$\d+\$[\w+/=]+\$[\w+/=]+$/);
    assert.equal(await verifyPassword('correct horse battery', hash), true);
    assert.equal(await verifyPassword('wrong password!!', hash), false);
  });

  it('produces a unique salt per hash', async () => {
    assert.notEqual(await hashPassword('same-password'), await hashPassword('same-password'));
  });

  it('treats malformed hashes as non-matching', async () => {
    assert.equal(await verifyPassword('anything', 'not-a-hash'), false);
  });
});
