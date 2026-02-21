/**
 * 核心可见性逻辑工具
 * 用于统一处理"拉黑"、"封禁"等场景下的数据隐藏/脱敏逻辑
 */

/**
 * 判断是否应该隐藏用户信息（头像、签名等）
 * 规则：
 * 1. 如果用户被封禁 (isBanned)，且查看者没有管理权限 (canManageUsers)，则隐藏
 *
 * @param {Object} targetUser - 目标用户对象 (包含 isBanned 字段)
 * @param {boolean} canManageUsers - 查看者是否有管理权限
 * @returns {boolean} - 是否应该隐藏
 */
export function shouldHideUserInfo(targetUser, canManageUsers) {
    if (!targetUser) return false;
    // 如果用户被封禁且查看者不是有权限的人员，则隐藏
    return targetUser.isBanned && !canManageUsers;
}

/**
 * 批量处理列表项中的用户信息可见性
 * 将被封禁用户的头像置为 null
 *
 * @param {Array} items - 包含用户信息的数据列表
 * @param {boolean} canManageUsers - 查看者是否有管理权限
 * @param {Object} options - 配置项
 * @param {string} options.userKey - 数据项中用户对象所在的字段名，默认为 null (即数据项本身就是包含用户信息的扁平对象)
 * @param {string} options.bannedKey - 判断封禁状态的键名，默认为 'userIsBanned'
 * @param {string} options.avatarKey - 需要隐藏的头像键名，默认为 'userAvatar'
 */
export function applyUserInfoVisibility(items, canManageUsers, options = {}) {
    const {
        userKey = null,
        bannedKey = 'userIsBanned',
        avatarKey = 'userAvatar'
    } = options;

    if (!items || !Array.isArray(items)) return;

    items.forEach(item => {
        const target = userKey ? item[userKey] : item;
        if (!target) return;

        // 注意：这里我们假设 item 中有表示是否封禁的字段
        // 如果是扁平结构 (Join 出来的)，通常是 userIsBanned
        // 如果是嵌套结构 (ORM 出来的)，可能是 user.isBanned
        const isBanned = target[bannedKey];

        if (isBanned && !canManageUsers) {
            target[avatarKey] = null;
        }

        // 清理掉敏感的封禁状态字段，避免泄露给前端
        // (虽然前端可以通过头像是否为空推断，但显式的 isBanned 字段通常不该返回给普通用户)
        // 注意：这一步是副作用，会修改原对象
        if (!canManageUsers && bannedKey in target) {
           delete target[bannedKey];
        }
    });
}
