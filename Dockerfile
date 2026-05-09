# Use the official Bun image
FROM oven/bun:1

# Set the working directory inside the container
WORKDIR /app

# Copy root package files (if any)
COPY package.json bun.lock* ./

# Copy backend and frontend directories
COPY backend ./backend
COPY frontend ./frontend

# Install dependencies for both
RUN cd backend && bun install
RUN cd frontend && bun install

# Set the working directory to backend for the CMD
WORKDIR /app/backend

# Ensure upload directories exist
RUN mkdir -p uploads/materials uploads/homework uploads/notifications

# Expose the port the app uses
EXPOSE 3000
ENV PORT=3000
ENV NODE_ENV=production

# Run the backend server (which also serves the frontend)
CMD ["bun", "run", "src/server.js"]
