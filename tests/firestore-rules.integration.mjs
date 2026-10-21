/** Official rules SDK + local demo emulator only. Never loads .env.local,
 * production app configuration, real users, or an existing Firestore project.
 * Run with npm run test:rules. This file intentionally avoids *.test.mjs. */
import test, { before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';

const PROJECT = 'demo-life-os-qa';
const HOST = '127.0.0.1';
const PORT = 8085;
// Fail closed even when launched directly or from a shell with real project env.
assert(
  process.env.FIRESTORE_EMULATOR_HOST === `${HOST}:${PORT}`,
  'Use npm run test:rules: only the dedicated loopback Firestore emulator is permitted.',
);
for (const name of ['GCLOUD_PROJECT', 'GOOGLE_CLOUD_PROJECT']) {
  if (process.env[name])
    assert(process.env[name] === PROJECT, 'Rules tests refuse a non-demo project.');
}
if (process.env.FIREBASE_CONFIG) {
  let config;
  try {
    config = JSON.parse(process.env.FIREBASE_CONFIG);
  } catch {
    assert.fail('Rules tests refuse an unreadable Firebase configuration.');
  }
  assert(
    config && typeof config === 'object' && !Array.isArray(config),
    'Rules tests refuse an invalid Firebase configuration.',
  );
  if (config.projectId)
    assert(config.projectId === PROJECT, 'Rules tests refuse a non-demo Firebase configuration.');
}

let environment;
const ownerUid = 'qa-owner';
const otherUid = 'qa-other';
const stamp = '2026-10-16T00:00:00.000Z';
function fakeRecord(id = 'qa-record', patch = {}) {
  return {
    id,
    type: 'diary',
    title: '합성 권한 테스트',
    body: '실제 사람의 기록이 아닙니다.',
    date: '2026-10-16',
    updatedAt: stamp,
    data: { mood: 4 },
    ...patch,
  };
}
function ownerDb() {
  return environment.authenticatedContext(ownerUid).firestore();
}
function otherDb() {
  return environment.authenticatedContext(otherUid).firestore();
}
function anonymousDb() {
  return environment.unauthenticatedContext().firestore();
}
function recordRef(db, uid = ownerUid, id = 'qa-record') {
  return doc(db, 'users', uid, 'records', id);
}
async function seed(record = fakeRecord()) {
  await environment.withSecurityRulesDisabled((context) =>
    setDoc(recordRef(context.firestore(), ownerUid, record.id), record),
  );
}

before(async () => {
  environment = await initializeTestEnvironment({
    projectId: PROJECT,
    firestore: {
      host: HOST,
      port: PORT,
      rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'),
    },
  });
});
beforeEach(async () => {
  await environment.clearFirestore();
});
after(async () => {
  await environment?.cleanup();
});

test('owner can create, read, query and update only their UID-scoped records', async () => {
  const db = ownerDb();
  await assertSucceeds(setDoc(recordRef(db), fakeRecord()));
  const snapshot = await assertSucceeds(getDoc(recordRef(db)));
  assert.equal(snapshot.data().title, '합성 권한 테스트');
  const records = await assertSucceeds(getDocs(collection(db, 'users', ownerUid, 'records')));
  assert.equal(records.size, 1);
  await assertSucceeds(
    updateDoc(recordRef(db), { body: '수정한 합성 기록', updatedAt: '2026-10-16T01:00:00.000Z' }),
  );
});

test('a different authenticated UID cannot read, query, create or update the owner records', async () => {
  await seed();
  const db = otherDb();
  await assertFails(getDoc(recordRef(db)));
  await assertFails(getDocs(collection(db, 'users', ownerUid, 'records')));
  await assertFails(setDoc(recordRef(db, ownerUid, 'qa-intrusion'), fakeRecord('qa-intrusion')));
  await assertFails(
    updateDoc(recordRef(db), { body: 'forbidden', updatedAt: '2026-10-16T02:00:00.000Z' }),
  );
  await assertSucceeds(setDoc(recordRef(db, otherUid), fakeRecord()));
});

test('unauthenticated clients cannot read, query, create or update any account records', async () => {
  await seed();
  const db = anonymousDb();
  await assertFails(getDoc(recordRef(db)));
  await assertFails(getDocs(collection(db, 'users', ownerUid, 'records')));
  await assertFails(setDoc(recordRef(db, ownerUid, 'qa-anonymous'), fakeRecord('qa-anonymous')));
  await assertFails(updateDoc(recordRef(db), { body: 'forbidden' }));
});

test('legacy email collections and unspecified user paths are denied for every auth state', async () => {
  const legacyCollections = [
    'users_general_memos',
    'users_essential_info',
    'users_financial_logs',
    'users_assets',
    'users_encrypted_vault',
    'users_workout_1rm',
    'users_health_metrics',
    'users_archived_diaries',
    'users_life_photos',
    'userData',
  ];
  for (const db of [ownerDb(), otherDb(), anonymousDb()]) {
    for (const name of legacyCollections) {
      const target = doc(db, name, 'usr_synthetic-fixture');
      await assertFails(getDoc(target));
      await assertFails(setDoc(target, { fixture: true }));
    }
    await assertFails(getDoc(doc(db, 'users', ownerUid)));
    await assertFails(setDoc(doc(db, 'users', ownerUid), { fixture: true }));
  }
});

test('encrypted vault configs and entries are accepted without plaintext labels or credentials', async () => {
  const db = ownerDb();
  const config = fakeRecord('qa-vault-config', {
    type: 'vault',
    title: '암호화된 금고 설정',
    body: '',
    data: {
      role: 'config',
      version: 2,
      iv: 'synthetic-iv',
      ciphertext: 'abcdefghijklmnopabcdefghijklmnop',
      salt: 'synthetic-salt',
      iterations: 600000,
    },
  });
  const entry = fakeRecord('qa-vault-entry', {
    type: 'vault',
    title: '암호화된 항목',
    body: '',
    data: {
      role: 'entry',
      version: 2,
      iv: 'synthetic-iv',
      ciphertext: 'qrstuvwxyzabcdefqrstuvwxyzabcdef',
      keyId: config.id,
    },
  });
  await assertSucceeds(setDoc(recordRef(db, ownerUid, config.id), config));
  await assertSucceeds(setDoc(recordRef(db, ownerUid, entry.id), entry));
  await assertSucceeds(getDoc(recordRef(db, ownerUid, entry.id)));
  await assertFails(getDoc(recordRef(otherDb(), ownerUid, entry.id)));
});

test('plaintext vault body, password, username, URL, or private title is rejected', async () => {
  const db = ownerDb();
  const base = fakeRecord('qa-vault', {
    type: 'vault',
    title: '암호화된 항목',
    body: '',
    data: {
      role: 'entry',
      version: 2,
      iv: 'synthetic-iv',
      ciphertext: 'abcdefghijklmnopabcdefghijklmnop',
    },
  });
  const invalid = [
    { ...base, body: 'synthetic plaintext password' },
    ...['password', 'masterPassword', 'username', 'url', 'notes'].map((key) => ({
      ...base,
      data: { ...base.data, [key]: 'synthetic plaintext metadata' },
    })),
    { ...base, title: 'private service title' },
    { ...base, data: { ...base.data, ciphertext: 'short' } },
  ];
  for (const record of invalid)
    await assertFails(setDoc(recordRef(db, ownerUid, record.id), record));
});

test('record ID mismatch, reserved ID, unknown fields and type changes are rejected', async () => {
  const db = ownerDb();
  await assertFails(setDoc(recordRef(db), fakeRecord('different-id')));
  // Firestore rejects double-underscore IDs before evaluating rules.
  await assert.rejects(setDoc(recordRef(db, ownerUid, '__proto__'), fakeRecord('__proto__')), {
    code: 'invalid-argument',
  });
  // This ID is valid for Firestore itself and must be denied by our rule.
  await assertFails(setDoc(recordRef(db, ownerUid, 'constructor'), fakeRecord('constructor')));
  await assertFails(
    setDoc(recordRef(db), { ...fakeRecord(), privateUnexpectedField: 'synthetic' }),
  );
  await assertSucceeds(setDoc(recordRef(db), fakeRecord()));
  await assertFails(
    updateDoc(recordRef(db), { type: 'memory', updatedAt: '2026-10-16T02:00:00.000Z' }),
  );
});

test('deletion is an owner tombstone with erased content; hard deletes stay denied', async () => {
  await seed();
  const db = ownerDb();
  const deletedAt = '2026-10-16T03:00:00.000Z';
  const tombstone = fakeRecord('qa-record', {
    title: '',
    body: '',
    data: {},
    updatedAt: deletedAt,
    deletedAt,
  });
  await assertFails(setDoc(recordRef(otherDb()), tombstone));
  await assertFails(setDoc(recordRef(anonymousDb()), tombstone));
  await assertFails(setDoc(recordRef(db), { ...tombstone, body: 'must be erased' }));
  await assertFails(setDoc(recordRef(db), { ...tombstone, deletedAt: stamp }));
  await assertSucceeds(setDoc(recordRef(db), tombstone));
  const snapshot = await assertSucceeds(getDoc(recordRef(db)));
  assert.equal(snapshot.data().deletedAt, deletedAt);
  assert.equal(snapshot.data().body, '');
  assert.deepEqual(snapshot.data().data, {});
  await assertFails(deleteDoc(recordRef(db)));
  await assertFails(deleteDoc(recordRef(otherDb())));
  await assertFails(deleteDoc(recordRef(anonymousDb())));
});

test('an older offline revision cannot overwrite a newer record or resurrect a tombstone', async () => {
  const db = ownerDb();
  await seed(
    fakeRecord('qa-record', { updatedAt: '2026-10-16T03:00:00.000Z', body: 'newer fixture' }),
  );
  await assertFails(setDoc(recordRef(db), fakeRecord()));
  const deletedAt = '2026-10-16T04:00:00.000Z';
  await assertSucceeds(
    setDoc(
      recordRef(db),
      fakeRecord('qa-record', { title: '', body: '', data: {}, updatedAt: deletedAt, deletedAt }),
    ),
  );
  await assertFails(
    setDoc(recordRef(db), fakeRecord('qa-record', { updatedAt: '2026-10-16T02:00:00.000Z' })),
  );
});
