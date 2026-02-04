/**
 * 用户数据增强服务
 *
 * 允许不同功能模块向用户对象补充额外数据（如勋章、积分、头像框等）。
 * 支持单用户增强和批量增强两种模式。
 */
class UserEnricher {
  constructor() {
    this.enrichers = [];
    this.batchEnrichers = [];
    // 默认使用静默 logger（不输出注册日志，仅输出错误）
    this.logger = {
      debug: () => {},
      info: () => {},
      warn: console.warn.bind(console),
      error: console.error.bind(console),
    };
  }

  /**
   * 设置日志实例
   * 应在 Fastify 初始化时调用：userEnricher.setLogger(fastify.log)
   * @param {object} logger - 日志实例（fastify.log 或 pino 实例）
   */
  setLogger(logger) {
    this.logger = logger;
  }

  /**
   * 注册一个新的增强器
   * @param {string} name - 增强器的唯一名称
   * @param {function} callback - 异步函数 (user, context) => Promise<void>，直接修改用户对象
   */
  register(name, callback) {
    this.enrichers.push({ name, callback });
    this.logger.debug(`[用户增强] 已注册: ${name}`);
  }

  /**
   * 注册一个新的批量增强器
   * @param {string} name - 增强器的唯一名称
   * @param {function} callback - 异步函数 (users[], context) => Promise<void>，直接修改数组中的用户对象
   */
  registerBatch(name, callback) {
    this.batchEnrichers.push({ name, callback });
    this.logger.debug(`[用户增强] 已注册批量处理器: ${name}`);
  }

  /**
   * 在用户对象上运行所有注册的增强器
   * @param {object} user - 要增强的用户对象
   * @param {object} context - 可选上下文（例如 request 对象）
   * @returns {Promise<object>} 增强后的用户对象
   */
  async enrich(user, context = {}) {
    if (!user) return;

    // 并行运行所有增强器以提高性能
    await Promise.all(
      this.enrichers.map(async ({ name, callback }) => {
        try {
          await callback(user, context);
        } catch (err) {
          // 如果一个增强器失败，不要导致整个请求失败
          this.logger.error(`[用户增强] ${name} 执行失败: ${err.message}`);
        }
      })
    );

    return user;
  }

  /**
   * 在用户列表上运行所有注册的批量增强器
   * @param {object[]} users - 要增强的用户对象列表
   * @param {object} context - 可选上下文
   * @returns {Promise<object[]>} 增强后的用户对象列表
   */
  async enrichMany(users, context = {}) {
    if (!users || users.length === 0) return users;

    // 并行运行所有批量增强器
    await Promise.all(
      this.batchEnrichers.map(async ({ name, callback }) => {
        try {
          await callback(users, context);
        } catch (err) {
          this.logger.error(`[用户增强] 批量处理器 ${name} 执行失败: ${err.message}`);
        }
      })
    );

    return users;
  }
}

export const userEnricher = new UserEnricher();

