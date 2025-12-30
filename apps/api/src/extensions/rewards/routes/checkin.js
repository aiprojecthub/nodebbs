import { checkIn } from '../services/rewardService.js';

export default async function checkInRoutes(fastify, options) {
  // 每日签到
  fastify.post('/check-in', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['rewards'],
      description: '每日签到获取积分',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            amount: { type: 'number' },
            balance: { type: 'number' },
            checkInStreak: { type: 'number' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const result = await checkIn(fastify, request.user.id);
      return result;
    } catch (error) {
      if (error.message === '积分系统未启用' || error.message === '奖励系统未启用') {
        // 静默处理：如果系统未启用，不返回错误，前端也不会提示
        return { message: '积分系统未启用' };
      }
      fastify.log.error('[签到] 失败:', error);
      // 静默处理：其它错误也不中断前端体验
      return { message: error.message || 'ok' };
    }
  });
  // 获取签到状态
  fastify.get('/check-in', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['rewards'],
      description: '获取今日签到状态',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
             checkInStreak: { type: 'number' },
             lastCheckInDate: { type: ['string', 'null'] },
             isCheckedIn: { type: 'boolean' }
          }
        }
      }
    }
  }, async (request, reply) => {
      const { getUserCheckInStatus } = await import('../services/rewardService.js');
      const data = await getUserCheckInStatus(fastify, request.user.id);
      
      let isCheckedIn = false;
      if (data.lastCheckInDate) {
         const today = new Date();
         today.setHours(0,0,0,0);
         const lastDate = new Date(data.lastCheckInDate);
         lastDate.setHours(0,0,0,0);
         isCheckedIn = lastDate.getTime() === today.getTime();
      }

      return {
          checkInStreak: data.checkInStreak,
          lastCheckInDate: data.lastCheckInDate,
          isCheckedIn
      };
  });
}
