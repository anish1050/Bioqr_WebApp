# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**BioQR** is a full-stack web application combining React (frontend) with Node.js/Express (backend) using TypeScript. It's a biometric + QR-based security system with file management capabilities, featuring:
- JWT-based authentication (local + OAuth via Google/GitHub)
- QR code generation for secure file sharing
- File upload with Cloudinary integration
- MySQL database with automated schema
- CSRF protection, rate limiting, and input sanitization

## Tech Stack

**Frontend:** React 19, Vite, React Router DOM v7, TypeScript, Lucide React icons
**Backend:** Node.js, Express 5, TypeScript, MySQL2 (or TiDB)
**Security:** bcrypt, jsonwebtoken, csrf-csrf, express-session, passport.js
**Utilities:** multer (file uploads), qrcode, cloudinary, uuid

## Repository Structure

```
Bioqr_WebApp/
├── src/                    # React frontend
│   ├── main.tsx           # React entry point
│   ├── App.tsx            # Router setup
│   ├── pages/             # Route pages (Home, Login, Dashboard, etc.)
│   ├── components/        # Reusable UI (Navbar, Footer, SEO)
│   └── layouts/           # Layout wrappers (MainLayout, DashboardLayout)
├── routes/                # Express backend routes
│   ├── auth.routes.ts    # Local auth (login/signup)
│   ├── oauth.routes.ts   # OAuth callbacks
│   ├── qr.routes.ts      # QR generation & validation
│   └── files.routes.ts   # File upload/download
├── helpers/               # Backend utilities
│   ├── db.ts             # Database connection pool
│   ├── auth.ts           # JWT sign/verify helpers
│   ├── csrf.ts           # CSRF token handling
│   ├── passport.ts       # OAuth strategy configuration
│   ├── queries.ts        # SQL queries (parameterized)
│   ├── rateLimiters.ts   # Rate limiting middleware
│   ├── multer.ts         # File upload configuration
│   ├── sanitize.ts       # Input sanitization regex
│   ├── tokens.ts         # UUID generation
│   └── cloudinaryConfig.ts # Cloudinary setup
├── server.ts             # Express server bootstrap & middleware
├── setup-database.ts     # Schema migration script
├── vite.config.js        # Vite config with proxy to backend
└── uploads/              # Temporary file storage (gitignored)
```

## Common Development Commands

### Install dependencies
```bash
npm install
```

### Environment setup
1. Create `.env` file (see sample below)
2. Ensure MySQL/TiDB instance is running

### Database initialization
```bash
npm run setup-db
```

### Development (two terminals required)

**Terminal 1 - Frontend dev server (port 5173):**
```bash
npm run dev
```

**Terminal 2 - Backend server with watch (port 3000):**
```bash
npm run server:watch
```

Access the app at `http://localhost:5173` (frontend proxies API calls to backend).

### Production
```bash
npm run build      # Build React app to dist/
npm start          # Run production server (serves static files)
```

### Quality Assurance
```bash
npm run lint       # ESLint check
npm run typecheck:server  # Type-check server TypeScript
```

### Preview production build locally
```bash
npm run build
npm run preview
```

## Environment Variables (.env)

Required variables (adjust as needed):
```
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=bioqr_db
DB_PORT=3306

# Session security
SESSION_SECRET=random-32-char-string

# OAuth (optional)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# Cloudinary (optional, for production file storage)
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# App config
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

## Architecture & Patterns

### Fullstack Monolith
- Single Node.js project hosts both Express backend and Vite dev server
- In production, Express serves static files from `dist/`; in dev, Vite dev server proxies `/bioqr`, `/auth`, `/uploads`, `/access-file`, `/health` to `localhost:3000`
- No CORS needed in dev due to Vite proxy; session cookies work across domains via `cookieDomainRewrite: 'localhost'`

### Backend Route Organization
- Auth routes: `/bioqr/api/auth/*` ( POST login/signup, GET logout )
- OAuth routes: `/auth/google`, `/auth/google/callback`, `/auth/github`, `/auth/github/callback`
- QR routes: `/bioqr/api/qr/*` (generate, validate, list)
- Files routes: `/bioqr/api/files/*` (upload, list, download via `/access-file?token=`)
- Static HTML routes: `/login.html`, `/register.html`, `/dashboard.html`, etc. (served directly by Express)

### Database Schema (from `setup-database.ts`)
Tables: `users`, `sessions`, `devices`, `files`
- `users`: id, email, password_hash, name, provider (local/google/github), provider_id, created_at
- `sessions`: id, user_id, token, device_info, ip_address, created_at, expires_at
- `devices`: id, user_id, device_fingerprint, last_used, created_at
- `files`: id, user_id, filename, original_name, filepath, mime_type, size, qr_token, qr_expires_at, uploaded_at

All queries in `helpers/queries.ts` use parameterized statements to prevent SQL injection.

### Authentication Flow
1. **Local auth**: bcrypt password compare → create session → issue JWT → set httpOnly cookie + CSRF token
2. **OAuth**: Passport.js strategy → find/create user → create session → same as above
3. **Protected routes**: `verifySession` middleware checks JWT; CSRF protection on state-changing requests
4. **File access**: Upload creates `qr_token` with expiry; download uses token query param validated via `verifyQRToken`

### File Handling
- Uploads stored in `uploads/` (dev) or Cloudinary (production if configured)
- Multer limits: 50MB max, file filter by MIME type (images, PDFs, documents, videos, archives)
- Public file URLs: `/access-file?token=QR_TOKEN` (temporary, lookup by `files.qr_token`)

### Security Features
- Passwords: bcrypt hashing (10 rounds)
- Sessions: JWT stored in httpOnly cookie; CSRF tokens in headers/body
- Rate limiting: 5 requests per minute for auth endpoints, 10/min for API
- Input sanitization: `helpers/sanitize.ts` regex checks for SQL/XSS patterns
- Header hardening: `helmet`-like manual headers (HSTS, CSP, X-Frame-Options)

## Important Notes

- The project uses **React 19** with new JSX transform and modern hooks.
- TypeScript configuration is split: `tsconfig.json` (frontend), `tsconfig.server.json` (backend), `tsconfig.node.json` (node tools).
- Vite proxy configuration handles API routing in development; all `/bioqr/*`, `/auth/*`, `/uploads/*`, `/access-file`, `/health` and `.html` pages are proxied to Express on port 3000.
- OAuth routes redirect to Google/GitHub; set valid callback URLs in OAuth apps (`http://localhost:5173/auth/google/callback`, etc.).
- `setup-database.ts` drops existing tables; always review before running in non-dev environments.
- `uploads/` directory is gitignored; never commit uploaded files.

## Debugging Tips

- Session issues: Check cookie `connect.sid` exists; verify `SESSION_SECRET` matches; tokens stored in `sessions` table.
- OAuth failures: Ensure callback URLs are whitelisted; check `passport.ts` strategy configuration.
- File upload errors: Check multer limits and Cloudinary config if uploading >50MB or unsupported MIME.
- SQL errors: All dynamic queries use parameterized queries in `helpers/queries.ts`; avoid raw string concatenation.

## TypeScript & Linting

- Frontend: Uses `@vitejs/plugin-react` with ESLint plugin `eslint-plugin-react-hooks` and `eslint-plugin-react-refresh`.
- Backend: `tsx` runs TypeScript directly; `typecheck:server` validates without emitting.
- ESLint config in `eslint.config.js` uses modern flat config format.
