import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

// Execute the real browser-independent migration module, including its actual
// sibling imports, without adding a test-only production resolver or package.
const require = createRequire(import.meta.url);
const ts = require('typescript');
const previousLoader = require.extensions['.ts'];
require.extensions['.ts'] = (module, filename) => {
  const source = readFileSync(filename, 'utf8');
  const result = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  module._compile(result.outputText, filename);
};
const { readLegacy, legacyDate } = require('../src/lib/life-os/legacy.ts');
if (previousLoader) require.extensions['.ts'] = previousLoader;
else delete require.extensions['.ts'];

const png =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aYhUAAAAASUVORK5CYII=';
const now = new Date('2026-10-16T12:00:00.000Z');
function storageFrom(entries, rawEntries = {}) {
  const values = new Map(
    Object.entries(entries).map(([key, value]) => [key, JSON.stringify(value)]),
  );
  for (const [key, value] of Object.entries(rawEntries)) values.set(key, value);
  return {
    get length() {
      return values.size;
    },
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    snapshot: () => [...values.entries()],
  };
}

test('legacy date parsing preserves actual ISO and Korean locale dates without inventing today', () => {
  assert.equal(legacyDate('2024. 3. 9.'), '2024-03-09');
  assert.equal(legacyDate('2024년 3월 9일'), '2024-03-09');
  assert.equal(legacyDate('2024-03-09 07:30'), '2024-03-09');
  assert.equal(legacyDate('2024-03-09T23:59:00.000Z'), '2024-03-09');
  assert.equal(legacyDate('2024. 2. 31.'), null);
  assert.equal(legacyDate('unparseable'), null);
});
test('actual photos_v2 url shape and Korean upload dates migrate with original folder/tag', async () => {
  const storage = storageFrom({
    life_os_photos_v2: [
      {
        id: 'p-fixture',
        url: png,
        title: '가족 산책',
        date: '2024. 3. 9.',
        folder: '가족/여행',
        tag: '주말',
      },
    ],
  });
  const before = storage.snapshot();
  const result = await readLegacy(storage, { now });
  assert.equal(result.records.length, 1);
  assert.equal(result.unsupported, 0);
  const record = result.records[0];
  assert.equal(record.type, 'photo');
  assert.equal(record.date, '2024-03-09');
  assert.equal(record.data.image, png);
  assert.equal(record.data.category, 'family');
  assert.equal(record.data.legacyFolder, '가족/여행');
  assert.equal(record.data.legacyTag, '주말');
  assert.deepEqual(storage.snapshot(), before);
});
test('large raster photos go through the compressor and remote photos preserve links without requests', async () => {
  const oversized = `data:image/jpeg;base64,${'A'.repeat(700000)}`;
  const calls = [];
  const result = await readLegacy(
    storageFrom({
      life_os_photos_v2: [
        {
          id: 'large',
          url: oversized,
          date: '2024. 3. 9.',
          title: '큰 사진',
          folder: '바디체크/운동',
        },
        {
          id: 'remote',
          url: 'https://example.test/photo.jpg',
          date: '2024-03-10',
          title: '외부 사진',
        },
      ],
    }),
    {
      now,
      preparePhoto: async (source) => {
        calls.push(source);
        return png;
      },
    },
  );
  assert.deepEqual(calls, [oversized]);
  assert.equal(result.records.length, 2);
  const large = result.records.find((record) => record.title === '큰 사진');
  assert.equal(large.data.image, png);
  assert.equal(large.data.category, 'growth');
  const remote = result.records.find((record) => record.title === '외부 사진');
  assert.equal(remote.data.image, '');
  assert.equal(remote.data.legacyUrl, 'https://example.test/photo.jpg');
  assert.match(remote.body, /이전 사진 링크/);
  assert.ok(result.warnings.some((message) => message.includes('원격 사진')));
});
test('daily diary object and archive array copies merge while conflicting same-day bodies survive', async () => {
  const date = '2024-03-09';
  const result = await readLegacy(
    storageFrom({
      life_os_archived_diaries_v1: [
        { date, text: '오늘 수영했다.', mood: 'good', savedAt: '2024-03-09T13:00:00.000Z' },
        {
          id: 'imported',
          date,
          title: '별개의 과거 기록',
          content: '공부도 시작했다.',
          source: 'google_docs',
        },
        {
          id: 'db-format',
          entry_date: '2024-03-10',
          content: '다음 날 기록',
          mood: 'great',
          source_type: 'email',
        },
      ],
      [`life_os_diary_${date}`]: {
        date,
        text: '오늘 수영했다.',
        mood: '4',
        savedAt: '2024-03-09T13:00:00.000Z',
      },
    }),
    { now },
  );
  assert.equal(result.records.length, 3);
  assert.equal(result.duplicates, 1);
  const diary = result.records.find((record) => record.body === '오늘 수영했다.');
  assert.equal(diary.date, date);
  assert.equal(diary.data.mood, 4);
  assert.equal(diary.data.legacySources.length, 2);
  assert.equal(result.records.find((record) => record.body === '다음 날 기록').data.mood, 5);
  assert.equal(new Set(result.records.map((record) => record.id)).size, 3);
});
test('routine definitions preserve legacy values without inventing completion dates or HealthKit data', async () => {
  const result = await readLegacy(
    storageFrom({
      life_os_daily_routines_v2: [{ id: 7, title: '매일 수영', completed: true, streak: 99 }],
      life_os_healthkit_data_v2: { source: 'apple_healthkit', steps: 12345, swimmingMinutes: 45 },
    }),
    { now },
  );
  assert.equal(result.records.length, 1);
  const routine = result.records[0];
  assert.equal(routine.type, 'routine');
  assert.deepEqual(routine.data.completedDates, []);
  assert.equal(routine.data.legacyCompleted, true);
  assert.equal(routine.data.legacyStreak, 99);
  assert.ok(result.warnings.some((message) => message.includes('HealthKit')));
  assert.ok(result.warnings.some((message) => message.includes('완료/스트릭')));
});
test('actual health UI and database shapes retain measurements, dates, sets, and 1RM metadata', async () => {
  const result = await readLegacy(
    storageFrom({
      life_os_body_metrics_v2: [
        {
          id: 'weight-am',
          weight: 75.2,
          date: '2024-03-09',
          measuredAt: '2024-03-09 07:30',
          muscleMass: 34,
          fatRatio: 18,
          systolicBp: 120,
          diastolicBp: 80,
          notes: '아침',
        },
        { id: 'weight-pm', weight: 75.6, date: '2024-03-09', measuredAt: '2024-03-09 20:00' },
      ],
      life_os_workout_1rm_v1: [
        {
          id: 'lift-ui',
          exercise: '스쿼트',
          date: '2024-03-09',
          weight: 60,
          reps: 5,
          calculated1RM: 70,
          notes: '자세 연습',
        },
        {
          id: 'lift-db',
          exercise_name: '벤치프레스',
          logged_date: '2024-03-10',
          weight: 40,
          reps: 6,
          calculated_1rm: 48,
        },
      ],
      life_os_pullup_records_v1: [
        {
          id: 'pullup',
          date: '2024-03-09',
          sets: [8, 6, 5],
          totalReps: 19,
          maxReps: 8,
          createdAt: '2024-03-09T10:00:00.000Z',
        },
      ],
    }),
    { now },
  );
  assert.equal(result.records.length, 5);
  assert.equal(result.unsupported, 0);
  const measurement = result.records.find((record) => record.body === '아침');
  assert.equal(measurement.data.kg, 75.2);
  assert.equal(measurement.data.measuredAt, '2024-03-09 07:30');
  assert.equal(measurement.data.muscleMass, 34);
  assert.equal(measurement.data.fatRatio, 18);
  assert.equal(measurement.data.systolicBp, 120);
  assert.equal(measurement.data.diastolicBp, 80);
  const dbLift = result.records.find((record) => record.title === '벤치프레스');
  assert.equal(dbLift.date, '2024-03-10');
  assert.equal(dbLift.data.load, 40);
  assert.equal(dbLift.data.legacyCalculated1RM, 48);
  assert.equal(dbLift.data.duration, 0);
  assert.deepEqual(
    result.records.find((record) => record.data.activity === 'pullups').data.sets,
    [8, 6, 5],
  );
});
test('no-ID financial rows preserve distinct same-day transactions and payment metadata', async () => {
  const transaction = {
    amount: 11000,
    merchant: '점심',
    date: '2024-03-09',
    time: '12:30',
    paymentMethod: '체크카드',
    category: '식비',
    rawText: '승인 예시',
  };
  const storage = storageFrom({
    life_os_financial_logs_v2: [
      transaction,
      { ...transaction },
      { ...transaction, merchant: '저녁' },
    ],
  });
  const first = await readLegacy(storage, { now });
  const second = await readLegacy(storage, { now });
  assert.equal(first.records.length, 3);
  assert.equal(new Set(first.records.map((record) => record.id)).size, 3);
  assert.deepEqual(
    first.records.map((record) => record.id),
    second.records.map((record) => record.id),
  );
  assert.equal(first.records[0].data.direction, 'expense');
  assert.equal(first.records[0].data.time, '12:30');
  assert.equal(first.records[0].data.paymentMethod, '체크카드');
  assert.equal(first.records[0].body, '승인 예시');
});
test('signed old assets preserve net worth and original sign/type', async () => {
  const result = await readLegacy(
    storageFrom({
      life_os_assets_v2: [
        { id: 'cash', name: '현금', amount: 500, type: 'asset', color: 'blue' },
        { id: 'overdraft', name: '마이너스 잔액', amount: -100, type: 'asset', color: 'red' },
        { id: 'debt-credit', name: '부채 조정', amount: -50, type: 'debt', color: 'gray' },
      ],
    }),
    { now },
  );
  const total = result.records.reduce(
    (sum, record) => sum + (record.data.direction === 'asset' ? 1 : -1) * record.data.amount,
    0,
  );
  assert.equal(total, 450);
  assert.equal(result.records[1].data.legacyAmount, -100);
});
test('bad dates, unsupported images, and settings produce exact reports while all originals stay intact', async () => {
  const storage = storageFrom(
    {
      life_os_archived_diaries_v1: [{ date: '2024-02-31', text: '잘못된 날짜' }],
      life_os_photos_v2: [{ id: 'unsafe', url: 'javascript:alert(1)', date: '2024-03-09' }],
      life_os_monthly_budget_v2: 100000,
      life_os_photo_folders_v2: ['빈 폴더'],
    },
    { life_os_assets_v2: '{broken' },
  );
  const before = storage.snapshot();
  const result = await readLegacy(storage, { now });
  assert.equal(result.records.length, 0);
  assert.equal(result.unsupported, 3);
  assert.ok(result.warnings.some((message) => message.includes('일기: 유효한 기록 날짜')));
  assert.ok(result.warnings.some((message) => message.includes('사진: 지원하지 않는')));
  assert.ok(result.warnings.some((message) => message.includes('JSON 형식')));
  assert.ok(result.warnings.some((message) => message.includes('월 예산')));
  assert.deepEqual(storage.snapshot(), before);
});
test('an empty browser never imports built-in sample records', async () => {
  const result = await readLegacy(storageFrom({}), { now });
  assert.deepEqual(result.records, []);
  assert.equal(result.unsupported, 0);
});
