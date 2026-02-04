import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import env from '../config/env.js';
import * as schema from './schema.js';

const { Pool } = pg;

// 显式创建连接池，以便管理生命周期
export const pool = new Pool({ 
  connectionString: env.db.url,
  max: 10, // 连接池大小，可根据需求调整
  idleTimeoutMillis: 30000
});

// 处理连接池错误，防止后台连接断开导致进程崩溃
pool.on('error', (err) => {
  console.error('[数据库] 闲置连接发生异常错误:', err);
});

// 传入 schema 以启用查询构建器的智能提示和关系查询
const db = drizzle(pool, { schema });

export default db;
