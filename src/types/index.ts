export interface UserSessionData {
  userId: string;
  email: string;
  vaultKey?: string;
  lastActivity: number;
}

export interface RegisterDTO {
  email: string;
  masterPassword?: string;
  encryptedVaultKeyBlob?: string;
  vaultKeyIv?: string;
  vaultKeySalt?: string;
}

export interface LoginDTO {
  email: string;
  masterPassword?: string;
}

export interface SSOAuthDTO {
  email: string;
  ssoProvider: 'google' | 'apple';
  ssoSubject?: string;
  encryptedVaultKeyBlob?: string;
  vaultKeyIv?: string;
  vaultKeySalt?: string;
}

export interface CredentialDTO {
  siteName: string;
  url?: string;
  username?: string;
  encryptedPassword: string;
  iv: string;
  notes?: string;
  categoryId?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}
