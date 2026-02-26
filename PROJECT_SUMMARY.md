# ReadABookOrSomething - Project Summary

## Core Features

- User authentication with JWT (access + refresh tokens) stored in httpOnly cookies.
- Book discovery via external public-domain source APIs (currently focused on Gutendex for reliability).
- Personal library management:
  - Add books to library
  - Remove books
  - Track reading status (`to-read`, `reading`, `done`)
- Reader experience:
  - Multiple reading formats (HTML/Text where available)
  - Scroll and paged layout modes
  - Chapter navigation for long-form books
- Annotation system:
  - Text highlights
  - Notes with title/body/color
  - Recent annotations in sidebar
  - Jump from sidebar highlight entries back to in-book location
- Notes management page:
  - Filter by type/book
  - Edit and delete actions
- Dashboard/Home insights:
  - Total library counts by status
  - Last opened book
  - Recent note activity

## Tech Stack

### Frontend
- React 18
- React Router
- Vite
- Plain CSS (custom styling system)

### Backend
- Node.js
- Express
- Mongoose
- JWT (`jsonwebtoken`)
- `bcryptjs` for password hashing
- Cookie-based auth (`cookie-parser`)
- CORS + request logging + centralized error middleware

### Data
- MongoDB (Atlas compatible)

### Deployment
- Client: Cloudflare Pages
- Server: Render Web Service (Blueprint supported via `render.yaml`)

## Architecture

### High-Level Flow

1. React client calls API through `client/src/lib/api.js`.
2. Express API serves auth, library, reader proxy, annotations, and health routes under `/api`.
3. MongoDB stores users, library books, and annotations.
4. Reader page fetches source content via backend proxy and overlays annotation data.

### Key Backend Domains

- Auth: register/login/refresh/logout/me
- Library: save book metadata + reading status + last-opened tracking
- Reader proxy: fetches remote readable content safely through backend
- Annotations: create/read/update/delete + note/highlight organization
- Books aggregator/search: source adapters + normalization

### Security Model

- Passwords hashed with bcrypt.
- Auth tokens in httpOnly cookies.
- CORS restricted to configured client origins.
- Access/refresh token split for safer session handling.

## Real-World Value

- Provides a low-friction reading workspace for public-domain books.
- Combines discovery, reading, and study workflow in one interface.
- Supports active reading behaviors (highlighting, note-taking, revisit context).
- Useful for students, researchers, and self-learners building reading habits.
- Demonstrates production-relevant full-stack patterns:
  - session security
  - external API integration
  - content proxying
  - stateful reading UX

## Current Production Notes

- API base URL is normalized client-side so missing `/api` in env config is auto-corrected.
- Render/Cloudflare cross-origin cookie auth requires HTTPS and correct `CLIENT_ORIGIN`.
- `CLIENT_ORIGIN` supports comma-separated values for multiple domains.

## Suggested Next Improvements

- Add automated tests (API integration + key UI workflows).
- Add stronger content sanitization and policy checks for proxied reader content.
- Introduce persistent chapter/scroll position per book.
- Add analytics/telemetry for performance and usage.
- Optional: richer source adapters with robust fallback/rate-limit strategy.
