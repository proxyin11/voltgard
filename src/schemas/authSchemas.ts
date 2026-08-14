import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  masterPassword: z.string().min(8, 'Master password must be at least 8 characters').optional(),
  encryptedVaultKeyBlob: z.string().optional(),
  vaultKeyIv: z.string().optional(),
  vaultKeySalt: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  masterPassword: z.string().optional(),
});

export const ssoAuthSchema = z.object({
  email: z.string().email('Invalid email address'),
  ssoProvider: z.enum(['google', 'apple']),
  ssoSubject: z.string().optional(),
  encryptedVaultKeyBlob: z.string().optional(),
  vaultKeyIv: z.string().optional(),
  vaultKeySalt: z.string().optional(),
});

export const credentialSchema = z.object({
  siteName: z.string().min(1, 'Site name is required'),
  url: z.string().optional(),
  username: z.string().optional(),
  encryptedPassword: z.string().min(1, 'Encrypted password is required'),
  iv: z.string().min(1, 'Initialization vector is required'),
  notes: z.string().optional(),
  categoryId: z.string().optional(),
});
