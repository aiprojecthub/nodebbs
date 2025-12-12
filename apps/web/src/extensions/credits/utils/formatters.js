/**
 * Formatting utilities for credits system
 */

/**
 * Format credits amount with thousands separator
 * @param {number} amount - Credits amount
 * @returns {string} Formatted string
 */
export function formatCredits(amount) {
  if (typeof amount !== 'number') return '0';
  return amount.toLocaleString();
}

/**
 * Format credits amount with sign (+ or -)
 * @param {number} amount - Credits amount
 * @returns {string} Formatted string with sign
 */
export function formatCreditsWithSign(amount) {
  if (typeof amount !== 'number') return '0';
  const sign = amount > 0 ? '+' : '';
  return `${sign}${amount.toLocaleString()}`;
}

/**
 * Get CSS class for credits amount based on positive/negative
 * @param {number} amount - Credits amount
 * @returns {string} CSS class name
 */
export function getCreditsColorClass(amount) {
  if (amount > 0) return 'text-green-600';
  if (amount < 0) return 'text-red-600';
  return 'text-muted-foreground';
}
