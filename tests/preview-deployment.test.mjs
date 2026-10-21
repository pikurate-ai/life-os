import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const require = createRequire(import.meta.url);
const { resolveBuildConfig } = require('../scripts/build-config.cjs');

test('preview paths and install metadata share one explicit base without changing production defaults', () => {
  assert.equal(resolveBuildConfig({}).scope, '/');
  assert.equal(resolveBuildConfig({ GITHUB_PAGES: 'true' }).scope, '/life-os/');
  const preview = resolveBuildConfig({
    LIFE_OS_BASE_PATH: '/life-os-preview/',
    LIFE_OS_PREVIEW: 'true',
  });
  assert.equal(preview.basePath, '/life-os-preview');
  assert.equal(preview.scope, '/life-os-preview/');
  assert.equal(preview.preview, true);
  assert.equal(preview.appName, 'Life OS');
  for (const path of ['https://example.test', '//other-site', '/life-os/../production']) {
    assert.throws(() => resolveBuildConfig({ LIFE_OS_BASE_PATH: path }));
  }
});

function worker(root = '/life-os-preview/') {
  const handlers = {},
    deleted = [],
    opened = [];
  const prefix = `life-os-shell:${encodeURIComponent(root)}:`;
  const cached = new Response('preview shell');
  runInNewContext(readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), {
    URL,
    Response,
    Promise,
    fetch: async () => {
      throw new Error('offline');
    },
    self: {
      location: {
        href: `https://example.test${root}sw.js`,
        origin: 'https://example.test',
      },
      addEventListener: (type, fn) => {
        handlers[type] = fn;
      },
      skipWaiting() {},
      clients: { claim: async () => {} },
    },
    caches: {
      keys: async () => [
        `${prefix}old`,
        `${prefix}v2.0.2`,
        'life-os-shell:%2Flife-os%2F:v2.0.0',
        'another-app',
      ],
      delete: async (key) => {
        deleted.push(key);
      },
      open: async (name) => {
        opened.push(name);
        return { match: async (key) => (key === root ? cached : undefined) };
      },
    },
  });
  return { handlers, deleted, opened, prefix };
}

test('activating the preview service worker never deletes production or another app caches', async () => {
  const { handlers, deleted, prefix } = worker();
  let done;
  handlers.activate({
    waitUntil: (value) => {
      done = value;
    },
  });
  await done;
  assert.deepEqual(deleted, [`${prefix}old`]);
});

test('offline preview navigation reads only its own cache and leaves other URL paths untouched', async () => {
  const { handlers, opened, prefix } = worker();
  let response;
  handlers.fetch({
    request: { method: 'GET', url: 'https://example.test/life-os/', mode: 'navigate' },
    respondWith: () => {
      throw new Error('intercepted production');
    },
  });
  handlers.fetch({
    request: { method: 'GET', url: 'https://example.test/life-os-preview/', mode: 'navigate' },
    respondWith: (value) => {
      response = value;
    },
  });
  assert.equal(await (await response).text(), 'preview shell');
  assert.deepEqual(opened, [`${prefix}v2.0.2`]);
});

test('Firebase reserved auth helpers are never intercepted or replaced by the offline app shell', () => {
  const { handlers } = worker('/');
  for (const route of ['/__/auth/handler', '/__/auth/iframe', '/__/firebase/init.json']) {
    handlers.fetch({
      request: { method: 'GET', url: `https://example.test${route}`, mode: 'navigate' },
      respondWith: () => assert.fail(`intercepted authentication endpoint ${route}`),
    });
  }
});
