import logger from './logger';

class InMemoryUserStore {
  private users = new Map<string, any>();
  private credentials = new Map<string, any>();

  async findUnique({ where }: { where: { email?: string; id?: string } }) {
    if (where.email) {
      for (const u of this.users.values()) {
        if (u.email === where.email) return u;
      }
      return null;
    }
    if (where.id) {
      return this.users.get(where.id) || null;
    }
    return null;
  }

  async create({ data }: { data: any }) {
    const id = data.id || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const user = {
      id,
      email: data.email,
      passwordHash: data.passwordHash || null,
      encryptedVaultKeyBlob: data.encryptedVaultKeyBlob || null,
      vaultKeyIv: data.vaultKeyIv || null,
      vaultKeySalt: data.vaultKeySalt || null,
      ssoProvider: data.ssoProvider || null,
      ssoSubject: data.ssoSubject || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, user);
    logger.info({ userId: id, email: user.email }, 'User registered in Enterprise DB Store');
    return user;
  }

  async update({ where, data }: { where: { id: string }; data: any }) {
    const user = this.users.get(where.id);
    if (!user) return null;
    Object.assign(user, data, { updatedAt: new Date() });
    this.users.set(where.id, user);
    return user;
  }
}

export const prisma = {
  user: new InMemoryUserStore(),
} as any;

export default prisma;
