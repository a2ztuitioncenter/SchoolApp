# Docker Deployment & Networking Guide - Tuition App

This guide explains how to build, run, and deploy the backend and frontend as independent Docker containers with proper environment and port handling.

## 1. Environment Variable Strategy

### Local Development
To run containers locally without manually passing every environment variable:
1. Ensure your `.env` file exists in the `backend/` and/or `frontend/` directories.
2. The `Dockerfile` now copies these `.env` files into the image.
3. The application will automatically read them using `dotenv`.

### Production Deployment
On cloud platforms (Render, Railway, Fly.io, Vercel):
1. **Platform Env Vars**: Set your environment variables (like `DATABASE_URL`, `JWT_SECRET`) in the platform's dashboard.
2. **Precedence**: Environment variables set by the platform **automatically override** any values in the `.env` file copied into the image. This is the standard and most secure way to handle secrets in production.
3. **Security**: If you push your Docker images to a public registry (e.g., Docker Hub), **re-add `.env` to `.dockerignore`** or remove it before building to avoid leaking secrets.

## 2. Port Handling & Exposure

### Internal vs. External Ports
- **Internal Port**: This is the port the application listens on *inside* the container. 
    - Backend: `3000` (default)
    - Frontend: `8000` (default)
- **External (Host) Port**: This is the port you use to access the app from your browser or other services.
    - Example: Mapping `8080` to `3000` means you access the API at `http://localhost:8080`.

### Local Run Command Example
```bash
# Map host port 3001 to container port 3000
docker run -p 3001:3000 tuition-backend
```

### Cloud Platforms
Cloud platforms automatically inject a `PORT` environment variable. Our Dockerfiles and application code are configured to respect this variable:
```javascript
const PORT = process.env.PORT || 3000;
```
The platform will handle the mapping from their public URL to this internal port.

## 3. Docker Networking

Since the containers are independent, they do not "know" about each other by default.

- **Local Networking**: Use `localhost` or your machine's IP address.
    - Frontend `BACKEND_URL` should be `http://localhost:3000`.
- **Production Networking**: Use the public URL of your deployed backend.
    - Frontend `BACKEND_URL` should be `https://your-backend-api.onrender.com`.

## 4. Build & Run Commands

### Backend
```bash
# Build
docker build -t backend ./backend

# Run
docker run -d --name backend -p 3000:3000 backend
```

### Frontend
```bash
# Build
docker build -t frontend ./frontend

# Run
docker run -d --name frontend -p 8000:8000 frontend
```

## 5. CORS Configuration

Ensure the backend allows requests from the frontend origin:
- In `backend/.env`, set `ALLOWED_ORIGINS=http://localhost:8000` (for local) or your production frontend URL.
- The backend middleware `corsSecure` will handle these origins dynamically.

## 6. Cleanup
To stop and remove containers:
```bash
docker stop tuition-backend tuition-frontend
docker rm tuition-backend tuition-frontend
```
