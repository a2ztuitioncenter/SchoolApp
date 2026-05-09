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
  // Default to relative paths ('') for unified deployments
  // For Vercel deployments, we fallback to the known Render URL if window.BACKEND_URL is missing
  API_BASE_URL: window.BACKEND_URL || (isVercel ? 'https://schoolapp-1-qlr5.onrender.com' : '')
};
