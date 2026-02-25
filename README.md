# MERN App Skeleton

MERN starter in one repo:
- `client`: Vite + React (`http://localhost:5173`)
- `server`: Node + Express + Mongoose (`http://localhost:8000`)
- JWT auth using **httpOnly cookies** (access + refresh)

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
