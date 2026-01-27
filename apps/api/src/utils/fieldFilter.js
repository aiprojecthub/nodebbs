/**
 * 字段过滤工具
 *
 * 参考 accesscontrol 的属性过滤语法，支持：
 * - ['*']                    所有字段
 * - ['name', 'email']        仅指定字段（白名单）
 * - ['*', '!password']       所有字段排除指定字段
 * - ['*', '!user.password']  支持嵌套路径
 * - ['user.*', '!user.id']   嵌套对象的通配符
 *
 * 使用示例：
 * const filter = createFieldFilter(['*', '!password', '!user.secret']);
 * const filtered = filter(data);
 */

/**
 * 解析字段过滤规则
 * @param {string|string[]} rules - 过滤规则
 * @returns {{ include: Set<string>, exclude: Set<string>, hasWildcard: boolean }}
 */
export function parseFieldRules(rules) {
  // 支持 JSON 字符串或数组
  const ruleArray = typeof rules === 'string' ? JSON.parse(rules) : rules;

  if (!Array.isArray(ruleArray) || ruleArray.length === 0) {
    return { include: new Set(), exclude: new Set(), hasWildcard: true };
  }

  const include = new Set();
  const exclude = new Set();
  let hasWildcard = false;

  for (const rule of ruleArray) {
    if (typeof rule !== 'string') continue;

    const trimmed = rule.trim();
    if (trimmed === '*') {
      hasWildcard = true;
    } else if (trimmed.startsWith('!')) {
      exclude.add(trimmed.slice(1));
    } else {
      include.add(trimmed);
    }
  }

  return { include, exclude, hasWildcard };
}

/**
 * 检查路径是否匹配模式
 * @param {string} path - 字段路径 (如 'user.password')
 * @param {string} pattern - 模式 (如 'user.*' 或 'user.password')
 * @returns {boolean}
 */
function matchPath(path, pattern) {
  if (pattern === path) return true;

  // 处理通配符 user.* 匹配 user.name, user.email 等
  if (pattern.endsWith('.*')) {
    const prefix = pattern.slice(0, -1); // 'user.'
    return path.startsWith(prefix);
  }

  // 处理 * 匹配顶级字段
  if (pattern === '*') {
    return !path.includes('.');
  }

  return false;
}

/**
 * 检查路径是否在排除列表中
 * @param {string} path - 字段路径
 * @param {Set<string>} excludeSet - 排除集合
 * @returns {boolean}
 */
function isExcluded(path, excludeSet) {
  for (const pattern of excludeSet) {
    if (matchPath(path, pattern)) return true;
  }
  return false;
}

/**
 * 检查路径是否在包含列表中
 * @param {string} path - 字段路径
 * @param {Set<string>} includeSet - 包含集合
 * @returns {boolean}
 */
function isIncluded(path, includeSet) {
  for (const pattern of includeSet) {
    if (matchPath(path, pattern)) return true;
    // 如果 include 有 'user.*'，则 'user' 本身也应该被包含（作为容器）
    if (pattern.endsWith('.*') && path === pattern.slice(0, -2)) return true;
  }
  return false;
}

/**
 * 递归过滤对象
 * @param {any} obj - 要过滤的对象
 * @param {Object} rules - 解析后的规则
 * @param {string} prefix - 当前路径前缀
 * @returns {any}
 */
function filterObject(obj, rules, prefix = '') {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => filterObject(item, rules, prefix));
  }

  const { include, exclude, hasWildcard } = rules;
  const result = {};

  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;

    // 检查是否应该排除
    if (isExcluded(path, exclude)) {
      continue;
    }

    // 判断是否应该包含
    let shouldInclude = false;

    if (hasWildcard) {
      // 通配符模式：默认包含所有，除非被排除
      shouldInclude = true;
    } else {
      // 白名单模式：只包含明确列出的字段
      shouldInclude = isIncluded(path, include);

      // 如果是嵌套对象，检查是否有子路径需要包含
      if (!shouldInclude && typeof value === 'object' && value !== null) {
        for (const pattern of include) {
          if (pattern.startsWith(path + '.')) {
            shouldInclude = true;
            break;
          }
        }
      }
    }

    if (shouldInclude) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const filteredValue = filterObject(value, rules, path);
        // 只有非空对象才添加
        if (Object.keys(filteredValue).length > 0) {
          result[key] = filteredValue;
        }
      } else if (Array.isArray(value)) {
        result[key] = value.map(item =>
          typeof item === 'object' && item !== null
            ? filterObject(item, rules, path)
            : item
        );
      } else {
        result[key] = value;
      }
    }
  }

  return result;
}

/**
 * 创建字段过滤器
 * @param {string|string[]} rules - 过滤规则
 * @returns {function(any): any} 过滤函数
 *
 * @example
 * // 所有字段，排除 password
 * const filter = createFieldFilter(['*', '!password']);
 * filter({ name: 'John', password: '123' }); // { name: 'John' }
 *
 * @example
 * // 只要 name 和 email
 * const filter = createFieldFilter(['name', 'email']);
 * filter({ name: 'John', email: 'a@b.com', age: 20 }); // { name: 'John', email: 'a@b.com' }
 *
 * @example
 * // 嵌套字段
 * const filter = createFieldFilter(['*', '!user.password']);
 * filter({ id: 1, user: { name: 'John', password: '123' } });
 * // { id: 1, user: { name: 'John' } }
 */
export function createFieldFilter(rules) {
  const parsedRules = parseFieldRules(rules);

  return function filter(data) {
    if (data === null || data === undefined) return data;
    return filterObject(data, parsedRules);
  };
}

/**
 * 直接过滤数据（不创建可复用的过滤器）
 * @param {any} data - 要过滤的数据
 * @param {string|string[]} rules - 过滤规则
 * @returns {any} 过滤后的数据
 */
export function filterFields(data, rules) {
  return createFieldFilter(rules)(data);
}

/**
 * 合并多个过滤规则
 * 用于合并多个角色的字段过滤规则
 * @param {...(string|string[])} ruleSets - 多个规则集
 * @returns {string[]} 合并后的规则
 */
export function mergeFieldRules(...ruleSets) {
  const allInclude = new Set();
  const allExclude = new Set();
  let hasWildcard = false;

  for (const rules of ruleSets) {
    const { include, exclude, hasWildcard: wild } = parseFieldRules(rules);

    if (wild) hasWildcard = true;
    include.forEach(i => allInclude.add(i));
    exclude.forEach(e => allExclude.add(e));
  }

  // 合并规则时，取最宽松的权限
  // 如果任一规则有通配符，则结果也有通配符
  // 排除列表取交集（都排除的才排除）
  const result = [];

  if (hasWildcard) {
    result.push('*');
    // 只保留所有规则集都排除的字段
    // 这里简化处理：如果有 wildcard，保留所有排除项
    // 实际场景可能需要更复杂的交集逻辑
    allExclude.forEach(e => result.push(`!${e}`));
  } else {
    // 白名单模式：取并集
    allInclude.forEach(i => result.push(i));
  }

  return result;
}
