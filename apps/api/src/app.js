'use strict';

import Fastify from 'fastify';
import server from './server.js';
import { isDev } from './utils/env.js';

const logger = {
  level: isDev ? 'debug' : 'info',
  transport: isDev
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

const app = Fastify({
  logger,
  disableRequestLogging: true, // 禁用默认的请求日志
  trustProxy: true,
});

app.register(server);

app.listen(
  { port: process.env.PORT || 7100, host: process.env.HOST || '0.0.0.0' },
  (err, address) => {
    if (err) {
      app.log.error(err);
      process.exit(1);
    }
    app.log.info(`服务启动成功，访问地址: ${address}`);
  }
);
