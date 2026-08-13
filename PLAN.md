# Build Plan — VaultGuard Password Manager

## Tech Stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| Backend | Node.js + Express.js | Mature ecosystem, fast development, excellent for REST APIs |
| Database | SQLite via better-sqlite3 | Zero-config, file-based, portable, perfect for single-app deployment |
| Auth | bcrypt + express-session + connect-sqlite3 | Industry-standard password hashing with persistent sessions |
| Encryption | Node.js crypto (AES-256-GCM, PBKDF2) | Built-in, no external dependency, FIPS-compliant algorithms |
| Frontend | Vanilla HTML/CSS/JS | Zero framework overhead, fast loads, full control |
| Testing | Jest + supertest | Standard Node.js testing stack |

## Architecture

```
paper2code/
├── src/
│   ├── server.js          # Express app setup & middleware
│   ├── config.js           # Environment config
│   ├── db.js               # Database initialization & connection
│   ├── logger.js           # Structured logging
│   ├── crypto.js           # Encryption/decryption module
│   ├── middleware/
│   │   ├── auth.js         # Auth middleware
│   │   ├── rateLimiter.js  # Rate limiting
│   │   └── validator.js    # Input validation
│   └── routes/
│       ├── auth.js         # Auth endpoints
│       ├── credentials.js  # Credential CRUD
│       ├── categories.js   # Category management
│       ├── generator.js    # Password generation
│       └── account.js      # Account management
├── public/
│   ├── index.html          # Login/Register page
│   ├── vault.html          # Main vault page
│   ├── css/
│   │   └── style.css       # All styles
│   └── js/
│       ├── auth.js         # Auth UI logic
│       ├── vault.js        # Vault UI logic
│       ├── generator.js    # Password generator UI
│       └── utils.js        # Shared utilities
├── tests/
│   ├── crypto.test.js
│   ├── auth.test.js
│   ├── credentials.test.js
│   ├── categories.test.js
│   ├── generator.test.js
│   └── setup.js
├── package.json
├── .env.example
├── REQUIREMENTS.md
├── PLAN.md
├── COVERAGE.md
├── CHANGELOG.md
└── KNOWN_ISSUES.md
```

## Milestones

### Milestone 1: Project Setup & Data Layer
- Initialize npm project with dependencies
- Create folder structure
- Database schema: users, credentials, categories tables
- Database initialization module with migrations
- Tests: schema creation, table existence

### Milestone 2: Encryption Module
- PBKDF2 key derivation (master password + per-user salt → 256-bit key)
- AES-256-GCM encrypt/decrypt functions
- Tests: round-trip encryption, different keys produce different ciphertext, tamper detection

### Milestone 3: Auth System
- POST /api/auth/register — create user with bcrypt-hashed master password
- POST /api/auth/login — verify credentials, create session, derive vault key
- POST /api/auth/logout — destroy session
- Session middleware (express-session + SQLite store)
- Auth guard middleware for protected routes
- Rate limiting on /api/auth/login (5 req/min)
- Tests: register, login, logout, unauthorized access, rate limiting

### Milestone 4: Core CRUD API
- POST /api/credentials — create (encrypt password before storage)
- GET /api/credentials — list all for authenticated user (decrypt passwords)
- GET /api/credentials/:id — get single credential
- PUT /api/credentials/:id — update credential
- DELETE /api/credentials/:id — delete credential
- GET /api/credentials/search?q= — search by site/username/URL
- Input validation on all endpoints
- Tests: full CRUD cycle, search, authorization checks

### Milestone 5: Password Generator & Categories API
- POST /api/generate-password — configurable generator
- CRUD for categories
- Tests: generator output validation, category operations

### Milestone 6: Frontend — Auth Pages
- Login page with form validation
- Register page with password strength
- Responsive layout
- Error/success messaging

### Milestone 7: Frontend — Main Vault UI
- Credential list with search
- Add/edit modal
- Delete confirmation
- Copy to clipboard
- Show/hide password
- Password generator panel
- Category filter sidebar
- Password strength meter
- Session timeout warning (auto-logout at 15 min)

### Milestone 8: Advanced Features
- PUT /api/auth/change-password — master password change (re-encrypt all credentials)
- DELETE /api/account — account deletion
- POST /api/credentials/export — CSV export
- POST /api/credentials/import — CSV import
- Duplicate detection on create/edit

### Milestone 9: Production Hardening
- Error handling audit (global error handler, async wrapper)
- Security headers (helmet, CSP, CORS)
- Input sanitization audit
- Environment variable config (.env)
- Structured logging (winston/pino)
- Performance check

### Milestone 10: Deployment & Smoke Test
- Production build script
- PM2/systemd config
- Deploy
- Smoke test against live URL
