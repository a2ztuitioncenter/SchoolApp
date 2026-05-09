# Use the official Bun image
FROM oven/bun:1

# Set the working directory inside the container
WORKDIR /app

# Copy application source
# NOTE: .env is included because it was removed from .dockerignore
COPY . .

# Create a non-root user for security (Best Practice)
RUN groupadd -r bunuser && useradd -r -g bunuser bunuser && \
    chown -R bunuser:bunuser /app
USER bunuser

# Port handling:
# 1. EXPOSE documents the port the app uses internally
# 2. PORT env var is used by the app code
# 3. Default to 8000 if not set by host/platform
EXPOSE 8000
ENV PORT=8000
ENV NODE_ENV=production

# Run the frontend server
CMD ["bun", "run", "server.ts"]
