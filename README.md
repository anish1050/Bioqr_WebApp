# BioQR - Biometric + Identity-Locked QR Security

A sophisticated, zero-knowledge security platform that combines **biometric authentication** with **identity-locked dynamic QR technology**. Built for modern enterprises and individuals, BioQR ensures that sensitive data and physical access are locked to the intended receiver's unique biometric profile.

---

## 🚀 Features

- **Identity-Locked QR Codes**: Generate dynamic QR codes encrypted specifically for a receiver's public key. Accessible only after a local biometric scan (Fingerprint/FaceID).
- **Comprehensive Documentation Hub**: A dedicated `/docs` portal featuring exhaustive guides for Web Dashboard enrollment and Android Application workflows.
- **Biometric Enrollment (WebAuthn)**: Secure device-linking using hardware-backed keystores (Windows Hello, TouchID, FaceID) via the Web Dashboard.
- **Organization & Team Management**: Scalable administrative tools to manage identities, teams, and cross-entity access permissions.
- **System Status Monitoring**: Real-time service health tracking with a modern, high-visibility vertical dashboard.
- **Android Integration**: Native Android application supporting biometric verification and on-the-go secure QR generation.
- **Security-First Architecture**: Protected REST APIs utilizing JWT, CSRF token mapping, and rate-limiting to ensure high availability and integrity.
- **Premium UI/UX**: A state-of-the-art glassmorphic interface with fluid transitions and modern typography (Google Fonts).

---

## � Repository Structure

*Every file listed below is clickable and will take you directly to its source code on GitHub.*

### Root Architecture
- `.env` - Production and development environment variables (Database, OAuth).
- [`.gitignore`](./.gitignore) - Tracked exclusions for compiled builds and keys.
- [`package.json`](./package.json) - All core Node dependencies and build scripts.
- [`server.ts`](./server.ts) - The main Node.js/Express bootstrap server encompassing the backend routes, session middleware, and static production serving.
- [`setup-database.ts`](./setup-database.ts) - Script containing automated migrations to setup default MySQL tables schemas.
- [`vite.config.js`](./vite.config.js) - Bundler compilation configurations for the React application.

### Frontend Architecture (`/src`)
- **Core Bootstrappers:**
  - [`App.tsx`](./src/App.tsx) - Client-side core router encompassing Layout mappings.
  - [`main.tsx`](./src/main.tsx) - React DOM anchor entry point.
- **Pages ([`/src/pages`](./src/pages/)):**
  - [`Home.tsx`](./src/pages/Home.tsx) - The landing page identifying core identity-locking solutions.
  - [`Login.tsx`](./src/pages/Login.tsx) - Authentication entry screen with biometric-ready OAuth options.
  - [`Register.tsx`](./src/pages/Register.tsx) - Standard signup interface for secure onboarding.
  - [`Dashboard.tsx`](./src/pages/Dashboard.tsx) - User's protective secure area logic.
  - [`OrgDashboard.tsx`](./src/pages/OrgDashboard.tsx) - Administrative suite for high-level entity management.
  - [`TeamDashboard.tsx`](./src/pages/TeamDashboard.tsx) - Localized team-based permission controls.
  - [`Documentation.tsx`](./src/pages/Documentation.tsx) - Exhaustive guide and technical hub for the BioQR ecosystem.
  - [`Status.tsx`](./src/pages/Status.tsx) - Modernized API evaluation and health monitoring screen.
- **Components ([`/src/components`](./src/components/)):**
  - [`Navbar.tsx`](./src/components/Navbar.tsx) - Simplified, high-performance navigation framework.
  - [`DashboardNavbar.tsx`](./src/components/DashboardNavbar.tsx) - Secure navigation for authenticated sessions.
  - [`SEO.tsx`](./src/components/SEO.tsx) - Extracted Search Engine Optimization mapper logic.
- **Styles ([`/src/styles`](./src/styles/)):**
  - [`status-modern.css`](./src/styles/status-modern.css) - Bold, high-visibility status page styling.
  - [`docs.css`](./src/styles/docs.css) - Premium glassmorphic documentation layout definitions.
- **Layout Maps ([`/src/layouts`](./src/layouts/)):**
  - [`MainLayout.tsx`](./src/layouts/MainLayout.tsx)
  - [`DashboardLayout.tsx`](./src/layouts/DashboardLayout.tsx)

### Backend Architecture
- **Routes ([`/routes`](./routes/)):**
  - [`auth.routes.ts`](./routes/auth.routes.ts) - Native authentication logic.
  - [`oauth.routes.ts`](./routes/oauth.routes.ts) - Passport.js implementation for GitHub/Google handshakes.
  - [`qr.routes.ts`](./routes/qr.routes.ts) - Logic endpoints governing QR lifecycle distributions.
  - [`files.routes.ts`](./routes/files.routes.ts) - Endpoint parsing limits for disk upload handling.
- **Helpers & Configuration ([`/helpers`](./helpers/)):**
  - [`db.ts`](./helpers/db.ts) - Database SQL execution pool mappings.
  - [`auth.ts`](./helpers/auth.ts) - Extracted JWT issuing and verify utilities.
  - [`csrf.ts`](./helpers/csrf.ts) - Token issuance protocol handlers for forms.
  - [`passport.ts`](./helpers/passport.ts) - Passport strategies explicit definition tracking.
  - [`queries.ts`](./helpers/queries.ts) - Isolated secure database query parameter operations.
  - [`rateLimiters.ts`](./helpers/rateLimiters.ts) - Global Express anti-spam protection endpoints.
  - [`multer.ts`](./helpers/multer.ts) - File payload storage routing and filtering constraints.
  - [`sanitize.ts`](./helpers/sanitize.ts) - Specialized Regex mappings against malicious injections.
  - [`tokens.ts`](./helpers/tokens.ts) - Random UUID generations footprint parameters module.
  - [`cloudinaryConfig.ts`](./helpers/cloudinaryConfig.ts) - Outbound asset pipeline integration configurations (if enabled).

---

## 🛠 Tech Stack

### Frontend Ecosystem
- **React 19 & Vite**: High-performance development and optimized production bundling.
- **Lucide React**: Specialized vector iconography for a premium, clean aesthetic.
- **Vanilla CSS (Modern)**: Custom design system featuring glassmorphism and fluid transitions.
- **React Router DOM**: Advanced nested routing for multi-dashboard experiences.

### Backend Ecosystem
- **Node.js**: Underlying runtime for high-concurrency operations.
- **Express.js (v5)**: Evolved routing architecture with native promise support.
- **TypeScript**: Full-stack type safety across all entity transformations.
- **MySQL2 & MongoDB**: Multi-modal data storage for structured relations and high-speed logging.
- **Passport.js**: Multi-strategy authentication (Local, Google, GitHub).

---

## 🏁 Getting Started

### Prerequisites
1. **Node.js** (v20+ recommended)
2. **MySQL Server** (Local or TiDB Cloud instance)
3. **MongoDB** (For analytics and system logging)

### 1. Installation
```bash
git clone https://github.com/your-username/bioqr-system.git
cd bioqr-system
npm install
```

### 2. Environment Setup
Create a `.env` file and populate it with credentials:
- `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME` (MySQL)
- `MONGODB_URI` (Mongo Connection)
- `GOOGLE_CLIENT_ID`, `GITHUB_CLIENT_ID` (OAuth)
- `JWT_SECRET`, `SESSION_SECRET` (Security)

### 3. Database Initialization
```bash
npm run setup-db
```

### 4. Running Locally
```bash
# Start Frontend & Backend concurrently
npm run dev
```

---

## 📦 Android Integration

The BioQR Android application is tightly integrated with this web dashboard.
- **APK Distribution**: The latest signed APK is served directly from `/public/downloads/BioQR.apk`.
- **Identity Syncing**: Users must register on the web first, then sync their profile to the mobile app using the "Enroll Device" flow.
- **Source Code**: For mobile development, refer to the `BioQR-Android` repository.

---

> Built rigorously with a **Security-First** philosophy, prioritizing identity integrity and biometric privacy.
