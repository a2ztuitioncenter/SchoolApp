import { API_BASE_URL } from './config';

const DEFAULT_TIMEOUT = 15000;

const buildUrl = (endpoint) => `${API_BASE_URL}/api${endpoint}`;

const withTimeout = (ms) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timeoutId) };
};

export const apiClient = async (endpoint, options = {}) => {
  const url = buildUrl(endpoint);
  const timeout = withTimeout(options.timeout || DEFAULT_TIMEOUT);

  const headers = {
    Accept: 'application/json',
    ...(options.isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {})
  };

  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body,
      credentials: 'include',
      signal: timeout.signal
    });

    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json')
      ? await response.json()
      : { message: await response.text() };

    if (!response.ok) {
      return {
        success: false,
        status: response.status,
        error: payload?.error || payload?.message || `HTTP_${response.status}`
      };
    }

    return {
      success: true,
      status: response.status,
      data: payload
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Network error'
    };
  } finally {
    timeout.clear();
  }
};
