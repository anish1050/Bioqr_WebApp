# BioQR - Biometric + QR Security System

A modern, comprehensive web application built with React, Vite, Node.js, and MySQL. It offers a sophisticated QR-based security check-in flow, user authentication, OAuth integration, and secure file management capabilities.

---

## 🚀 Features

- **Authentication & Authorization**: Secure local signup/login (with bcrypt hashing), alongside seamless Google and GitHub OAuth combinations via Passport.js.
- **Dynamic QR Code Management**: Automated QR code generation for secure validation and temporary file access sharing.
- **Robust File Management**: Upload files securely constraints applied. Easily distribute and authorize view access via automatically generated temporary URLs and logic routes.
- **Dashboard Interface**: A clean & interactive UI to seamlessly manage your uploaded files, track sessions, access history, and interact with the ecosystem endpoints.
- **Security-First Approach**: Protected REST APIs utilizing JSON Web Tokens (JWT) for session validation, granular standard CSRF protections explicitly mapping token footprints, robust input sanitization, and route-level request rate-limiting to prevent DDoSing attempts.
- **Search Engine Optimized**: Universal SEO parameters integrated per route supporting detailed metadata indexing mapping.

---

## � Repository Structure

*Every file listed below is clickable and will take you directly to its source code on GitHub.*

### Root Architecture
- [`.env.example`](./.env.example) - Template for necessary environment variables (Database, OAuth).
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
  - [`Home.tsx`](./src/pages/Home.tsx) - The landing page demonstrating core solutions.
  - [`Login.tsx`](./src/pages/Login.tsx) - Authentication entry screen with OAuth options.
  - [`Register.tsx`](./src/pages/Register.tsx) - Standard signup interface.
  - [`Dashboard.tsx`](./src/pages/Dashboard.tsx) - User's protective secure area logic.
  - [`About.tsx`](./src/pages/About.tsx) - Mission and vision metadata parameters.
  - [`Contact.tsx`](./src/pages/Contact.tsx) - Feedback interaction form endpoint UI.
  - [`Help.tsx`](./src/pages/Help.tsx) - Documentation access matrix.
  - [`Status.tsx`](./src/pages/Status.tsx) - API ping evaluation screen.
- **Components ([`/src/components`](./src/components/)):**
  - [`Navbar.tsx`](./src/components/Navbar.tsx) - Core navigation framework utility.
  - [`DashboardNavbar.tsx`](./src/components/DashboardNavbar.tsx) - Specific navigation for authenticated sessions.
  - [`Footer.tsx`](./src/components/Footer.tsx) - Structural bottom component layout.
  - [`SEO.tsx`](./src/components/SEO.tsx) - Extracted Search Engine Optimization mapper logic.
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
- **React 19 & Vite**: Fast development server and optimized bundle compilation constraints.
- **React Router DOM**: Dynamic client-side nested routing patterns.
- **Vanilla CSS / Selected Libraries**: Deep personalized styling maps without aggressive overriding.
- **Lucide React**: Vectorized SVG iconography toolkit.

### Backend Ecosystem
- **Node.js**: Underlying baseline runtime.
- **Express.js (v5)**: Scalable backend routing structure parsing algorithms.
- **TypeScript**: Ensuring end-to-end typing for stability execution footprints.
- **MySQL2 / TiDB**: Highly rapid relational structure database integration mappings parsing.
- **Security Logic**: `bcrypt` (Hashing), `jsonwebtoken` (Sessions context tracking), `express-session`, `cors`.

---

## 🏁 Getting Started

### Prerequisites
Make sure you have installed on your core system:
1. **Node.js** (v20+ mapping constraints recommended)
2. **Relational Database** like MySQL Server locally or explicitly via TiDB Cloud mapping configurations.

### 1. Installation

Clone the repository and install the initial dependencies natively:
```bash
git clone https://github.com/your-username/bioqr-system.git
cd bioqr-system
npm install
```

### 2. Environment Variables

Create an `.env` file from the supplied example:
```bash
cp .env.example .env
```
Populate `.env` with actual development credentials (database, OAuth tokens setup via Google Cloud Console & GitHub Apps explicitly, session securely typed hashes, etc.).

### 3. Database Initialization

Execute the built-in database schema startup. This automatically pings your connection pool from `.env` and drops necessary tables (Users, Sessions, Devices, Files) securely natively:
```bash
npm run setup-db
```

### 4. Running Locally

Start up your localized development ecosystem. Both endpoints run via explicit hook watchers seamlessly:
```bash
# In Terminal 1 (Frontend specific):
npm run dev

# In Terminal 2 (Express Backend context watcher):
npm run server:watch
```
Your frontend is typically running on `http://localhost:5173` while parsing inputs via your backend explicitly situated mapped around `http://localhost:3000`.

---

## 📦 Production Deployment Mapping

For secure production integrations externally, Vite natively builds the `dist/` pipeline logic, and the isolated Express execution actively serves it concurrently in one specific port instance rendering footprints optimized.
```bash
# Build the production Vite React static bundles
npm run build

# Boot the isolated production Node Server parsing context configurations natively
npm start
```
By mapping the static `dist/` structure securely through the Express endpoints inside `server.ts`, we inherently eliminate CORS restrictions externally while pushing singular instance boundaries efficiently.

---

> Built rigorously prioritizing high-end authentication bounds mappings algorithms constraints explicitly.
