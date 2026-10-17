import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { storageKey } from '../src/lib/life-os/storage.ts';
import { workspaceKey } from '../src/lib/life-os/records.ts';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const firebaseSource = ts.transpileModule(
  readFileSync(new URL('../src/lib/life-os/firebase.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;

function loadFirebase(preview, complete = true) {
  let initializations = 0;
  const env = {
    NEXT_PUBLIC_LIFE_OS_PREVIEW: preview ? 'true' : 'false',
    ...(complete
      ? {
          NEXT_PUBLIC_FIREBASE_API_KEY: 'fixture-api-key',
          NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'fixture.firebaseapp.com',
          NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'fixture-project',
          NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'fixture.firebasestorage.app',
          NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '123456',
          NEXT_PUBLIC_FIREBASE_APP_ID: '1:123456:web:fixture',
        }
      : {}),
  };
  const module = { exports: {} };
  vm.runInNewContext(firebaseSource, {
    exports: module.exports,
    module,
    process: { env },
    window: {},
    require: (name) => {
      if (name === 'firebase/app')
        return {
          getApps: () => [],
          initializeApp: (config, appName) => {
            initializations++;
            return { config, name: appName };
          },
        };
      if (name === 'firebase/auth') return { getAuth: () => ({ stub: 'auth' }) };
      if (name === 'firebase/firestore') return { getFirestore: () => ({ stub: 'firestore' }) };
      throw new Error(`Unexpected Firebase test dependency: ${name}`);
    },
  });
  return { api: module.exports, initializations: () => initializations };
}

test('normal production mode keeps every existing v2 storage key unchanged', () => {
  for (const suffix of [
    'mode',
    'page',
    'workspace:demo',
    'workspace:guest',
    'workspace:uid%3Aalice',
  ]) {
    assert.equal(
      storageKey(suffix, { preview: false, basePath: '/life-os' }),
      `life-os:v2:${suffix}`,
    );
  }
});
test('preview mode separates settings and all workspace scopes from production and other previews', () => {
  for (const suffix of [
    'mode',
    'page',
    'workspace:demo',
    'workspace:guest',
    'workspace:uid%3Aalice',
  ]) {
    const preview = storageKey(suffix, { preview: true, basePath: '/life-os-preview' });
    assert.equal(preview, `life-os:preview:%2Flife-os-preview:v2:${suffix}`);
    assert.notEqual(preview, storageKey(suffix, { preview: false }));
    assert.notEqual(preview, storageKey(suffix, { preview: true, basePath: '/another-preview' }));
  }
});
test('workspaceKey applies the compiled preview namespace rather than changing record scopes', () => {
  const previousPreview = process.env.NEXT_PUBLIC_LIFE_OS_PREVIEW;
  const previousBase = process.env.NEXT_PUBLIC_BASE_PATH;
  try {
    process.env.NEXT_PUBLIC_LIFE_OS_PREVIEW = 'true';
    process.env.NEXT_PUBLIC_BASE_PATH = '/life-os-preview';
    assert.equal(workspaceKey('guest'), 'life-os:preview:%2Flife-os-preview:v2:workspace:guest');
    assert.equal(
      workspaceKey('uid:alice'),
      'life-os:preview:%2Flife-os-preview:v2:workspace:uid%3Aalice',
    );
    process.env.NEXT_PUBLIC_LIFE_OS_PREVIEW = 'false';
    assert.equal(workspaceKey('guest'), 'life-os:v2:workspace:guest');
  } finally {
    if (previousPreview === undefined) delete process.env.NEXT_PUBLIC_LIFE_OS_PREVIEW;
    else process.env.NEXT_PUBLIC_LIFE_OS_PREVIEW = previousPreview;
    if (previousBase === undefined) delete process.env.NEXT_PUBLIC_BASE_PATH;
    else process.env.NEXT_PUBLIC_BASE_PATH = previousBase;
  }
});
test('preview never initializes Firebase even when all local environment credentials exist', () => {
  const { api, initializations } = loadFirebase(true, true);
  assert.equal(api.firebaseConfigured, false);
  assert.equal(api.getLifeFirebase(), null);
  assert.equal(api.getLifeFirebase(), null);
  assert.equal(initializations(), 0);
});
test('nonpreview Firebase still requires complete configuration and initializes the named app once', () => {
  const disabled = loadFirebase(false, false);
  assert.equal(disabled.api.firebaseConfigured, false);
  assert.equal(disabled.api.getLifeFirebase(), null);
  assert.equal(disabled.initializations(), 0);
  const enabled = loadFirebase(false, true);
  assert.equal(enabled.api.firebaseConfigured, true);
  assert.equal(enabled.api.getLifeFirebase().app.name, 'life-os-v2');
  enabled.api.getLifeFirebase();
  assert.equal(enabled.initializations(), 1);
});
