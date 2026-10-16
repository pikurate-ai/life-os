export const VAULT_ITERATIONS = 600_000;
export interface EncryptedValue {
  iv: string;
  ciphertext: string;
}
const encoder = new TextEncoder();
const encode = (bytes: Uint8Array): string =>
  btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''));
const decode = (value: string): Uint8Array<ArrayBuffer> =>
  Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
export function randomSalt(): string {
  return encode(crypto.getRandomValues(new Uint8Array(16)));
}
export async function deriveVaultKey(
  password: string,
  salt: string,
  iterations = VAULT_ITERATIONS,
): Promise<CryptoKey> {
  if (!crypto?.subtle) throw new Error('암호금고는 HTTPS 또는 localhost에서 사용할 수 있습니다.');
  if (iterations !== VAULT_ITERATIONS) throw new Error('지원하지 않는 암호화 버전입니다.');
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: decode(salt), iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}
export async function encryptVault(key: CryptoKey, value: unknown): Promise<EncryptedValue> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: encoder.encode('life-os-vault-v2') },
    key,
    encoder.encode(JSON.stringify(value)),
  );
  return { iv: encode(iv), ciphertext: encode(new Uint8Array(cipher)) };
}
export async function decryptVault<T>(key: CryptoKey, value: EncryptedValue): Promise<T> {
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: decode(value.iv), additionalData: encoder.encode('life-os-vault-v2') },
    key,
    decode(value.ciphertext),
  );
  return JSON.parse(new TextDecoder().decode(plain)) as T;
}
export function generatePassword(length = 24): string {
  const groups = [
    'ABCDEFGHJKLMNPQRSTUVWXYZ',
    'abcdefghijkmnopqrstuvwxyz',
    '23456789',
    '!@#$%&*+-=?',
  ];
  const alphabet = groups.join('');
  const randomIndex = (max: number): number => {
    const limit = 256 - (256 % max);
    const bytes = new Uint8Array(1);
    do {
      crypto.getRandomValues(bytes);
    } while (bytes[0] >= limit);
    return bytes[0] % max;
  };
  const chars = groups.map((group) => group[randomIndex(group.length)]);
  while (chars.length < length) chars.push(alphabet[randomIndex(alphabet.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}
