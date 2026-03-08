/**
 * 统一分页器工具
 *
 * 支持两种分页模式，根据前端传参自动切换：
 *
 * 1. Page 模式（传统偏移分页）
 *    - 前端传参：?page=2&limit=20
 *    - 适用场景：所有排序方式，需要总数和页码跳转时
 *
 * 2. Cursor 模式（游标分页）
 *    - 前端传参：?cursor=xxx&limit=20（cursor 值来自上一次响应的 nextCursor）
 *    - 触发条件：URL 带 cursor 参数 且 接口配置了 cursorKeys
 *    - 适用场景：信息流无限滚动，排序字段值稳定（如时间戳、自增 ID）
 *    - 不适用：计算型排序（如 popular/trending），因为分数会实时变化
 *
 * 职责：
 * 纯粹地解析前端分页参数，输出标准化的带有游标/偏移量指令的对象，
 * 绝不侵入数据库执行层。
 */

/**
 * 创建标准分页器对象
 * @param {Object} query - HTTP 请求对象中的 query (例如 fastify request.query)
 * @param {Object} [options={}] - 分页配置选项
 * @param {Array<string>|boolean} [options.cursorKeys] - 游标字段数组。不传则为纯 page 模式；传入 `['id']` 等数组启用游标
 * @param {number} [options.maxLimit=100] - 允许的最大每页条数
 * @param {number} [options.defaultLimit=20] - 默认每页条数
 * 
 * ⚠️ 重要：cursorKeys 中的字段必须与业务查询的 ORDER BY 子句严格一致（顺序和方向都要对应）。
 * 如果 ORDER BY 是 `isPinned DESC, lastPostAt DESC, id DESC`，
 * 那么 cursorKeys 必须是 `['isPinned', 'lastPostAt', 'id']`。
 * 不匹配会导致翻页时数据遗漏或重复。
 * 
 * @returns {Object} 包含 `fetchSize`, `offset`, `cursorEnabled`, `hasCursor`, `cursorData` 等标准属性与裁剪方法的 Paginator
 */
export function createPaginator(query, options = {}) {
  const {
    cursorKeys: rawCursorKeys,
    maxLimit = 100,
    defaultLimit = 20,
  } = options;

  // 解析游标配置
  let cursorKeys = [];
  if (Array.isArray(rawCursorKeys)) {
    cursorKeys = rawCursorKeys;
  } else if (rawCursorKeys === true) {
    cursorKeys = ['id'];
  } else {
    cursorKeys = []; // 未传入或传入 false，不启用游标
  }

  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number(query.limit) || defaultLimit)); 
  const rawCursor = query.cursor;

  // 前端通过 URL 传入 ?cursor=xxx 且接口配置了 cursorKeys，即触发游标模式
  const hasCursor = cursorKeys.length > 0 && !!rawCursor;

  const paginator = {
    hasCursor,
    limit,
    // 只有触发了游标模式才多拉取 1 条用于探测下一页
    fetchSize: hasCursor ? limit + 1 : limit,
    offset: hasCursor ? 0 : (page - 1) * limit,
    page: hasCursor ? 1 : page,
    
    // 解码后的游标对象，供业务层自己拼接 where 条件；首次请求或解码失败时为 null
    cursorData: null,

    /**
     * 对查询结果进行分页处理：提取下一页游标并裁剪多余的探测数据
     * @param {Array} results - 数据库返回的结果集（使用 fetchSize 查询的原始结果）
     * @returns {{ items: Array, nextCursor: string|null }} items 为裁剪后的数据，nextCursor 供前端下次请求使用
     */
    paginate: (results) => {
      let nextCursor = null;

      if (hasCursor && results.length > limit) {
        // 取实际最后一条数据生成下一页游标
        const lastItem = results[limit - 1];
        const cursorObj = {};
        for (const key of cursorKeys) {
          cursorObj[key] = lastItem[key];
        }
        nextCursor = Buffer.from(JSON.stringify(cursorObj)).toString('base64');
      }

      const items = hasCursor && results.length > limit
        ? results.slice(0, limit)
        : results;

      return { items, nextCursor };
    },
  };

  // 尝试解码 Cursor（任何非 base64 值解码失败都会被忽略，等同于首次游标请求）
  if (hasCursor) {
    try {
      const decoded = JSON.parse(Buffer.from(rawCursor, 'base64').toString('utf-8'));
      // 确保解码结果是一个有效对象
      if (decoded && typeof decoded === 'object') {
        paginator.cursorData = decoded;
      }
    } catch {
      // 解码失败（cursor=true / 1 / x / 任意非法值）→ cursorData 保持 null
      // 业务层通过 cursorData === null 判断"首次游标请求，无需拼 WHERE 条件"
    }
  }

  return paginator;
}
