/**
 * API 服务入口文件
 *
 * 职责：
 * - 创建 Fastify 实例并配置全局选项
 * - 注册服务器模块
 * - 启动 HTTP 服务监听
 */
'use strict';

import Fastify from 'fastify';
import server from './server.js';
import env from './config/env.js';

/**
 * 日志配置
 * - 开发环境：debug 级别 + pino-pretty 彩色输出
 * - 生产环境：info 级别 + JSON 格式
 */
const logger = {
  level: env.isDev ? 'debug' : 'info',
  transport: env.isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
          singleLine: false,
        },
      }
    : undefined,
};

/**
 * 创建 Fastify 应用实例
 */
const app = Fastify({
  logger,
  disableRequestLogging: true, // 禁用默认的请求日志，由自定义中间件处理
  trustProxy: true, // 信任反向代理（用于获取真实客户端 IP）
  ajv: {
    customOptions: {
      allowUnionTypes: true, // 允许 JSON Schema 联合类型（如 type: ['integer', 'null']）
    },
  },
});

// 注册服务器模块（包含所有插件、扩展和路由）
app.register(server);

/**
 * 启动服务监听
 */
app.listen(
  { port: env.app.port, host: env.app.host },
  (err, address) => {
    if (err) {
      app.log.error(err);
      process.exit(1);
    }
    app.log.info(`[系统] 服务启动成功，地址: ${address}`);
  }
);
