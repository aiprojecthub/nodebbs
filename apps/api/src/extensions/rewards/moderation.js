import { eq } from 'drizzle-orm';
import { createFieldAdapter } from '../../services/moderation/adapters.js';
import { postRewards } from './schema.js';

/**
 * 打赏留言审核适配器（P2，kind='field'）。
 *
 * 审核开启时：转账照常、通知与账本描述用中性文案，留言不落 post_rewards.message，
 * 而是暂存于审核队列；通过后由 apply() 写回 message，公开打赏列表随即显示。
 * 由奖励扩展在其插件初始化时自注册（依赖 moderation 插件）。
 */
export function createRewardMessageAdapter() {
  return createFieldAdapter({
    type: 'reward_message',
    label: '打赏留言',
    field: 'message',
    layout: 'message',
    applyValue: async (dbx, rewardId, value) => {
      await dbx.update(postRewards).set({ message: value }).where(eq(postRewards.id, rewardId));
    },
    oplogTarget: (item) => ({
      targetType: 'post',
      targetId: item.snapshot?.meta?.postId ?? item.targetId,
      targetLabel: '打赏留言审核',
    }),
  });
}
