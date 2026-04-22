/**
 * Centralized utility functions for the frontend
 */

/**
 * Formats a date string into a human-readable format
 * @param {string|Date} date - The date to format
 * @returns {string} - Formatted date string (e.g., "Apr 22, 2026")
 */
export function formatDate(date) {
    if (!date) return 'N/A';
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return 'N/A';
        return d.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    } catch (err) {
        console.error('Error formatting date:', err);
        return 'N/A';
    }
}

/**
 * Formats a currency amount in INR
 * @param {number} amount - The amount to format
 * @returns {string} - Formatted currency string (e.g., "₹1,000")
 */
export function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount || 0);
}
