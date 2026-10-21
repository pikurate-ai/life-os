import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

// Synthetic fixtures exercise the real adapter/session. No browser user data,
// actual backup, cloud service, or private source CSV is used by these tests.
const require = createRequire(import.meta.url);
const ts = require('typescript');
const previousLoader = require.extensions['.ts'];
require.extensions['.ts'] = (module, filename) => {
  const result = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  module._compile(result.outputText, filename);
};
const {
  inspectBackupText,
  preserveLegacyImport,
  BackupImportSession,
  backupTargetVersion,
} = require('../src/lib/life-os/backup.ts');
const { validateRecord, makeBackup } = require('../src/lib/life-os/records.ts');
if (previousLoader) require.extensions['.ts'] = previousLoader;
else delete require.extensions['.ts'];

function v1(data = {}) {
  return {
    version: '1.0.0',
    exportedAt: '2026-10-16T00:00:00.000Z',
    app: 'Life-OS',
    data: {
      essentialInfo: [],
      financialLogs: [],
      assets: [],
      encryptedVault: [],
      workout1RM: [],
      healthMetrics: [],
      archivedDiaries: [],
      alarmConfig: null,
      healthKitData: null,
      ...data,
    },
  };
}
function record(patch = {}) {
  return validateRecord({
    id: 'source-stable-id',
    type: 'memory',
    title: '가상 기록',
    body: '원본 내용',
    date: '2026-10-16',
    updatedAt: '2026-10-16T00:00:00.000Z',
    data: { source: 'legacy', category: 'daily', pinned: false },
    ...patch,
  });
}
const summary = {
  source: 'v1',
  sourceWorkspace: 'legacy',
  total: 1,
  active: 1,
  deleted: 0,
  skipped: 0,
  duplicates: 0,
  conflicts: 0,
  targetKind: 'guest',
  targetLabel: '현재 기기',
  warnings: [],
};

test('exact universalBackup v1 package converts its actual seven datasets into validated records', async () => {
  const input = v1({
    essentialInfo: [
      {
        id: 'essential',
        title: '가상 메모',
        value: '합성 테스트 값',
        memo: '원문 유지',
        category: 'family',
      },
    ],
    financialLogs: [
      {
        amount: 12000,
        merchant: '가상 식당',
        date: '2026-10-15',
        time: '12:00',
        paymentMethod: '테스트 카드',
        category: '식비',
        rawText: '가상 승인 내역',
      },
    ],
    assets: [{ id: 'asset', name: '가상 자산', type: 'asset', amount: 100000, color: 'green' }],
    encryptedVault: [
      {
        id: 'vault',
        siteName: 'must not copy plaintext',
        username: 'not-copied',
        encrypted: {
          ciphertext: 'abcdefghijklmnopabcdefghijklmnop',
          iv: 'test-iv',
          salt: 'test-salt',
        },
      },
    ],
    workout1RM: [
      {
        id: 'workout',
        exercise_name: '벤치프레스',
        weight: 40,
        reps: 5,
        calculated_1rm: 46.7,
        logged_date: '2026-10-15',
      },
    ],
    healthMetrics: [
      {
        id: 'weight',
        weight: 75,
        date: '2026-10-15',
        measuredAt: '2026-10-15 07:30',
        muscleMass: 34,
      },
    ],
    archivedDiaries: [
      {
        id: 'diary',
        date: '2026-10-15',
        title: '가상 일기',
        content: '이전 백업 변환 테스트',
        mood: 'good',
        source: 'google_docs',
      },
    ],
    alarmConfig: { enabled: true },
    healthKitData: { steps: 9999, source: 'unverified' },
  });
  const original = JSON.stringify(input);
  const candidate = await inspectBackupText(original);
  assert.equal(candidate.source, 'v1');
  assert.equal(candidate.sourceWorkspace, 'legacy');
  assert.equal(candidate.records.length, 7);
  assert.equal(candidate.skipped, 0);
  for (const item of candidate.records) assert.doesNotThrow(() => validateRecord(item));
  assert.equal(candidate.records.find((item) => item.type === 'weight').data.muscleMass, 34);
  assert.equal(
    candidate.records.find((item) => item.type === 'workout').data.exercise,
    '벤치프레스',
  );
  assert.equal(candidate.records.find((item) => item.type === 'diary').data.mood, 4);
  assert.equal(JSON.stringify(candidate.records).includes('must not copy plaintext'), false);
  assert.equal(JSON.stringify(candidate.records).includes('not-copied'), false);
  assert.ok(candidate.warnings.some((warning) => warning.includes('사진·일반 메모·턱걸이')));
  assert.ok(candidate.warnings.some((warning) => warning.includes('HealthKit')));
  assert.equal(JSON.stringify(input), original);
});
test('v1 inspection reports skipped rows and rejects wrong packages before any commit', async () => {
  const candidate = await inspectBackupText(
    JSON.stringify(v1({ healthMetrics: [{ id: 'invalid', date: '2026-02-31', weight: 75 }] })),
  );
  assert.equal(candidate.records.length, 0);
  assert.equal(candidate.skipped, 1);
  assert.ok(candidate.warnings.some((warning) => warning.includes('체중')));
  await assert.rejects(() => inspectBackupText(JSON.stringify({ ...v1(), version: '0.9' })));
  await assert.rejects(() => inspectBackupText(JSON.stringify({ ...v1(), app: 'Other app' })));
  await assert.rejects(() => inspectBackupText(JSON.stringify({ ...v1(), data: { assets: [] } })));
  await assert.rejects(() => inspectBackupText('{not-json'));
});
test('v2 candidates preserve the backup source workspace and deletion tombstones', async () => {
  const source = [
    record(),
    record({ id: 'deleted-record', deletedAt: '2026-10-16T00:00:00.000Z' }),
  ];
  const input = makeBackup(source, 'guest');
  const candidate = await inspectBackupText(JSON.stringify(input));
  assert.equal(candidate.source, 'v2');
  assert.equal(candidate.sourceWorkspace, 'guest');
  assert.deepEqual(candidate.records, source);
  assert.equal(candidate.skipped, 0);
});
test('a changed legacy ID creates a deterministic full review copy while the original stays intact', () => {
  const original = record();
  const changed = record({ body: '수정된 이전 내용', updatedAt: '2026-10-16T01:00:00.000Z' });
  const before = JSON.stringify(original);
  const result = preserveLegacyImport([original], [changed]);
  assert.equal(result.conflicts, 1);
  assert.equal(result.additions.length, 1);
  const review = result.additions[0];
  assert.equal(review.type, 'memory');
  assert.equal(review.data.importConflict, true);
  assert.notEqual(review.id, original.id);
  assert.equal(JSON.parse(review.data.importSnapshot).body, changed.body);
  assert.equal(JSON.stringify(original), before);
  const retried = preserveLegacyImport(
    [original, review],
    [{ ...changed, updatedAt: '2026-10-16T02:00:00.000Z' }],
  );
  assert.equal(retried.additions.length, 0);
  assert.equal(retried.unchanged, 1);
  const next = preserveLegacyImport([original, review], [record({ body: '그다음 변경분' })]);
  assert.equal(next.additions.length, 1);
  assert.notEqual(next.additions[0].id, review.id);
});
test('changed asset snapshots preserve both amounts without adding a second active asset', () => {
  const original = record({
    type: 'asset',
    title: '가상 예금',
    body: '',
    data: { source: 'legacy', direction: 'asset', amount: 1000, category: '예금' },
  });
  const changed = record({ ...original, data: { ...original.data, amount: 2000 } });
  const result = preserveLegacyImport([original], [changed]);
  const activeAssets = [original, ...result.additions].filter((item) => item.type === 'asset');
  assert.equal(activeAssets.length, 1);
  assert.equal(activeAssets[0].data.amount, 1000);
  assert.equal(JSON.parse(result.additions[0].data.importSnapshot).data.amount, 2000);
});
test('migration timestamps do not create duplicates and deletion choices are not resurrected', () => {
  const original = record();
  const nextDay = record({
    date: '2026-10-17',
    updatedAt: '2026-10-16T02:00:00.000Z',
    data: { ...original.data, legacyUpdatedAt: 'changed metadata only' },
  });
  assert.equal(preserveLegacyImport([original], [nextDay]).unchanged, 1);
  const deleted = record({ deletedAt: '2026-10-16T00:00:00.000Z' });
  const result = preserveLegacyImport([deleted], [original]);
  assert.equal(result.additions.length, 0);
  assert.equal(result.deletedSkipped, 1);
});
test('masked review copies preserve masking and changed vaults remain encrypted vault copies', () => {
  const masked = record({
    data: { source: 'legacy', category: 'daily', pinned: false, legacyMasked: true },
  });
  const changed = record({ ...masked, body: '변경된 가상 가림 정보' });
  assert.equal(preserveLegacyImport([masked], [changed]).additions[0].data.legacyMasked, true);
  const originalVault = record({
    type: 'vault',
    title: '암호화된 항목',
    body: '',
    data: {
      legacy: true,
      encrypted: 'abcdefghijklmnop',
      legacyFormat: 'aes-gcm-pbkdf2-100000',
      source: 'legacy',
    },
  });
  const newVault = record({
    ...originalVault,
    data: { ...originalVault.data, encrypted: 'qrstuvwxyzabcdef' },
  });
  const result = preserveLegacyImport([originalVault], [newVault]);
  assert.equal(result.additions[0].type, 'vault');
  assert.equal(result.additions[0].body, '');
  assert.equal(result.additions[0].data.encrypted, newVault.data.encrypted);
  assert.equal(
    preserveLegacyImport([originalVault, ...result.additions], [newVault]).additions.length,
    0,
  );
});
test('inspection sessions cannot apply without explicit token, matching file, unchanged target and scope', async () => {
  const source = JSON.stringify(
    v1({ essentialInfo: [{ id: 'fixture', title: '가상 메모', value: '확인 전 저장 금지' }] }),
  );
  const file = new File([source], 'synthetic-v1.json', { type: 'application/json' });
  const candidate = await inspectBackupText(await file.text());
  const session = new BackupImportSession();
  const request = session.begin();
  const preview = session.stage(
    request,
    { file, scope: 'guest', targetVersion: 'unchanged', candidate },
    summary,
  );
  assert.equal('records' in preview, false);
  assert.throws(() => session.confirm(undefined, file, 'guest', 'unchanged'));
  assert.throws(() =>
    session.confirm(preview.token, new File([source], file.name), 'guest', 'unchanged'),
  );
  assert.throws(() => session.confirm(preview.token, file, 'uid:another-account', 'unchanged'));
  assert.throws(() => session.confirm(preview.token, file, 'guest', 'changed'));
  assert.equal(
    session.confirm(preview.token, file, 'guest', 'unchanged').candidate.records.length,
    1,
  );
  assert.equal(await file.text(), source);
  session.discard();
  assert.throws(() => session.confirm(preview.token, file, 'guest', 'unchanged'));
});
test('a new file or scope invalidates in-flight previews and unchanged workspace versions are stable', () => {
  const session = new BackupImportSession();
  const old = session.begin();
  session.begin();
  assert.throws(() =>
    session.stage(
      old,
      {
        file: new File([], 'fixture.json'),
        scope: 'guest',
        targetVersion: '',
        candidate: {
          source: 'v2',
          sourceWorkspace: 'guest',
          records: [],
          skipped: 0,
          duplicates: 0,
          warnings: [],
        },
      },
      summary,
    ),
  );
  const one = record();
  const two = record({ id: 'second' });
  assert.equal(backupTargetVersion([one, two]), backupTargetVersion([two, one]));
  assert.notEqual(backupTargetVersion([one]), backupTargetVersion([{ ...one, body: '다른 내용' }]));
});
