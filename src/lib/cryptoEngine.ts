/**
 * VaultGuard Zero-Knowledge Client Cryptography Engine
 * Operates purely in browser memory using WebCrypto API
 */

export interface EncryptedBlob {
  ciphertext: string;
  iv: string;
  salt: string;
}

export function generateRandomVaultKey(): string {
  const buffer = new Uint8Array(32);
  window.crypto.getRandomValues(buffer);
  return Array.from(buffer).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function generateSaltHex(): string {
  const buffer = new Uint8Array(16);
  window.crypto.getRandomValues(buffer);
  return Array.from(buffer).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function deriveKeyFromPassphrase(passphrase: string, saltHex: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passphraseKey = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const saltBuffer = new Uint8Array(saltHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passphraseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptVaultKeyWithPassphrase(vaultKeyHex: string, passphrase: string): Promise<EncryptedBlob> {
  const saltHex = generateSaltHex();
  const key = await deriveKeyFromPassphrase(passphrase, saltHex);

  const encoder = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(vaultKeyHex)
  );

  const ciphertext = Array.from(new Uint8Array(encryptedBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const ivHex = Array.from(iv)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return { ciphertext, iv: ivHex, salt: saltHex };
}

export async function decryptVaultKeyWithPassphrase(encryptedBlob: EncryptedBlob, passphrase: string): Promise<string> {
  const key = await deriveKeyFromPassphrase(passphrase, encryptedBlob.salt);

  const ivBuffer = new Uint8Array(encryptedBlob.iv.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
  const ciphertextBuffer = new Uint8Array(encryptedBlob.ciphertext.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBuffer },
    key,
    ciphertextBuffer
  );

  return new TextDecoder().decode(decryptedBuffer);
}

export async function checkPasswordBreachedHIBP(password: string): Promise<number> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await window.crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();

    const prefix = hashHex.substring(0, 5);
    const suffix = hashHex.substring(5);

    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
    if (!res.ok) return 0;

    const text = await res.text();
    const lines = text.split('\n');
    for (const line of lines) {
      const [lineSuffix, count] = line.trim().split(':');
      if (lineSuffix === suffix) {
        return parseInt(count, 10);
      }
    }
    return 0;
  } catch {
    return 0;
  }
}
