# Use the official Bun image
FROM oven/bun:1

# Set the working directory inside the container
WORKDIR /app

# Copy package files and install dependencies
# This is done before copying the rest of the code to leverage Docker cache
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy the rest of the application code
# NOTE: .env is included because it was removed from .dockerignore
COPY . .

# Create a non-root user for security (Best Practice)
RUN groupadd -r bunuser && useradd -r -g bunuser bunuser && \
    mkdir -p uploads/materials uploads/homework uploads/notifications && \
    chown -R bunuser:bunuser /app
USER bunuser

# Port handling: 
# 1. EXPOSE documents the port the app uses internally
# 2. PORT env var is used by the app code
# 3. Default to 3000 if not set by host/platform
EXPOSE 3000
ENV PORT=3000
ENV NODE_ENV=production

# Run the backend server
CMD ["bun", "run", "src/server.js"]
