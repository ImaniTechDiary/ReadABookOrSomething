# ReadABookOrSomething

MERN reading platform in one repo:
- `client`: Vite + React (`http://localhost:5173`)
- `server`: Node + Express + Mongoose (`http://localhost:8000`)
- JWT auth using **httpOnly cookies** (access + refresh)

## Project Summary

- Full project summary (features, stack, architecture, real-world value):
  - `PROJECT_SUMMARY.md`

## Highlights

- Auth: register/login/refresh/logout with secure cookie sessions
- Discovery: public-domain book search integration (Gutendex-focused path)
- Library: add/remove books, track reading status, continue reading
- Reader: HTML/Text reading, chapter jump, layout modes
- Annotation workflow: highlights + notes + quick jump-back from sidebar
- Dashboard and Notes views with edit/delete and useful reading insights

## Setup

1. Install dependencies from repo root:

```bash
npm install
```

2. Create env files:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

3. Configure required server env vars in `server/.env`:
- `MONGODB_URI`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `CLIENT_ORIGIN`

4. Start both apps:

```bash
npm run dev
```

## Environment Variables

### Server (`server/.env`)

- `PORT` (default `8000`)
- `MONGODB_URI`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `CLIENT_ORIGIN`  
  Use comma-separated origins in production when needed, for example:  
  `https://your-app.pages.dev,https://www.yourdomain.com,http://localhost:5173`

### Client (`client/.env`)

- `VITE_API_BASE_URL`  
  Recommended: `https://<your-render-service>.onrender.com/api`

Note:
- The client includes a guard that auto-appends `/api` if it is missing.

## API quick checks

- Health: `GET http://localhost:8000/api/health` -> `{ "ok": true }`
- Book search: `GET /api/books/search?q=pride&sources=gutendex,standardebooks,wikisource&limit=20`
- Register: `POST /api/auth/register`
- Login: `POST /api/auth/login`
- Refresh: `POST /api/auth/refresh`
- Me (auth): `GET /api/auth/me`
- Logout: `POST /api/auth/logout`
- Library: `GET/POST /api/library`, `PATCH /api/library/:id/status`, `DELETE /api/library/:id`
- Reader content proxy: `GET /api/reader/content?url=<source-url>`
- Annotations: `GET/POST /api/annotations`, `PATCH /api/annotations/:id`, `DELETE /api/annotations/:id`

## Deploy: Cloudflare (client) + Render (server)

### 1. Deploy server to Render

This repo now includes `render.yaml`, so you can use a Blueprint deploy.

1. Push current code to GitHub.
2. In Render, click `New +` -> `Blueprint`.
3. Select your repo and deploy.
4. In Render service env vars, set:
   - `MONGODB_URI`
   - `JWT_ACCESS_SECRET`
   - `JWT_REFRESH_SECRET`
   - `CLIENT_ORIGIN` (your Cloudflare Pages URL)

Notes:
- `CLIENT_ORIGIN` supports a comma-separated list. Example:
  `https://your-app.pages.dev,https://www.yourdomain.com,http://localhost:5173`
- Render health endpoint: `/api/health`

### 2. Deploy client to Cloudflare Pages

1. In Cloudflare Dashboard, go to `Workers & Pages` -> `Create` -> `Pages` -> `Connect to Git`.
2. Select this repo.
3. Set build settings:
   - Framework preset: `Vite`
   - Root directory: `client`
   - Build command: `npm run build`
   - Build output directory: `dist`
4. Add environment variable in Pages:
   - `VITE_API_BASE_URL=https://<your-render-service>.onrender.com/api`
5. Deploy.

Notes:
- SPA routes are handled via `client/public/_redirects`.

### 3. Wire domains and finalize CORS

1. Copy Cloudflare production URL (and custom domain if used).
2. In Render, update `CLIENT_ORIGIN` with all allowed client origins (comma-separated).
3. Trigger a new deploy on Render.

### 4. Verify production

1. Open your Cloudflare URL.
2. Register/Login.
3. Confirm requests go to your Render API URL.
4. Check:
   - `GET https://<render-service>.onrender.com/api/health` -> `{ "ok": true }`

## Troubleshooting

- `404 /auth/login` or `404 /health` in production:
  - `VITE_API_BASE_URL` is missing `/api` or points to wrong host.
- Login works locally but not in production:
  - Verify `CLIENT_ORIGIN` in Render matches your Cloudflare domain exactly.
- Render deploy exits immediately:
  - Check startup logs for missing env vars or MongoDB connection/auth errors.
