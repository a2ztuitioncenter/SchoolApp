/**
 * cache.js - Unified caching utility for dashboard data
 * Implements Stale-While-Revalidate (SWR) with localStorage persistence
 */

const CACHE_PREFIX = 'tuition_app_cache_';

/**
 * Get data from cache for a specific user and key
 * @param {string} userId - Current user ID
 * @param {string} key - Cache key (e.g., 'dashboard', 'homework')
 * @returns {Object|null} Cached data or null if not found
 */
export function getCache(userId, key) {
  if (!userId || !key) return null;
  const fullKey = `${CACHE_PREFIX}${userId}_${key}`;
  const raw = localStorage.getItem(fullKey);
  
  if (!raw) return null;
  
  try {
    const entry = JSON.parse(raw);
    const now = Date.now();
    
    // Check if data is expired
    if (now - entry.timestamp > entry.ttl) {
      return { data: entry.data, isStale: true };
    }
    
    return { data: entry.data, isStale: false };
  } catch (e) {
    console.error(`Cache read error for ${key}:`, e);
    return null;
  }
}

/**
 * Set data in cache with TTL
 * @param {string} userId - Current user ID
 * @param {string} key - Cache key
 * @param {any} data - Data to store
 * @param {number} ttl - Time to live in milliseconds
 */
export function setCache(userId, key, data, ttl = 60000) {
  if (!userId || !key) return;
  const fullKey = `${CACHE_PREFIX}${userId}_${key}`;
  
  const entry = {
    data,
    timestamp: Date.now(),
    ttl
  };
  
  try {
    localStorage.setItem(fullKey, JSON.stringify(entry));
  } catch (e) {
    // If quota exceeded, clear all caches for this user and retry
    if (e.name === 'QuotaExceededError') {
      clearCache(userId);
      try {
        localStorage.setItem(fullKey, JSON.stringify(entry));
      } catch (retryErr) {
        console.warn('Cache storage failed even after cleanup:', retryErr);
      }
    }
  }
}

/**
 * Clear specific or all cache for a user
 * @param {string} userId - Current user ID
 * @param {string} key - Optional specific key to clear
 */
export function clearCache(userId, key = null) {
  if (!userId) return;
  
  if (key) {
    const fullKey = `${CACHE_PREFIX}${userId}_${key}`;
    localStorage.removeItem(fullKey);
  } else {
    // Clear all keys starting with prefix + userId
    const prefix = `${CACHE_PREFIX}${userId}_`;
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith(prefix)) {
        localStorage.removeItem(k);
      }
    });
  }
}

/**
 * TTL Constants (in milliseconds)
 */
export const CACHE_TTL = {
  HOMEWORK: 90000,      // 90s average
  SUBMISSIONS: 45000,   // 45s average
  RESULTS: 450000,      // 7.5m average
  DASHBOARD: 60000,     // 60s
  PROFILE: 300000       // 5m
};
