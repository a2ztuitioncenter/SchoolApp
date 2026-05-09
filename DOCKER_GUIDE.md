# Docker Deployment Guide - Tuition App

We use a **Unified Deployment** strategy for production, where a single Docker container runs the backend server and serves the frontend assets.

## 1. Unified Architecture
- **Root Dockerfile**: Copies both `backend` and `frontend`.
- **Backend Server**: Acts as the API server AND serves the static frontend files.
- **Port**: The entire application runs on port `3000`.

## 2. Environment Variables
Ensure the following are set in your deployment environment (e.g., Render Dashboard):
- `DATABASE_URL`: Your PostgreSQL connection string.
- `JWT_SECRET`: A secure random string for tokens.
- `ADMIN_PHONE`, `ADMIN_PASSWORD`, `ADMIN_USERNAME`: Initial admin credentials.
- `NODE_ENV`: Set to `production`.

## 3. Deployment Commands

### Build & Run Locally (Testing)
```bash
# Build from root
docker build -t tuition-app .

# Run
docker run -p 3000:3000 tuition-app
```

### Deploying to Render
1. Select **Web Service**.
2. Connect your repository.
3. Set **Docker** as the Runtime.
4. Add environment variables.
5. Deploy.

## 4. Networking
- **Frontend → Backend**: Since they are in the same container, the frontend uses relative paths (`/api/...`) to reach the backend.
- **CORS**: Ensure `FRONTEND_URL` in your environment matches your deployment domain to allow cross-origin requests (if any).
