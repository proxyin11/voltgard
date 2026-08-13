# VaultGuard - Secure Password Manager

A production-grade, encrypted password manager built with Node.js.

## Quick Start

```bash
npm install
cp .env.example .env
npm start
```

Visit `http://localhost:3000`

## Features

- 🔐 AES-256-GCM encryption for all stored passwords
- 🔑 Master password with PBKDF2 key derivation
- 📋 One-click copy to clipboard
- 🔄 Configurable password generator
- 📁 Category-based organization
- 📤 CSV import/export
- 📱 Responsive design

## Tech Stack

- **Backend**: Node.js + Express.js
- **Database**: SQLite (via better-sqlite3)
- **Encryption**: AES-256-GCM with PBKDF2 key derivation
- **Auth**: bcrypt + express-session
- **Frontend**: Vanilla HTML/CSS/JS
