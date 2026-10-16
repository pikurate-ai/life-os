/* Focused verification for data import boundaries and actual browser-compatible cryptography. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { webcrypto } = require('node:crypto');
if (!globalThis.crypto) globalThis.crypto = webcrypto;
require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const result = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  module._compile(result.outputText, filename);
};
const {
  parseCSV,
  importCredentials,
  importDiary,
  uniqueDiary,
  validDate,
} = require('../src/lib/life-os/imports.ts');
const {
  deriveVaultKey,
  encryptVault,
  decryptVault,
  randomSalt,
  generatePassword,
} = require('../src/lib/life-os/vault-crypto.ts');
const {
  vaultConfigs,
  resolveVaultConfig,
  vaultEntriesForConfig,
} = require('../src/lib/life-os/vault-model.ts');
async function main() {
  assert.deepEqual(
    parseCSV(
      '\uFEFFname,url,username,password,notes\r\n"My, bank",https://bank.test,me," a""b ","first\nsecond"\r\n',
    ),
    [
      ['name', 'url', 'username', 'password', 'notes'],
      ['My, bank', 'https://bank.test', 'me', ' a"b ', 'first\nsecond'],
    ],
  );
  assert.equal(
    importCredentials('name,url,username,password\nMail,https://mail.test,name," pass,word "')[0]
      .password,
    ' pass,word ',
  );
  assert.equal(
    importCredentials(
      'url;username;password;extra;name;grouping;fav\nhttps://x.test;user;secret;note;Site;;0',
    )[0].title,
    'Site',
  );
  assert.throws(() => parseCSV('name,password\n"open,secret'), /따옴표/);
  assert.throws(() => importCredentials('title,unknown\nhello,world'), /password/);
  const entries = importDiary(
    '# 2026-10-15\n첫째 날의 이야기\n\n## 2026-10-16 좋은 하루\n둘째 날의 이야기',
    'diary.md',
    '2026-10-01',
  );
  assert.equal(entries.length, 2);
  assert.equal(entries[0].date, '2026-10-15');
  assert.equal(entries[0].body, '첫째 날의 이야기');
  assert.equal(entries[1].title, '좋은 하루');
  assert.equal(entries[1].body, '둘째 날의 이야기');
  assert.equal(
    importDiary('2026년 10월 16일\n감사한 하루', 'docs.txt', '2026-01-01')[0].body,
    '감사한 하루',
  );
  assert.equal(
    importDiary('문서 서문\n2026-10-16\n일기 내용', 'docs.txt', '2026-01-01')[0].body,
    '문서 서문',
  );
  assert.equal(
    importDiary('plain Google Docs export', '내 일기.txt', '2026-10-16')[0].title,
    '내 일기',
  );
  assert.equal(
    importDiary(
      JSON.stringify([{ date: '2026-10-16', content: 'hello', mood: 5 }]),
      'export.json',
      '2026-10-01',
    )[0].data.mood,
    5,
  );
  assert.equal(uniqueDiary([...entries, ...entries], []).length, 2);
  assert.equal(uniqueDiary(entries, [{ ...entries[0], id: 'one', updatedAt: 'now' }]).length, 1);
  assert.equal(validDate('2026-02-30'), false);
  assert.throws(
    () => importDiary('[{"date":"2026-02-30","body":"wrong"}]', 'bad.json', '2026-01-01'),
    /날짜/,
  );
  const configA = {
    id: 'vault-a',
    type: 'vault',
    updatedAt: '2026-10-15T10:00:00.000Z',
    data: { role: 'config' },
  };
  const configB = {
    id: 'vault-b',
    type: 'vault',
    updatedAt: '2026-10-14T10:00:00.000Z',
    data: { role: 'config' },
  };
  const entryA = { id: 'entry-a', type: 'vault', data: { role: 'entry', keyId: 'vault-a' } };
  const entryB = { id: 'entry-b', type: 'vault', data: { role: 'entry', keyId: 'vault-b' } };
  const unlinked = { id: 'entry-unlinked', type: 'vault', data: { role: 'entry' } };
  const vaultRecords = [configA, configB, entryA, entryB, unlinked];
  assert.equal(resolveVaultConfig(vaultConfigs(vaultRecords), 'vault-a').id, 'vault-a');
  assert.equal(resolveVaultConfig(vaultConfigs(vaultRecords), 'vault-b').id, 'vault-b');
  assert.equal(resolveVaultConfig(vaultConfigs(vaultRecords), null).id, 'vault-b');
  assert.deepEqual(
    vaultEntriesForConfig(vaultRecords, 'vault-a', 2).map((value) => value.id),
    ['entry-a'],
  );
  assert.deepEqual(
    vaultEntriesForConfig(vaultRecords, 'vault-b', 2).map((value) => value.id),
    ['entry-b'],
  );
  assert.deepEqual(
    vaultEntriesForConfig([configA, entryA, unlinked], 'vault-a', 1).map((value) => value.id),
    ['entry-a', 'entry-unlinked'],
  );
  assert.deepEqual(vaultEntriesForConfig(vaultRecords, undefined, 0), []);
  const salt = randomSalt();
  const key = await deriveVaultKey('a long master password 123', salt);
  const secret = {
    title: 'PRIVATE TITLE',
    username: 'private@example.com',
    password: ' SECRET "pass" ',
    url: 'https://private.test',
    notes: 'very private',
  };
  const encrypted = await encryptVault(key, secret);
  assert.ok(!JSON.stringify(encrypted).includes('PRIVATE TITLE'));
  assert.deepEqual(await decryptVault(key, encrypted), secret);
  const sameKey = await deriveVaultKey('a long master password 123', salt);
  assert.deepEqual(await decryptVault(sameKey, encrypted), secret);
  const wrongKey = await deriveVaultKey('wrong master password', salt);
  await assert.rejects(() => decryptVault(wrongKey, encrypted));
  const tampered = {
    ...encrypted,
    ciphertext: `${encrypted.ciphertext[0] === 'A' ? 'B' : 'A'}${encrypted.ciphertext.slice(1)}`,
  };
  await assert.rejects(() => decryptVault(key, tampered));
  const again = await encryptVault(key, secret);
  assert.notEqual(encrypted.iv, again.iv);
  assert.notEqual(encrypted.ciphertext, again.ciphertext);
  const passwords = new Set();
  for (let i = 0; i < 100; i++) {
    const value = generatePassword();
    assert.equal(value.length, 24);
    assert.match(value, /[A-Z]/);
    assert.match(value, /[a-z]/);
    assert.match(value, /[0-9]/);
    assert.match(value, /[!@#$%&*+\-=?]/);
    passwords.add(value);
  }
  assert.equal(passwords.size, 100);
  console.log(
    'PASS: CSV quoting/Unicode/password preservation, diary split/date/dedup, AES-GCM roundtrip/wrong-key/tamper/unique-IV, secure password generation.',
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
