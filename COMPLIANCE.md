# VaultGuard Enterprise Compliance & Security Documentation

## 🔒 Security Architecture Summary

VaultGuard enforces strict **Zero-Knowledge Architecture**:
- **Key Derivation**: Client-side Argon2id / PBKDF2 with 100,000 iterations.
- **Server Password Hashing**: Server-side Argon2id (`timeCost: 2, memoryCost: 19MiB, parallelism: 1`).
- **Data Encryption**: AES-256-GCM authenticated encryption.
- **Session Protection**: Redis session store with `HttpOnly`, `SameSite=Lax`, rolling 15-min expiry, and 8-hour absolute timeout.
- **Breach Prevention**: HaveIBeenPwned k-anonymity API (SHA-1 5-character prefix matching).

---

## 📜 Privacy Policy Template

1. **Information Collection**: VaultGuard collects user email addresses and encrypted zero-knowledge vault blobs. Plaintext master passwords and decrypted vault items are never transmitted or stored on servers.
2. **Use of Data**: Encrypted vault data is stored solely for user retrieval.
3. **Data Retention & Account Deletion**: Users may permanently delete their vault at any time upon providing master password verification.

---

## 🏛️ SOC 2 & ISO 27001 Readiness Checklist

- [x] Zero-Knowledge Encryption at Rest (AES-256-GCM).
- [x] TLS 1.3 Transport Layer Protection.
- [x] Password Hashing with Argon2id.
- [x] Structured Audit Logging with Pino.
- [x] Automated CI/CD Security Audit & Vulnerability Scanning.
- [x] Multi-Stage Docker Containerization.
