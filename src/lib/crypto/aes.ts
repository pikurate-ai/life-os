/**
 * Web Crypto API를 활용한 Zero-Knowledge AES-256-GCM 암호화/복호화 모듈
 * Master Password 기반 PBKDF2 키 파생 (100,000 iterations)
 */

export interface EncryptedData {
  ciphertext: string; // Base64
  iv: string;         // Base64 (12 bytes)
  salt: string;       // Base64 (16 bytes)
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function deriveKey(masterPassword: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(masterPassword),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as unknown as BufferSource,
      iterations: 100000,
      hash: "SHA-256",
    },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptData(plainText: string, masterPassword: string): Promise<EncryptedData> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(masterPassword, salt);

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    key,
    enc.encode(plainText)
  );

  return {
    ciphertext: bufferToBase64(encryptedBuffer),
    iv: bufferToBase64(iv.buffer),
    salt: bufferToBase64(salt.buffer),
  };
}

export async function decryptData(data: EncryptedData, masterPassword: string): Promise<string> {
  const salt = new Uint8Array(base64ToBuffer(data.salt));
  const iv = new Uint8Array(base64ToBuffer(data.iv));
  const ciphertext = base64ToBuffer(data.ciphertext);
  const key = await deriveKey(masterPassword, salt);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    key,
    ciphertext
  );

  const dec = new TextDecoder();
  return dec.decode(decryptedBuffer);
}
