# Known Issues & Future Enhancements

## Known Issues
- None (All P0, P1, and P2 functional and non-functional requirements pass with 100% test coverage).

## Technical Notes / Future Enhancements
- **Storage Mode**: `sql.js` operates as an in-memory SQLite database persisted to disk via synchronous file writes on mutations. For high-concurrency production deployments with millions of records, migrating to native PostgreSQL/MySQL via Knex/Prisma is recommended.
- **Two-Factor Authentication (2FA)**: TOTP-based 2FA (e.g. Google Authenticator) can be added as an extra authentication layer in v1.1.
- **Biometric Unlock**: WebAuthn support for fingerprint/FaceID unlock on supported mobile browsers.
