/**
 * 商品类型映射和工具函数
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
 * 获取商品类型的标签
 * @param {string} type - 商品类型键值
 * @returns {string} 可读标签
 */
export function getItemTypeLabel(type) {
  return ITEM_TYPE_LABELS[type] || type;
}

/**
 * 获取所有可筛选的商品类型选项
 * @param {boolean} includeAll - 是否包含“全部”选项
 * @returns {Array} {value, label} 对象数组
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
 * 检查商品是否过期
 * @param {string|null} expiresAt - ISO 日期字符串或 null
 * @returns {boolean}
 */
export function isItemExpired(expiresAt) {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}
