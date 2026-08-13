# Changelog

All notable changes to VaultGuard will be documented in this file.

## [1.0.0] - 2026-08-13

### Added
- Core architecture: Node.js + Express.js backend with pure JS SQLite (`sql.js`) database layer.
- End-to-end Zero-Knowledge style AES-256-GCM encryption with PBKDF2 key derivation from master password.
- Secure authentication system using `bcryptjs`, express session, and rate limiting (5 attempts/min).
- Credential management API: Create, Read, Update, Delete, and Search credentials with automated encryption/decryption.
- Duplicate credential detection for matching URL and Username.
- Configurable password generator endpoint and UI supporting custom length and character sets.
- Category management API and sidebar filtering in vault UI.
- Master password change functionality with automated vault re-encryption.
- Account deletion with cascading data purge.
- CSV import and export capabilities.
- Responsive modern dark-theme frontend using vanilla HTML5/CSS3/JavaScript.
- Client-side copy-to-clipboard, show/hide password toggles, and live password strength indicator.
- Auto-logout session timeout (15 minutes default) with interactive warning modal.
- Comprehensive test suite (39 automated unit & integration tests passing 100%).
