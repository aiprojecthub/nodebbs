import {
  Bell,
  MessageCircle,
  UserPlus,
  Medal,
  Gift,
  Coins,
  CheckCheck,
  ThumbsUp,
  Trophy,
} from 'lucide-react';

export const getNotificationIcon = (type) => {
  switch (type) {
    case 'reply':
    case 'topic_reply':
      return <MessageCircle className='h-4 w-4 text-blue-500' />;
    case 'mention':
      return <MessageCircle className='h-4 w-4 text-purple-500' />;
    case 'like':
      return <ThumbsUp className='h-4 w-4 text-red-500' />;
    case 'follow':
      return <UserPlus className='h-4 w-4 text-green-500' />;
    case 'message':
      return <MessageCircle className='h-4 w-4 text-blue-500' />;
    case 'badge_earned':
      return <Medal className='h-4 w-4 text-yellow-500' />;
    case 'gift_received':
      return <Gift className='h-4 w-4 text-pink-500' />;
    case 'reward':
    case 'reward_topic':
    case 'reward_reply':
      return <Coins className='h-4 w-4 text-yellow-500' />;
    case 'lottery_won':
      return <Trophy className='h-4 w-4 text-amber-500' />;
    case 'lottery_lost':
      return <Gift className='h-4 w-4 text-muted-foreground' />;
    case 'lottery_drawn':
      return <Trophy className='h-4 w-4 text-amber-600' />;
    case 'report_resolved':
      return <CheckCheck className='h-4 w-4 text-green-600' />;
    case 'report_dismissed':
      return <Bell className='h-4 w-4 text-muted-foreground' />;
    case 'moderation_approved':
      return <CheckCheck className='h-4 w-4 text-green-600' />;
    case 'moderation_rejected':
      return <Bell className='h-4 w-4 text-red-500' />;
    default:
      return <Bell className='h-4 w-4' />;
  }
};

export const getNotificationMessage = (notification) => {
  switch (notification.type) {
    case 'topic_reply':
      return notification.topicTitle
        ? `在 "${notification.topicTitle}" 中回复了`
        : '在话题中回复了';
    case 'reply':
      // reply 类型有两种情况：回复话题 (Reply to Topic) 或 回复人 (Reply to User)
      // 通过检查原始 message 来区分
      // 兼容旧数据 ('帖子') 和新数据 ('回复了你')
      if (notification.message && (notification.message.includes('帖子') || notification.message.includes('回复了你'))) {
        return notification.topicTitle
          ? `在 "${notification.topicTitle}" 中回复了你`
          : '回复了你';
      }
      return notification.topicTitle
        ? `回复了你的话题 "${notification.topicTitle}"`
        : '回复了你的话题';
    case 'like':
      return notification.topicTitle
        ? `在 "${notification.topicTitle}" 中赞了你的回复`
        : '赞了你的回复';
    case 'mention':
      return notification.topicTitle
        ? `在 "${notification.topicTitle}" 中提到了你`
        : '在回复中提到了你';
    case 'follow':
      return '关注了你';
    case 'message':
      return '给你发送了一条新消息';
    case 'report_resolved':
      return '你的举报已处理';
    case 'report_dismissed':
      return '你的举报已驳回';
    case 'badge_earned':
      return notification.message || '恭喜！你获得了一枚新勋章';
    case 'gift_received':
      return notification.message;
    case 'reward':
      return '打赏了你的内容';
    case 'reward_topic':
      return '打赏了你的话题';
    case 'reward_reply':
      return '打赏了你的回复';
    case 'lottery_won':
    case 'lottery_lost':
    case 'lottery_drawn':
      return notification.message;
    case 'moderation_approved':
      return notification.message || '你提交的内容已通过审核';
    case 'moderation_rejected':
      return notification.message || '你提交的内容未通过审核';
    default:
      return notification.message || '发送了一条通知';
  }
};
