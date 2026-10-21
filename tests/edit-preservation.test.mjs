import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { preserveRecordData } from '../src/lib/life-os/editing.ts';

// Exercise actual migration and validation rather than reconstructing its output in the test.
const require = createRequire(import.meta.url);
const ts = require('typescript');
const previousLoader = require.extensions['.ts'];
require.extensions['.ts'] = (module, filename) => {
  const result = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  module._compile(result.outputText, filename);
};
const { readLegacy } = require('../src/lib/life-os/legacy.ts');
const { validateRecord } = require('../src/lib/life-os/records.ts');
if (previousLoader) require.extensions['.ts'] = previousLoader;
else delete require.extensions['.ts'];

function storageFrom(entries) {
  const values = new Map(
    Object.entries(entries).map(([key, value]) => [key, JSON.stringify(value)]),
  );
  return {
    get length() {
      return values.size;
    },
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
  };
}

test('editing a migrated weight retains original measurement time, muscle, fat and blood pressure', async () => {
  const { records } = await readLegacy(
    storageFrom({
      life_os_body_metrics_v2: [
        {
          id: 'synthetic-measurement',
          date: '2024-03-09',
          measuredAt: '2024-03-09 07:30',
          weight: 74.2,
          muscleMass: 35.4,
          fatRatio: 16.2,
          systolicBp: 120,
          diastolicBp: 80,
          notes: '공복 측정',
        },
      ],
    }),
  );
  assert.equal(records.length, 1);
  const original = structuredClone(records[0]);
  const saved = validateRecord({
    ...records[0],
    body: '메모 수정',
    data: preserveRecordData(records, records[0].id, { kg: 74.5 }),
  });
  assert.equal(saved.data.kg, 74.5);
  for (const [field, expected] of Object.entries({
    measuredAt: '2024-03-09 07:30',
    muscleMass: 35.4,
    fatRatio: 16.2,
    systolicBp: 120,
    diastolicBp: 80,
  }))
    assert.equal(saved.data[field], expected);
  assert.equal(saved.data.legacySourceKey, 'life_os_body_metrics_v2');
  assert.deepEqual(records[0], original);
});

test('editing an imported diary keeps its source, tags and provenance while updating mood and gratitude', async () => {
  const { records } = await readLegacy(
    storageFrom({
      life_os_archived_diaries_v1: [
        {
          id: 'synthetic-diary',
          date: '2024-03-09',
          title: '다시 읽는 하루',
          content: '기억해 둘 이야기',
          source: 'google_docs',
          mood: 'good',
        },
      ],
    }),
  );
  assert.equal(records.length, 1);
  const originalData = structuredClone(records[0].data);
  const saved = validateRecord({
    ...records[0],
    body: '이어 쓴 이야기',
    data: preserveRecordData(records, records[0].id, { mood: 5, gratitude: '함께한 시간' }),
  });
  assert.equal(saved.data.mood, 5);
  assert.equal(saved.data.gratitude, '함께한 시간');
  assert.equal(saved.data.source, 'google_docs');
  assert.deepEqual(saved.data.tags, originalData.tags);
  assert.deepEqual(saved.data.legacySources, originalData.legacySources);
  assert.equal(saved.data.originalMood, 'good');
  assert.deepEqual(records[0].data, originalData);
});

test('edits merge against current stored metadata rather than a stale editor snapshot', () => {
  const current = {
    id: 'weight-current',
    type: 'weight',
    data: { kg: 74.2, muscleMass: 36, measuredAt: '2024-03-09 09:30', device: 'updated elsewhere' },
  };
  const result = preserveRecordData([current], current.id, { kg: 74.4 });
  assert.equal(result.kg, 74.4);
  assert.equal(result.muscleMass, 36);
  assert.equal(result.measuredAt, '2024-03-09 09:30');
  assert.equal(result.device, 'updated elsewhere');
  assert.equal(current.data.kg, 74.2);
});

test('new, missing and deleted records never borrow another record’s metadata', () => {
  const records = [
    { id: 'unrelated', data: { privateMarker: 'different record' } },
    { id: 'deleted', deletedAt: '2024-03-09T09:00:00.000Z', data: { old: 'deleted' } },
  ];
  const edited = { kg: 75 };
  for (const id of [null, undefined, 'missing', 'deleted']) {
    const result = preserveRecordData(records, id, edited);
    assert.deepEqual(result, { kg: 75 });
    assert.notEqual(result, edited);
  }
});
