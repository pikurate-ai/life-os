import assert from 'node:assert/strict';
import test from 'node:test';
import { searchRecords, searchableBody } from '../src/lib/life-os/search.ts';

const make = (overrides = {}) => ({
  id: 'test-record',
  type: 'memory',
  title: '가족 정보',
  body: 'synthetic-private-number',
  date: '2026-10-16',
  updatedAt: '2026-10-16T00:00:00.000Z',
  data: {},
  ...overrides,
});
test('masked personal information never appears through global search snippets or body matches', () => {
  for (const data of [{ sensitive: true }, { legacyMasked: true }]) {
    const record = make({ data });
    assert.equal(searchableBody(record), '');
    assert.equal(searchRecords([record], 'private-number').length, 0);
    assert.equal(searchRecords([record], '가족').length, 1);
  }
});
test('vault records and deleted content are excluded even when their titles match', () => {
  assert.deepEqual(
    searchRecords(
      [make({ type: 'vault' }), make({ deletedAt: '2026-10-16T00:00:00.000Z' })],
      '가족',
    ),
    [],
  );
  assert.equal(searchableBody(make({ type: 'vault' })), '');
});
test('ordinary memories remain searchable and whitespace-only queries do not enumerate data', () => {
  assert.equal(searchRecords([make()], 'PRIVATE-NUMBER').length, 1);
  assert.deepEqual(searchRecords([make()], '  '), []);
});
