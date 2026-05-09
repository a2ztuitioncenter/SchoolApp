# Docker Deployment & Networking Guide - Tuition App

This guide explains how to build, run, and deploy the backend as a Docker container while running the frontend raw on the host machine.

## 1. Mixed Architecture Strategy

We use a "Mixed Architecture" for local development:
- **Backend**: Runs in a Docker container for environment isolation and database connectivity.
- **Frontend**: Runs "raw" on your host machine using Bun for rapid development and easier debugging.

## 2. Environment Variable Strategy

### Backend (Docker)
1. Ensure `backend/.env` exists.
2. The `Dockerfile` copies `.env` into the image.
3. Run with: `docker run -d --name backend -p 3000:3000 backend`

### Frontend (Raw)
1. Ensure `frontend/.env` exists (or use default values).
2. The frontend `server.ts` defaults to `http://localhost:3000` for `BACKEND_URL`.
3. Run with: `bun run dev` (from the `frontend` directory).

## 3. Networking

Since the backend container maps its internal port `3000` to host port `3000`, the raw frontend can reach it via `http://localhost:3000`.

- **Frontend → Backend**: Frontend proxies requests to `BACKEND_URL` (default: `http://localhost:3000`).
- **Backend CORS**: Ensure `backend/.env` allows the frontend origin (default: `http://localhost:8000`).
    - `ALLOWED_ORIGINS=http://localhost:8000`

## 4. Commands

### Backend (Docker)
```bash
# Navigate to backend
cd backend

# Build
docker build -t backend .

# Run
docker run -d --name backend -p 3000:3000 backend
```

### Frontend (Raw)
```bash
# Navigate to frontend
cd frontend

# Install dependencies (first time only)
bun install

# Run server
bun run dev
```

## 5. Cleanup
To stop and remove the backend container:
```bash
docker stop backend
docker rm backend
```
