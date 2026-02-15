# MERN Skeleton

A minimal MERN starter with:
- `client`: React + Vite
- `server`: Express + MongoDB (Mongoose)

## 1) Install

```bash
npm install
```

## 2) Configure environment

Copy and fill env files:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Set `MONGODB_URI` in `server/.env`.

## 3) Run in development

```bash
npm run dev
```

- Client: `http://localhost:5173`
- Server: `http://localhost:5001`
- Health/API check: `http://localhost:5001/api/health`

## 4) Production-style run

```bash
npm run build
npm run start
```
