'use client';

import { Calendar, Users } from 'lucide-react';
import Link from '@/components/common/Link';
import StickySidebar from '@/components/common/StickySidebar';
import Time from '@/components/common/Time';
import FollowButton from '@/components/user/FollowButton';
import SendMessageButton from '@/components/user/SendMessageButton';
import BlockUserButton from '@/components/user/BlockUserButton';
import ReportUserButton from '@/components/user/ReportUserButton';
import UserCard from '@/components/user/UserCard';
import { useUserProfile } from '@/hooks/user/useUserProfile';

/**
 * 用户侧边栏组件
 * 显示用户信息、关注按钮、统计数据
 */
export default function UserSidebar({ user }) {
  const badges = user.badges || [];

  // 使用 Hook 管理关注状态
  const {
    username,
    followerCount,
    followingCount,
    isFollowing,
    handleFollowChange,
  } = useUserProfile({
    user,
    initialFollowerCount: user.followerCount,
    initialFollowingCount: user.followingCount,
    initialIsFollowing: user.isFollowing,
  });

  return (
    <div className='w-full lg:w-72 shrink-0'>
      <StickySidebar className='sticky top-[81px]' enabled={false}>
        <aside className='space-y-4'>
          {/* 用户头像和基本信息 */}
          <UserCard
            user={user}
            badges={badges}
            variant="default"
            avatarClassName="w-24 h-24"
          />

          <div className='flex flex-col items-center gap-4'>
            {/* 关注按钮 */}
            <FollowButton
              username={username}
              initialIsFollowing={isFollowing}
              onFollowChange={handleFollowChange}
            />

            {/* 关注者和粉丝 */}
            <div className='flex items-center gap-4 text-sm'>
              <Link
                href={`/users/${username}/followers`}
                className='flex items-center gap-1 hover:text-primary'
              >
                <Users className='h-4 w-4' />
                <span className='font-semibold'>{followerCount}</span>
                <span className='text-muted-foreground'>粉丝</span>
              </Link>
              <Link
                href={`/users/${username}/following`}
                className='flex items-center gap-1 hover:text-primary'
              >
                <span className='font-semibold'>{followingCount}</span>
                <span className='text-muted-foreground'>关注</span>
              </Link>
            </div>

            {/* 其他操作按钮 */}
            <div className='space-y-2 w-full px-4 md:px-8'>
              <SendMessageButton
                recipientId={user.id}
                recipientName={user.name || user.username}
                recipientMessagePermission={user.messagePermission}
              />
              <BlockUserButton
                userId={user.id}
                username={user.name || user.username}
              />
              <ReportUserButton
                userId={user.id}
                username={user.name || user.username}
              />
            </div>

            {/* 用户详细信息 */}
            <div className='space-y-3 text-sm'>
              <div className='flex items-center gap-2 text-muted-foreground'>
                <Calendar className='h-4 w-4' />
                <span>
                  加入于 <Time date={user.createdAt} format='YYYY年MM月DD日' />
                </span>
              </div>
            </div>
          </div>

          {/* 统计信息 */}
          <div className='border border-border rounded-lg p-4 bg-card'>
            <h2 className='text-sm font-semibold mb-3'>统计</h2>
            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <span className='text-sm text-muted-foreground'>发布话题</span>
                <span className='text-sm font-semibold'>
                  {user.topicCount || 0}
                </span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-sm text-muted-foreground'>参与回复</span>
                <span className='text-sm font-semibold'>
                  {user.postCount || 0}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </StickySidebar>
    </div>
  );
}
