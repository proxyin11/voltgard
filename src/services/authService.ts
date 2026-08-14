import { prisma } from '../utils/prisma';
import { hashPasswordArgon2, verifyPasswordArgon2 } from '../utils/cryptoEngine';
import { AppError } from '../utils/errors';
import { RegisterDTO, LoginDTO, SSOAuthDTO } from '../types';

export class AuthService {
  async register(data: RegisterDTO) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new AppError('An account with this email already exists.', 409);
    }

    const passwordHash = data.masterPassword ? await hashPasswordArgon2(data.masterPassword) : null;

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        encryptedVaultKeyBlob: data.encryptedVaultKeyBlob,
        vaultKeyIv: data.vaultKeyIv,
        vaultKeySalt: data.vaultKeySalt,
      },
    });

    return { id: user.id, email: user.email };
  }

  async login(data: LoginDTO) {
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user || !user.passwordHash) {
      throw new AppError('Invalid email or master password.', 401);
    }

    const isValid = await verifyPasswordArgon2(user.passwordHash, data.masterPassword || '');
    if (!isValid) {
      throw new AppError('Invalid email or master password.', 401);
    }

    return {
      id: user.id,
      email: user.email,
      encryptedVaultKeyBlob: user.encryptedVaultKeyBlob,
      vaultKeyIv: user.vaultKeyIv,
      vaultKeySalt: user.vaultKeySalt,
    };
  }

  async authenticateSSO(data: SSOAuthDTO) {
    let user = await prisma.user.findUnique({ where: { email: data.email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: data.email,
          ssoProvider: data.ssoProvider,
          ssoSubject: data.ssoSubject || data.email,
          encryptedVaultKeyBlob: data.encryptedVaultKeyBlob,
          vaultKeyIv: data.vaultKeyIv,
          vaultKeySalt: data.vaultKeySalt,
        },
      });
    } else if (data.encryptedVaultKeyBlob && !user.encryptedVaultKeyBlob) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          encryptedVaultKeyBlob: data.encryptedVaultKeyBlob,
          vaultKeyIv: data.vaultKeyIv,
          vaultKeySalt: data.vaultKeySalt,
        },
      });
    }

    return {
      id: user.id,
      email: user.email,
      encryptedVaultKeyBlob: user.encryptedVaultKeyBlob,
      vaultKeyIv: user.vaultKeyIv,
      vaultKeySalt: user.vaultKeySalt,
    };
  }
}

export const authService = new AuthService();
