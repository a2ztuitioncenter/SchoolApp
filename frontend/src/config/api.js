const getHostname = () => {
  if (typeof window === 'undefined') return '';
  return window.location.hostname;
};

const hostname = getHostname();
const isLocal = hostname === 'localhost' || 
                hostname === '127.0.0.1' || 
                hostname === 'www.localhost' ||
                hostname.startsWith('192.168.') || 
                hostname.startsWith('10.') ||
                hostname.endsWith('.local');

const isVercel = hostname.endsWith('.vercel.app');
const isCloudflare = hostname.endsWith('.trycloudflare.com');

const isProd = !isLocal && !isCloudflare;

export const config = {
  isProd,
  isLocal,
  isVercel,
  isCloudflare,
  // Default to relative paths ('') which works for:
  // 1. Unified deployments (backend serves frontend)
  // 2. Vercel/Local deployments with proxies
  // Only use absolute URL if explicitly provided in window.BACKEND_URL
  API_BASE_URL: window.BACKEND_URL || ''
};
