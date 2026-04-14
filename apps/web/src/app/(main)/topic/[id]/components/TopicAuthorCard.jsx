'use client';

import { useTopicContext } from '@/contexts/TopicContext';
import { useAuth } from '@/contexts/AuthContext';
import UserCard from '@/components/user/UserCard';

/**
 * 话题作者卡片组件
 */
export default function TopicAuthorCard() {
  const { topic } = useTopicContext();
  const { user } = useAuth();

  const isTopicOwner = user && topic.userId === user.id;

  const author = {
    avatar: topic.userAvatar,
    username: topic.username,
    name: topic.userName,
    avatarFrame: topic.userAvatarFrame,
    displayRole: topic.userDisplayRole,
  };

  const displayBadges = (isTopicOwner && user?.badges) ? user.badges : (topic.userBadges || []);

  return (
    <UserCard
      user={author}
      badges={displayBadges}
      variant="banner"
    />
  );
}
