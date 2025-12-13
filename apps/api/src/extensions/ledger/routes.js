import { sysAccounts, sysTransactions, sysCurrencies } from './schema.js';
import db from '../../db/index.js';
import { eq, and, desc, sql, gte, lt, count } from 'drizzle-orm';
import { users } from '../../db/schema.js';

export default async function ledgerRoutes(fastify, options) {
  
  // ============ 统一接口 ============
  
  // 1. 获取统计数据 (仪表盘) - 仅限管理员
  fastify.get('/stats', {
    preHandler: [fastify.authenticate, fastify.requireAdmin],
    schema: {
      tags: ['ledger'],
      description: '获取账本统计数据（仅限管理员）。返回每种货币的统计列表。',
      querystring: {
        type: 'object',
        properties: {
          currency: { type: 'string' },
          userId: { type: 'integer' }
        }
      }
    }
  }, async (req, reply) => {
    const { currency, userId } = req.query;
    
    // 确定范围
    let targetUserId = undefined;
    let isSystemStats = true;

    if (userId) {
      targetUserId = userId; // 管理员查看特定用户
      isSystemStats = false;
    }

    // 获取需要处理的货币
    let currenciesToProcess = [];
    if (currency) {
      const [curr] = await db.select().from(sysCurrencies).where(eq(sysCurrencies.code, currency));
      if (curr) currenciesToProcess = [curr];
    } else {
      currenciesToProcess = await db.select().from(sysCurrencies).where(eq(sysCurrencies.isActive, true));
    }

    const results = [];
    for (const curr of currenciesToProcess) {
      if (isSystemStats) {
        results.push(await getSystemStats(curr.code));
      } else {
        results.push(await getUserStats(targetUserId, curr.code));
      }
    }
    
    return results;
  });

  // 辅助函数：获取用户统计
  async function getUserStats(targetUserId, currencyCode) {
      const [account] = await db.select()
        .from(sysAccounts)
        .where(and(
            eq(sysAccounts.userId, targetUserId),
            eq(sysAccounts.currencyCode, currencyCode)
        ));
      
      return {
          scope: 'user',
          currency: currencyCode,
          balance: account ? Number(account.balance) : 0,
          totalEarned: account ? Number(account.totalEarned) : 0,
          totalSpent: account ? Number(account.totalSpent) : 0,
          userId: targetUserId
      };
  }

  // 辅助函数：获取系统统计
  async function getSystemStats(currencyCode) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // 1. 总流通量
      const [circulation] = await db
        .select({ total: sql`sum(${sysAccounts.balance})` })
        .from(sysAccounts)
        .where(eq(sysAccounts.currencyCode, currencyCode));
      
      // 2. 今日获取
      const [earned] = await db
        .select({ total: sql`sum(${sysTransactions.amount})` })
        .from(sysTransactions)
        .where(and(
            eq(sysTransactions.currencyCode, currencyCode),
            gte(sysTransactions.amount, 0),
            gte(sysTransactions.createdAt, today),
            lt(sysTransactions.createdAt, tomorrow)
        ));

      // 3. 今日消耗
      const [spent] = await db
        .select({ total: sql`sum(${sysTransactions.amount})` })
        .from(sysTransactions)
        .where(and(
            eq(sysTransactions.currencyCode, currencyCode),
            lt(sysTransactions.amount, 0),
            gte(sysTransactions.createdAt, today),
            lt(sysTransactions.createdAt, tomorrow)
        ));

      // 4. 用户数量
      const [usersCount] = await db
        .select({ count: count() })
        .from(sysAccounts)
        .where(eq(sysAccounts.currencyCode, currencyCode));

      return {
          scope: 'system',
          currency: currencyCode,
          totalCirculation: Number(circulation?.total || 0),
          todayEarned: Number(earned?.total || 0),
          todaySpent: Math.abs(Number(spent?.total || 0)),
          userCount: Number(usersCount?.count || 0)
      };
  }

  // 2. 获取交易记录 (统一接口)
  fastify.get('/transactions', {
    preHandler: [fastify.authenticate],
    schema: {
        tags: ['ledger'],
        querystring: {
            type: 'object',
            properties: {
                page: { type: 'integer', default: 1 },
                limit: { type: 'integer', default: 20 },
                currency: { type: 'string' },
                userId: { type: 'integer' }
            }
        }
    }
  }, async (req, reply) => {
       const { page, limit, currency, userId } = req.query;
       const offset = (page - 1) * limit;
       
       let filterUserId = req.user.id;
       const isAdmin = req.user.role === 'admin';

       if (isAdmin) {
           if (userId) {
               filterUserId = userId; // 管理员查看特定用户
           } else {
               filterUserId = undefined; // 管理员查看全局流
           }
       } else {
           // 普通用户查看自己的交易
           filterUserId = req.user.id;
       }
       
       const whereClause = and(
           filterUserId ? eq(sysTransactions.userId, filterUserId) : undefined,
           currency ? eq(sysTransactions.currencyCode, currency) : undefined
       );
       
       const items = await db.select({
           id: sysTransactions.id,
           userId: sysTransactions.userId,
           username: users.username,
           currencyCode: sysTransactions.currencyCode,
           amount: sysTransactions.amount,
           balance: sysTransactions.balanceAfter, // 前端使用的别名
           type: sysTransactions.type,
           referenceType: sysTransactions.referenceType,
           referenceId: sysTransactions.referenceId,
           description: sysTransactions.description,
           createdAt: sysTransactions.createdAt,
           metadata: sysTransactions.metadata
       })
         .from(sysTransactions)
         .leftJoin(users, eq(sysTransactions.userId, users.id))
         .where(whereClause)
         .orderBy(desc(sysTransactions.createdAt))
         .limit(limit)
         .offset(offset);
         
       const [total] = await db.select({ count: sql`count(*)` })
         .from(sysTransactions)
         .where(whereClause);
         
       return {
           items,
           total: Number(total.count),
           page,
           limit
       };
  });

  // 3. 获取余额 (指定货币) - 替代 /rewards/balance
  fastify.get('/balance', {
      preHandler: [fastify.authenticate],
      schema: {
          tags: ['ledger'],
          querystring: {
              type: 'object',
              properties: {
                  currency: { type: 'string', default: 'credits' },
                  userId: { type: 'integer' }
              }
          }
      }
  }, async (req, reply) => {
      const { currency = 'credits', userId } = req.query;
      
      let targetUserId = req.user.id;
      if (req.user.role === 'admin' && userId) {
          targetUserId = userId;
      }

      const [account] = await db.select()
        .from(sysAccounts)
        .where(and(
            eq(sysAccounts.userId, targetUserId),
            eq(sysAccounts.currencyCode, currency)
        ));

      return {
          userId: targetUserId,
          currency,
          balance: account ? Number(account.balance) : 0
      };
  });

  // 4. 获取所有账户 (用户钱包) - 保持现有
  fastify.get('/accounts', {
    preHandler: [fastify.authenticate],
    schema: {
        tags: ['ledger'],
        description: '获取所有钱包账户'
    }
  }, async (req, reply) => {
      // 1. 获取所有活跃货币
      const currencies = await db.select().from(sysCurrencies).where(eq(sysCurrencies.isActive, true));
      
      // 2. 获取用户账户
      const accounts = await db.select().from(sysAccounts).where(eq(sysAccounts.userId, req.user.id));
      
      const accountMap = new Map();
      accounts.forEach(a => accountMap.set(a.currencyCode, a));
      
      const result = currencies.map(c => {
          const acc = accountMap.get(c.code);
          return {
              currency: c,
              balance: acc ? Number(acc.balance) : 0,
              totalEarned: acc ? Number(acc.totalEarned) : 0,
              isFrozen: acc ? acc.isFrozen : false
          };
      });
      
      return result;
  });

  // ============ 管理员配置 (重命名) ============
  
  // 获取所有货币 - 从 /admin/currencies 重命名 (仍需管理员权限)
  fastify.get('/currencies', {
      preHandler: [fastify.authenticate, fastify.requireAdmin],
      schema: {
          tags: ['ledger'],
          description: '获取所有货币配置'
      }
  }, async (req, reply) => {
      return db.select().from(sysCurrencies).orderBy(sysCurrencies.id);
  });

  // 更新/插入货币 (辅助路由，保留 /currencies POST)
  fastify.post('/currencies', {
      preHandler: [fastify.authenticate, fastify.requireAdmin],
      schema: {
          tags: ['ledger']
          // ... 剩余 schema
      }
  }, async (req, reply) => {
      const { code, name, symbol, rate, isActive } = req.body;
      await db.insert(sysCurrencies).values({
          code, name, symbol, isActive: isActive !== undefined ? isActive : true
      }).onConflictDoUpdate({
          target: sysCurrencies.code,
          set: { name, symbol, isActive }
      });
      return { success: true };
  });

  // 管理员操作：发放/扣除货币 (通用)
  fastify.post('/admin/operation', {
    preHandler: [fastify.authenticate, fastify.requireAdmin],
    schema: {
        tags: ['ledger'],
        description: '管理员发放或扣除用户货币',
        body: {
            type: 'object',
            required: ['userId', 'currency', 'amount', 'type'],
            properties: {
                userId: { type: 'integer' },
                currency: { type: 'string' },
                amount: { type: 'number', minimum: 0 },
                type: { type: 'string', enum: ['grant', 'deduct'] },
                description: { type: 'string' }
            }
        }
    }
  }, async (req, reply) => {
      const { userId, currency, amount, type, description } = req.body;
      const service = fastify.ledger;

      if (type === 'grant') {
          await service.grant({
              userId,
              amount,
              currencyCode: currency,
              type: 'admin_grant',
              referenceType: 'admin_operation',
              referenceId: req.user.id, // 管理员ID作为参考
              description: description || '管理员后台发放'
          });
      } else {
          await service.deduct({
              userId,
              amount,
              currencyCode: currency,
              type: 'admin_deduct',
              referenceType: 'admin_operation',
              referenceId: req.user.id,
              description: description || '管理员后台扣除',
              allowNegative: true // 允许扣成负数? 暂时允许，符合管理员强制操作
          });
      }

      return { success: true };
  });

}
