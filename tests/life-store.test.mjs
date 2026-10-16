import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRecord,
  emptyWorkspace,
  legacyRecordId,
  makeBackup,
  mergeRecords,
  mergeWorkspaces,
  nextTimestamp,
  parseBackup,
  parseWorkspace,
  recordVersion,
  validateRecord,
  workspaceKey,
} from '../src/lib/life-os/records.ts';

const make = (patch = {}) =>
  validateRecord({
    id: 'record-1',
    type: 'diary',
    title: '하루',
    body: '기록',
    date: '2026-10-16',
    updatedAt: '2026-10-16T00:00:00.000Z',
    data: { mood: 4 },
    ...patch,
  });

test('record merge converges regardless of source order', () => {
  const before = make();
  const after = make({ body: '수정한 기록', updatedAt: '2026-10-16T01:00:00.000Z' });
  assert.deepEqual(mergeRecords([before], [after]), mergeRecords([after], [before]));
  assert.equal(mergeRecords([before], [after])[0].body, '수정한 기록');
});
test('an offline stale copy cannot resurrect a deleted record', () => {
  const original = make();
  const deleted = make({
    deletedAt: '2026-10-16T01:00:00.000Z',
    updatedAt: '2026-10-16T01:00:00.000Z',
    body: '',
    title: '',
    data: {},
  });
  assert.equal(mergeRecords([deleted], [original])[0].deletedAt, deleted.deletedAt);
});
test('a tombstone wins an equal timestamp conflict', () => {
  const original = make();
  const deleted = make({ deletedAt: original.updatedAt });
  assert.equal(mergeRecords([original], [deleted])[0].deletedAt, original.updatedAt);
  assert.deepEqual(mergeRecords([original], [deleted]), mergeRecords([deleted], [original]));
});
test('equal-clock concurrent content has a deterministic winner', () => {
  const one = make({ body: '첫 번째' });
  const two = make({ body: '두 번째' });
  assert.deepEqual(mergeRecords([one], [two]), mergeRecords([two], [one]));
});
test('backups round-trip records, including deletion tombstones', () => {
  const records = [make(), make({ id: 'deleted', deletedAt: '2026-10-16T00:00:00.000Z' })];
  const backup = makeBackup(records, 'uid:alice');
  assert.deepEqual(parseBackup(JSON.stringify(backup)), backup);
  assert.equal(backup.workspace, 'account');
  assert.equal(JSON.stringify(backup).includes('uid:alice'), false);
});
test('invalid or unsupported backup versions never partially import', () => {
  const valid = makeBackup([make()], 'guest');
  assert.throws(() => parseBackup(JSON.stringify({ ...valid, version: 1 })));
  assert.throws(() =>
    parseBackup(JSON.stringify({ ...valid, records: [make(), { ...make(), date: '2026-02-31' }] })),
  );
  assert.throws(() => parseBackup(JSON.stringify({ ...valid, records: [make(), make()] })));
  assert.throws(() => parseBackup('{ invalid json'));
});
test('record schema rejects invalid dates, types, IDs, and nested data', () => {
  for (const patch of [
    { date: '2026-02-30' },
    { type: 'unknown' },
    { id: '../other-user' },
    { id: '__proto__' },
    { id: 'constructor' },
    { data: { secret: { unsafe: true } } },
    { data: { amount: Infinity } },
  ]) {
    assert.throws(() => make(patch));
  }
});
test('plaintext vault secrets cannot cross persistence boundaries', () => {
  assert.throws(() =>
    make({ type: 'vault', body: 'plaintext', data: { ciphertext: 'abcdefghijklmnop' } }),
  );
  assert.throws(() =>
    make({
      type: 'vault',
      body: '',
      data: { password: 'plaintext', ciphertext: 'abcdefghijklmnop' },
    }),
  );
  assert.throws(() => make({ type: 'vault', body: '', data: {} }));
  assert.doesNotThrow(() =>
    make({
      type: 'vault',
      body: '',
      data: { role: 'entry', version: 2, iv: 'random', ciphertext: 'abcdefghijklmnop' },
    }),
  );
});
test('oversized records fail before they can exceed a Firestore document', () => {
  assert.throws(() => make({ type: 'photo', data: { image: '한'.repeat(300000) } }), /650KB/);
});
test('demo, guest, and distinct Firebase UIDs use separate storage keys', () => {
  const scopes = ['demo', 'guest', 'uid:alice', 'uid:bob'];
  assert.equal(new Set(scopes.map(workspaceKey)).size, 4);
  assert.throws(() => workspaceKey('uid:alice/../bob'));
});
test('a cache saved under a different UID is rejected, not exposed', () => {
  const alice = { ...emptyWorkspace('uid:alice'), records: [make()] };
  assert.throws(() => parseWorkspace(JSON.stringify(alice), 'uid:bob'));
  assert.throws(() => mergeWorkspaces(alice, emptyWorkspace('uid:bob')));
});
test('offline pending writes survive a cache round trip', () => {
  const workspace = { ...emptyWorkspace('uid:alice'), records: [make()], pending: ['record-1'] };
  assert.deepEqual(parseWorkspace(JSON.stringify(workspace), 'uid:alice'), workspace);
});
test('durable acknowledgements prevent stale tabs resurrecting a pending write', () => {
  const record = make();
  const staleTab = { ...emptyWorkspace('uid:alice'), records: [record], pending: [record.id] };
  const acknowledgedTab = {
    ...emptyWorkspace('uid:alice'),
    records: [record],
    acknowledged: { [record.id]: recordVersion(record) },
  };
  assert.deepEqual(mergeWorkspaces(staleTab, acknowledgedTab).pending, []);
  assert.deepEqual(mergeWorkspaces(acknowledgedTab, staleTab).pending, []);
});
test('an acknowledgement for an old version does not erase a newer queued edit', () => {
  const before = make();
  const after = make({ body: '더 새로운 수정', updatedAt: '2026-10-16T02:00:00.000Z' });
  const saved = {
    ...emptyWorkspace('uid:alice'),
    records: [before],
    acknowledged: { [before.id]: recordVersion(before) },
  };
  const local = { ...emptyWorkspace('uid:alice'), records: [after], pending: [after.id] };
  assert.deepEqual(mergeWorkspaces(saved, local).pending, [after.id]);
});
test('the local clock advances through same-millisecond edits and a slow device clock', () => {
  const record = make();
  const next = nextTimestamp([record], Date.parse(record.updatedAt) - 1000);
  assert.equal(next, '2026-10-16T00:00:00.001Z');
  assert.equal(
    createRecord(
      { type: 'task', title: '할 일', body: '', date: '2026-10-16', data: {} },
      'new-id',
      next,
    ).updatedAt,
    next,
  );
});
test('future-clock and invalid calendar timestamps cannot poison all subsequent edits', () => {
  assert.throws(() => make({ updatedAt: '9999-12-31T23:59:59.999Z' }));
  assert.throws(() => make({ updatedAt: '2026-02-30T00:00:00.000Z' }));
  assert.throws(() => make({ updatedAt: new Date(Date.now() + 172_800_000).toISOString() }));
});
test('tombstones must match the server deletion revision contract', () => {
  assert.throws(() => make({ deletedAt: '2026-10-16T01:00:00.000Z' }));
});
test('vault imports reject plaintext metadata and canonicalize sensitive display names', () => {
  assert.throws(() =>
    make({
      type: 'vault',
      body: '',
      data: { ciphertext: 'abcdefghijklmnop', username: 'private@example.com' },
    }),
  );
  const record = make({
    type: 'vault',
    title: 'PRIVATE BANK',
    body: '',
    data: { role: 'entry', ciphertext: 'abcdefghijklmnop' },
  });
  assert.equal(record.title, '암호화된 항목');
});
test('legacy same-day rows without IDs stay distinct and retry IDs are stable', () => {
  const key = 'life_os_financial_logs_v2';
  const one = { date: '2026-10-16', merchant: '식사', amount: 10000 };
  const two = { date: '2026-10-16', merchant: '교통', amount: 3000 };
  assert.notEqual(legacyRecordId(key, one, 0), legacyRecordId(key, two, 0));
  assert.notEqual(legacyRecordId(key, one, 0), legacyRecordId(key, one, 1));
  assert.equal(legacyRecordId(key, one, 0), legacyRecordId(key, one, 0));
  assert.equal(
    legacyRecordId(key, { id: 'stable-id', ...one }, 0),
    legacyRecordId(key, { id: 'stable-id', ...one }, 1),
  );
});
test('validated tombstones cannot preserve plaintext deleted content', () => {
  const record = make({
    deletedAt: '2026-10-16T00:00:00.000Z',
    body: 'private text',
    data: { private: 'metadata' },
  });
  assert.equal(record.body, '');
  assert.equal(record.title, '');
  assert.deepEqual(record.data, {});
});
