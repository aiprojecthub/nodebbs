'use client';

import { useMemo } from 'react';
import { Users } from 'lucide-react';
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
  const badges = useMemo(() => user.badges || [], [user.badges]);

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

          {/* 主操作区 */}
          <div className='flex justify-center gap-2 w-full'>
            <FollowButton
              username={username}
              initialIsFollowing={isFollowing}
              onFollowChange={handleFollowChange}
              className="w-1/2"
            />
            <SendMessageButton
              recipientId={user.id}
              recipientName={user.name || user.username}
              recipientMessagePermission={user.messagePermission}
              className="w-1/2"
            />
          </div>

          {/* 粉丝/关注统计 */}
          <div className='flex items-center justify-center gap-6 text-sm'>
            <Link
              href={`/users/${username}/followers`}
              className='flex items-center gap-1.5 hover:text-primary transition-colors'
            >
              <Users className='h-4 w-4 text-muted-foreground' />
              <span className='font-semibold'>{followerCount}</span>
              <span className='text-muted-foreground'>粉丝</span>
            </Link>
            <div className='w-px h-4 bg-border' />
            <Link
              href={`/users/${username}/following`}
              className='flex items-center gap-1.5 hover:text-primary transition-colors'
            >
              <span className='font-semibold'>{followingCount}</span>
              <span className='text-muted-foreground'>关注</span>
            </Link>
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
              <div className='flex items-center justify-between'>
                <span className='text-sm text-muted-foreground'>加入时间</span>
                <span className='text-sm text-muted-foreground'>
                  <Time date={user.createdAt} format='YYYY-MM-DD' />
                </span>
              </div>
            </div>
          </div>

          {/* 次要操作 */}
          <div className='flex items-center gap-2'>
            <BlockUserButton
              userId={user.id}
              username={user.name || user.username}
              variant="ghost"
              size="sm"
              className="flex-1 text-muted-foreground hover:text-foreground"
            />
            <ReportUserButton
              userId={user.id}
              username={user.name || user.username}
              variant="ghost"
              size="sm"
              className="flex-1 text-muted-foreground hover:text-foreground"
            />
          </div>
        </aside>
      </StickySidebar>
    </div>
  );
}
