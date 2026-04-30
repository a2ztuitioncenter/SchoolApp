const isProd = process.env.NODE_ENV === "production";

export const config = {
  isProd,
  FRONTEND_URL: isProd ? process.env.FRONTEND_URL : process.env.FRONTEND_DEV_URL,
  API_BASE_URL: isProd ? process.env.API_BASE_URL : process.env.API_BASE_DEV_URL
};
