/**
 * Item type mappings and utilities
 */

export const ITEM_TYPES = {
  AVATAR_FRAME: 'avatar_frame',
  BADGE: 'badge',
  CUSTOM: 'custom',
};

export const ITEM_TYPE_LABELS = {
  [ITEM_TYPES.AVATAR_FRAME]: '头像框',
  [ITEM_TYPES.BADGE]: '勋章',
  [ITEM_TYPES.CUSTOM]: '自定义',
};

/**
 * Get the label for an item type
 * @param {string} type - Item type key
 * @returns {string} Human-readable label
 */
export function getItemTypeLabel(type) {
  return ITEM_TYPE_LABELS[type] || type;
}

/**
 * Get all available item types for filtering
 * @param {boolean} includeAll - Whether to include 'all' option
 * @returns {Array} Array of {value, label} objects
 */
export function getItemTypeOptions(includeAll = true) {
  const options = Object.entries(ITEM_TYPE_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  if (includeAll) {
    return [{ value: 'all', label: '全部' }, ...options];
  }

  return options;
}

/**
 * Check if an item is expired
 * @param {string|null} expiresAt - ISO date string or null
 * @returns {boolean}
 */
export function isItemExpired(expiresAt) {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}
