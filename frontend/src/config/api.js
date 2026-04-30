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
  // Empty string for local/vercel/cloudflare means it will use relative paths & proxy
  API_BASE_URL: (isLocal || isVercel || isCloudflare) ? '' : 'https://schoolapp-ln74.onrender.com'
};
