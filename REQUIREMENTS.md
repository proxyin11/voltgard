# Requirements — VaultGuard Password Manager

## Functional Requirements

| ID | Description | Category | Priority |
|----|-------------|----------|----------|
| FR-01 | User registration with email and master password | Auth | P0 |
| FR-02 | User login with email and master password | Auth | P0 |
| FR-03 | User logout | Auth | P0 |
| FR-04 | Session timeout / auto-logout after 15 min inactivity | Auth | P0 |
| FR-05 | Create credential entries (site name, URL, username, password, notes) | Core | P0 |
| FR-06 | View/list all stored credentials | Core | P0 |
| FR-07 | Edit existing credentials | Core | P0 |
| FR-08 | Delete credentials | Core | P0 |
| FR-09 | Search/filter credentials by site name, username, URL | Core | P1 |
| FR-10 | Generate random secure passwords (configurable length, character sets) | Core | P1 |
| FR-11 | Copy password/username to clipboard with one click | UX | P1 |
| FR-12 | Organize credentials into categories/folders | Organization | P2 |
| FR-13 | Password strength indicator when creating/editing | UX | P2 |
| FR-14 | Show/hide password toggle | UX | P1 |
| FR-15 | Master password change | Auth | P1 |
| FR-16 | Account deletion | Auth | P2 |
| FR-17 | Import/export credentials (CSV) | Data | P2 |
| FR-18 | Duplicate credential detection (same URL+username) | Core | P2 |

## Non-Functional Requirements

| ID | Description | Category | Priority |
|----|-------------|----------|----------|
| NF-01 | All credential passwords encrypted at rest using AES-256-GCM | Security | P0 |
| NF-02 | Master password never stored in plaintext; bcrypt for auth hash | Security | P0 |
| NF-03 | Encryption key derived from master password via PBKDF2 | Security | P0 |
| NF-04 | HTTPS-only in production | Security | P0 |
| NF-05 | Responsive UI (mobile + desktop) | UX | P1 |
| NF-06 | Page load under 2 seconds | Performance | P1 |
| NF-07 | All API endpoints validate input (no SQL injection, XSS) | Security | P0 |
| NF-08 | Rate limiting on login endpoint (5 attempts/minute) | Security | P1 |
| NF-09 | No secrets/keys hardcoded in source | Security | P0 |
| NF-10 | Meaningful error messages without leaking internals | Security | P1 |
| NF-11 | Structured logging for debugging | Observability | P2 |

## Assumptions

- [ASSUMPTION: Single-user focus but multi-user capable. No credential sharing between users.]
- [ASSUMPTION: SQLite for simplicity/portability. Can migrate to PostgreSQL later.]
- [ASSUMPTION: Server-side encryption with vault key derived from master password. Vault key kept in memory during session only, never persisted to disk.]
- [ASSUMPTION: Deployment target is a Node.js environment (local or cloud VM), not serverless.]
- [ASSUMPTION: No 2FA in v1 — logged as future enhancement.]
- [ASSUMPTION: CSV import/export uses a simple format: site_name, url, username, password, notes, category.]
