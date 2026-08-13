require('./setup');
const { generateSalt, deriveKey, encrypt, decrypt } = require('../src/crypto');

describe('Crypto Module', () => {
  test('generateSalt returns hex string of correct length', () => {
    const salt = generateSalt();
    expect(typeof salt).toBe('string');
    expect(salt.length).toBe(64); // 32 bytes = 64 hex chars
  });

  test('deriveKey returns 32-byte buffer', () => {
    const salt = generateSalt();
    const key = deriveKey('my-master-password', salt);
    expect(Buffer.isBuffer(key)).toBe(true);
    expect(key.length).toBe(32);
  });

  test('encrypt returns encrypted, iv, and authTag', () => {
    const salt = generateSalt();
    const key = deriveKey('password', salt);
    const result = encrypt('hello world', key);
    
    expect(result).toHaveProperty('encrypted');
    expect(result).toHaveProperty('iv');
    expect(result).toHaveProperty('authTag');
    expect(result.encrypted.length).toBeGreaterThan(0);
    expect(result.iv.length).toBe(32); // 16 bytes = 32 hex chars
    expect(result.authTag.length).toBe(32); // 16 bytes
  });

  test('decrypt recovers original plaintext', () => {
    const salt = generateSalt();
    const key = deriveKey('password', salt);
    const plaintext = 'my secret password!@#$%^&*()';
    
    const { encrypted, iv, authTag } = encrypt(plaintext, key);
    const decrypted = decrypt(encrypted, iv, authTag, key);
    
    expect(decrypted).toBe(plaintext);
  });

  test('different keys produce different ciphertext', () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt();
    const key1 = deriveKey('password1', salt1);
    const key2 = deriveKey('password2', salt2);
    
    const result1 = encrypt('same text', key1);
    const result2 = encrypt('same text', key2);
    
    expect(result1.encrypted).not.toBe(result2.encrypted);
  });

  test('tampered ciphertext throws error', () => {
    const salt = generateSalt();
    const key = deriveKey('password', salt);
    const { encrypted, iv, authTag } = encrypt('test', key);
    
    // Tamper with encrypted data
    const tampered = 'ff' + encrypted.slice(2);
    
    expect(() => {
      decrypt(tampered, iv, authTag, key);
    }).toThrow();
  });

  test('wrong key fails to decrypt', () => {
    const salt = generateSalt();
    const key1 = deriveKey('password1', salt);
    const key2 = deriveKey('password2', salt);
    
    const { encrypted, iv, authTag } = encrypt('secret', key1);
    
    expect(() => {
      decrypt(encrypted, iv, authTag, key2);
    }).toThrow();
  });

  test('empty string can be encrypted and decrypted', () => {
    const salt = generateSalt();
    const key = deriveKey('password', salt);
    
    const { encrypted, iv, authTag } = encrypt('', key);
    const decrypted = decrypt(encrypted, iv, authTag, key);
    
    expect(decrypted).toBe('');
  });

  test('unicode text can be encrypted and decrypted', () => {
    const salt = generateSalt();
    const key = deriveKey('password', salt);
    const plaintext = '🔐 密码管理器 パスワード مدير';
    
    const { encrypted, iv, authTag } = encrypt(plaintext, key);
    const decrypted = decrypt(encrypted, iv, authTag, key);
    
    expect(decrypted).toBe(plaintext);
  });
});
