'use client';

import { Lock, Calendar, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/common/Loading';
import Link from '@/components/common/Link';
import UserAvatar from '@/components/user/UserAvatar';
import UserActivityTabs from '@/app/(main)/users/[id]/components/UserActivityTabs';
import FollowButton from '@/components/user/FollowButton';
import SendMessageButton from '@/components/user/SendMessageButton';
import Time from '@/components/common/Time';
import { useUserProfile } from '@/hooks/user/useUserProfile';
import StickyHeader from '../components/StickyHeader';

export default function UserView({
  user,
  initialTab,
  initialTopics,
  initialPosts,
  topicsTotal,
  postsTotal,
  currentPage,
  limit,
}) {
  const {
    followerCount,
    followingCount,
    isFollowing,
    handleFollowChange,
    canViewContent,
    accessMessage,
    needsAuthCheck,
    authLoading,
    openLoginDialog,
  } = useUserProfile({
    user,
    initialFollowerCount: user.followerCount,
    initialFollowingCount: user.followingCount,
    initialIsFollowing: user.isFollowing,
  });

  return (
    <div>
      <StickyHeader
        title={user.name || user.username}
        subtitle={`${topicsTotal} 个帖子`}
      />

      {/* Banner */}
      <div className='h-32 sm:h-48 bg-gradient-to-r from-primary/20 to-primary/5' />

      {/* 头像 + 操作按钮 */}
      <div className='px-4'>
        <div className='flex justify-between items-start -mt-10 sm:-mt-16'>
          <div className='border-4 border-background rounded-full'>
            <UserAvatar
              url={user.avatar}
              name={user.name || user.username}
              size='xl'
              className='h-20 w-20 sm:h-32 sm:w-32'
              frameMetadata={user.avatarFrame?.itemMetadata}
            />
          </div>
          <div className='flex gap-2 mt-12 sm:mt-3'>
            <SendMessageButton
              recipientId={user.id}
              recipientName={user.name || user.username}
              recipientMessagePermission={user.messagePermission}
              variant='outline'
              size='sm'
              className='rounded-full'
            />
            <FollowButton
              userId={user.id}
              username={user.username}
              isFollowing={isFollowing}
              onFollowChange={handleFollowChange}
              className='rounded-full font-bold'
            />
          </div>
        </div>

        {/* 用户信息 */}
        <div className='mt-3'>
          <h2 className='text-xl font-extrabold'>{user.name || user.username}</h2>
          <p className='text-[15px] text-muted-foreground'>@{user.username}</p>

          {user.bio && (
            <p className='text-[15px] mt-3'>{user.bio}</p>
          )}

          <div className='flex items-center gap-3 mt-3 text-[15px] text-muted-foreground flex-wrap'>
            {user.location && (
              <span className='flex items-center gap-1'>
                <MapPin className='h-4 w-4' />
                {user.location}
              </span>
            )}
            <span className='flex items-center gap-1'>
              <Calendar className='h-4 w-4' />
              <Time date={user.createdAt} format='YYYY年M月' /> 加入
            </span>
          </div>

          {/* 关注/粉丝 */}
          <div className='flex gap-4 mt-3'>
            <Link href={`/users/${user.username}/following`} className='hover:underline'>
              <span className='font-bold'>{followingCount}</span>
              <span className='text-muted-foreground ml-1'>正在关注</span>
            </Link>
            <Link href={`/users/${user.username}/followers`} className='hover:underline'>
              <span className='font-bold'>{followerCount}</span>
              <span className='text-muted-foreground ml-1'>关注者</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 内容区 */}
      <div className='mt-4'>
        {(!needsAuthCheck || canViewContent) && !authLoading ? (
          <UserActivityTabs
            userId={user.id}
            initialTab={initialTab}
            initialTopics={initialTopics}
            initialPosts={initialPosts}
            topicsTotal={topicsTotal}
            postsTotal={postsTotal}
            currentPage={currentPage}
            limit={limit}
          />
        ) : authLoading ? (
          <Loading className='py-12' />
        ) : (
          <div className='px-4 py-12 text-center'>
            <Lock className='h-10 w-10 text-muted-foreground/50 mx-auto mb-4' />
            <h3 className='text-lg font-bold mb-2'>{accessMessage?.title}</h3>
            <p className='text-sm text-muted-foreground mb-4'>{accessMessage?.description}</p>
            {accessMessage?.showLoginButton && (
              <Button onClick={openLoginDialog} className='rounded-full font-bold'>登录查看</Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
