const isProd = process.env.NODE_ENV === "production";

export const config = {
  isProd,
  // Prioritize runtime env vars, then fall back to .env values
  FRONTEND_URL: process.env.FRONTEND_URL || process.env.FRONTEND_DEV_URL || 'http://localhost:8000',
  API_BASE_URL: process.env.API_BASE_URL || process.env.API_BASE_DEV_URL || 'http://localhost:3000'
};
