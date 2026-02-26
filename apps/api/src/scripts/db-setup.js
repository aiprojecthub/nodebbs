/**
 * 数据库扩展和索引初始化脚本
 *
 * 用于手动创建 Drizzle schema 无法管理的数据库扩展和自定义索引。
 * 所有 SQL 使用 IF NOT EXISTS，幂等安全，可重复执行。
 *
 * 使用方式：
 *   pnpm run db:index
 *   # 或 Docker 环境
 *   docker exec nodebbs-api pnpm run db:index
 */
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const statements = [
  {
    name: 'pg_trgm 扩展',
    sql: 'CREATE EXTENSION IF NOT EXISTS pg_trgm',
  },
  {
    name: 'topics.title GIN 索引',
    sql: 'CREATE INDEX IF NOT EXISTS topics_title_trgm_idx ON topics USING gin (title gin_trgm_ops)',
  },
  {
    name: 'posts.raw_content GIN 索引',
    sql: 'CREATE INDEX IF NOT EXISTS posts_raw_content_trgm_idx ON posts USING gin (raw_content gin_trgm_ops)',
  },
  {
    name: 'users.username GIN 索引',
    sql: 'CREATE INDEX IF NOT EXISTS users_username_trgm_idx ON users USING gin (username gin_trgm_ops)',
  },
  {
    name: 'users.name GIN 索引',
    sql: 'CREATE INDEX IF NOT EXISTS users_name_trgm_idx ON users USING gin (name gin_trgm_ops)',
  },
];

async function main() {
  console.log('🔧 开始初始化数据库扩展和索引...\n');

  let success = 0;
  let failed = 0;

  for (const { name, sql } of statements) {
    try {
      await pool.query(sql);
      console.log(`  ✅ ${name}`);
      success++;
    } catch (err) {
      console.error(`  ❌ ${name}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n完成: ${success} 成功, ${failed} 失败`);
  await pool.end();
  process.exit(failed > 0 ? 1 : 0);
}

main();
