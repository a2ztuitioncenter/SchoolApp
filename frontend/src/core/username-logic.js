import { authAPI } from './api.js';
import { USERNAME_RULES } from './constants.js';

/**
 * Shared Username Availability Logic
 * Optimized with debouncing, request cancellation, and local validation.
 */
export class UsernameAvailabilityChecker {
    constructor(onStatusChange) {
        this.onStatusChange = onStatusChange;
        this.debounceTimer = null;
        this.abortController = null;
        this.lastCheckedValue = '';
        this.cache = new Map();
    }

    validateLocal(username) {
        if (!username) return 'idle';
        if (username.length < USERNAME_RULES.MIN_LENGTH) return 'invalid_short';
        if (username.length > USERNAME_RULES.MAX_LENGTH) return 'invalid_long';
        if (!USERNAME_RULES.PATTERN.test(username)) return 'invalid_format';
        return 'valid';
    }

    async check(username) {
        const val = username.trim();
        
        // 1. Skip if same as last check
        if (val === this.lastCheckedValue) return;
        this.lastCheckedValue = val;

        // 2. Clear pending tasks
        clearTimeout(this.debounceTimer);
        if (this.abortController) {
            this.abortController.abort();
        }

        // 3. Local validation
        const localStatus = this.validateLocal(val);
        if (localStatus !== 'valid') {
            this.onStatusChange(localStatus, val);
            return;
        }

        // 4. Cache check
        if (this.cache.has(val)) {
            this.onStatusChange(this.cache.get(val) ? 'available' : 'taken', val);
            return;
        }

        // 5. Debounce API call
        this.onStatusChange('checking', val);
        this.debounceTimer = setTimeout(async () => {
            this.abortController = new AbortController();
            
            try {
                const res = await authAPI.checkUsername(val, { signal: this.abortController.signal });
                const isAvailable = res.available;
                
                // Update cache
                this.cache.set(val, isAvailable);
                
                this.onStatusChange(isAvailable ? 'available' : 'taken', val);
            } catch (err) {
                if (err.name === 'AbortError') return;
                console.error('Username check failed', err);
                this.onStatusChange('error', val);
            }
        }, 500);
    }
}
