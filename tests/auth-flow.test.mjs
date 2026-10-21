import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GOOGLE_REDIRECT_ATTEMPT_KEY,
  completeGoogleRedirect,
  consumeRedirectAttempt,
  getGoogleSignInPlan,
  markRedirectAttempt,
} from '../src/lib/life-os/auth-flow.ts';

const authDomain = 'fixture.firebaseapp.com';
const hostedOrigin = `https://${authDomain}`;
const hostedSettings = `${hostedOrigin}/?page=settings`;

function plan(overrides = {}) {
  return getGoogleSignInPlan({
    origin: hostedOrigin,
    authDomain,
    embedded: false,
    mobile: false,
    ...overrides,
  });
}

function memoryStorage(initial) {
  const values = new Map(initial === undefined ? [] : [[GOOGLE_REDIRECT_ATTEMPT_KEY, initial]]);
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

test('mobile redirects only when the top-level app and Firebase helper share an HTTPS origin', () => {
  assert.deepEqual(plan({ mobile: true }), { method: 'redirect' });
  assert.deepEqual(plan(), { method: 'popup' });
  assert.deepEqual(plan({ authDomain: 'FIXTURE.firebaseapp.com', mobile: true }), {
    method: 'redirect',
  });
});

test('both desktop and mobile leave GitHub Pages for the configured same-origin login app', () => {
  for (const mobile of [false, true]) {
    assert.deepEqual(plan({ origin: 'https://fixture.github.io', mobile }), {
      method: 'external',
      url: hostedSettings,
    });
  }
  assert.deepEqual(plan({ origin: `http://${authDomain}`, mobile: true }), {
    method: 'external',
    url: hostedSettings,
  });
  assert.deepEqual(plan({ origin: 'https://localhost.attacker.example', mobile: true }), {
    method: 'external',
    url: hostedSettings,
  });
});

test('review frames always open the real app outside the frame, even on the canonical host', () => {
  for (const origin of [hostedOrigin, 'https://fixture.github.io']) {
    for (const mobile of [false, true]) {
      assert.deepEqual(plan({ origin, embedded: true, mobile }), {
        method: 'external',
        url: hostedSettings,
      });
    }
  }
});

test('loopback development keeps popup auth and frames open the matching local base path', () => {
  for (const origin of ['http://localhost:3000', 'http://127.0.0.1:3100', 'http://[::1]:3000']) {
    assert.deepEqual(plan({ origin, mobile: true }), { method: 'popup' });
    assert.deepEqual(plan({ origin, embedded: true, basePath: '/life-os-preview/' }), {
      method: 'external',
      url: `${origin}/life-os-preview/?page=settings`,
    });
    assert.deepEqual(plan({ origin, embedded: true }), {
      method: 'external',
      url: `${origin}/?page=settings`,
    });
  }
});

test('configured auth domains reject URLs, credentials, ports and path-based redirect injection', () => {
  for (const invalid of [
    '',
    ' https://fixture.firebaseapp.com',
    'https://fixture.firebaseapp.com',
    'http://fixture.firebaseapp.com',
    'fixture.firebaseapp.com/',
    'fixture.firebaseapp.com/attacker',
    'fixture.firebaseapp.com:443',
    'fixture.firebaseapp.com@attacker.example',
    'fixture.firebaseapp.com?next=attacker',
    'fixture.firebaseapp.com#attacker',
    '//attacker.example',
    'fixture\\attacker.example',
    'fixture..firebaseapp.com',
    'fixture.firebaseapp.com.',
    '-fixture.firebaseapp.com',
    'fixture-.firebaseapp.com',
    'fixture\n.firebaseapp.com',
    'a'.repeat(64) + '.firebaseapp.com',
    '2130706433',
    '999.999.999.999',
  ]) {
    assert.throws(() => plan({ authDomain: invalid }), { code: 'auth/invalid-auth-domain' });
  }
});

test('embedded local destinations reject cross-origin paths, dot segments and query injection', () => {
  for (const basePath of [
    '//attacker.example',
    'https://attacker.example',
    '/../../attacker',
    '/%2f%2fattacker.example',
    '/life-os?next=attacker',
    '/life-os#attacker',
    '/life-os\\attacker',
  ])
    assert.throws(() => plan({ origin: 'http://localhost:3000', embedded: true, basePath }));
  for (const origin of [
    'javascript:alert(1)',
    `${hostedOrigin}/path`,
    'https://user:pass@fixture.example',
  ])
    assert.throws(() => plan({ origin }));
});

test('a redirect marker contains only its timestamp and is consumed exactly once', () => {
  const storage = memoryStorage();
  markRedirectAttempt(storage, 100_000);
  assert.equal(storage.values.size, 1);
  assert.deepEqual(JSON.parse(storage.getItem(GOOGLE_REDIRECT_ATTEMPT_KEY)), {
    startedAt: 100_000,
  });
  assert.equal(consumeRedirectAttempt(storage, 100_001), true);
  assert.equal(storage.values.size, 0);
  assert.equal(consumeRedirectAttempt(storage, 100_001), false);
});

test('redirect attempts accept the full 15-minute window and reject stale or future timestamps', () => {
  for (const age of [0, 1, 15 * 60 * 1000]) {
    const storage = memoryStorage();
    markRedirectAttempt(storage, 1_000_000);
    assert.equal(consumeRedirectAttempt(storage, 1_000_000 + age), true);
  }
  for (const age of [-1, 15 * 60 * 1000 + 1]) {
    const storage = memoryStorage();
    markRedirectAttempt(storage, 1_000_000);
    assert.equal(consumeRedirectAttempt(storage, 1_000_000 + age), false);
    assert.equal(storage.values.size, 0);
  }
});

test('malformed redirect metadata is cleared without retaining arbitrary payloads', () => {
  for (const raw of [
    '',
    'not-json',
    'null',
    '[]',
    '{}',
    '{"startedAt":"100000"}',
    '{"startedAt":-1}',
    '{"startedAt":100000.5}',
    '{"startedAt":100000,"token":"fictional-do-not-retain"}',
  ]) {
    const storage = memoryStorage(raw);
    assert.equal(consumeRedirectAttempt(storage, 100_000), false);
    assert.equal(storage.values.size, 0);
  }
});

test('storage failures remain visible and invalid clocks never produce a redirect marker', () => {
  const failure = new Error('Storage is unavailable');
  assert.throws(
    () =>
      markRedirectAttempt(
        {
          setItem: () => {
            throw failure;
          },
        },
        100_000,
      ),
    (error) => error === failure,
  );
  const storage = memoryStorage();
  for (const now of [NaN, Infinity, -1, 1.5])
    assert.throws(() => markRedirectAttempt(storage, now));
  assert.equal(storage.values.size, 0);
});

test('an attempted redirect with no result and no restored account exposes a recovery error', async () => {
  await assert.rejects(
    completeGoogleRedirect(Promise.resolve(null), () => false, true),
    {
      code: 'auth/redirect-result-missing',
    },
  );
});

test('a normal initial visit or an already restored account does not report a false failure', async () => {
  assert.equal(await completeGoogleRedirect(Promise.resolve(null), () => false, false), null);
  assert.equal(await completeGoogleRedirect(Promise.resolve(null), () => true, true), null);
  const credential = { user: { uid: 'synthetic-user' } };
  assert.equal(
    await completeGoogleRedirect(Promise.resolve(credential), () => false, true),
    credential,
  );
});

test('Firebase redirect errors propagate unchanged instead of being mistaken for a missing result', async () => {
  const failure = Object.assign(new Error('Synthetic provider error'), {
    code: 'auth/unauthorized-domain',
  });
  await assert.rejects(
    completeGoogleRedirect(Promise.reject(failure), () => false, true),
    (error) => error === failure,
  );
});
