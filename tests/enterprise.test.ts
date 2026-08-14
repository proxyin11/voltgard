import { describe, test, expect } from 'vitest';
import { hashPasswordArgon2, verifyPasswordArgon2 } from '../src/utils/cryptoEngine';
import { registerSchema, loginSchema } from '../src/schemas/authSchemas';

describe('Enterprise Security & Crypto Suite', () => {
  describe('Argon2id Hashing', () => {
    test('hashes and verifies master password with Argon2id', async () => {
      const password = 'EnterprisePassword123!';
      const hash = await hashPasswordArgon2(password);

      expect(hash).toContain('$argon2id$');

      const isValid = await verifyPasswordArgon2(hash, password);
      expect(isValid).toBe(true);

      const isInvalid = await verifyPasswordArgon2(hash, 'WrongPassword!');
      expect(isInvalid).toBe(false);
    });
  });

  describe('Zod Validation Schemas', () => {
    test('validates valid registration payload', () => {
      const payload = {
        email: 'admin@vaultguard.io',
        masterPassword: 'SecurePassword123!',
      };

      const result = registerSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    test('rejects short master password', () => {
      const payload = {
        email: 'admin@vaultguard.io',
        masterPassword: '123',
      };

      const result = registerSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });
});
