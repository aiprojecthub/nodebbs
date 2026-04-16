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

export default function UserViewContent({
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
      {/* 用户信息 */}
      <div className='py-8 border-b border-border/60'>
        <div className='flex items-start gap-5'>
          <UserAvatar
            url={user.avatar}
            name={user.name || user.username}
            size='xl'
            className='h-20 w-20 shrink-0'
            frameMetadata={user.avatarFrame?.itemMetadata}
          />
          <div className='flex-1 min-w-0'>
            <h1 className='text-2xl font-bold' style={{ fontFamily: 'var(--font-serif)' }}>
              {user.name || user.username}
            </h1>
            <p className='text-muted-foreground mt-0.5'>@{user.username}</p>

            {user.bio && <p className='mt-3 text-[15px]'>{user.bio}</p>}

            <div className='flex items-center gap-4 mt-3 text-sm text-muted-foreground flex-wrap'>
              {user.location && (
                <span className='flex items-center gap-1'>
                  <MapPin className='h-3.5 w-3.5' /> {user.location}
                </span>
              )}
              <span className='flex items-center gap-1'>
                <Calendar className='h-3.5 w-3.5' />
                <Time date={user.createdAt} format='YYYY年M月' /> 加入
              </span>
              <Link href={`/users/${user.username}/followers`} className='hover:text-foreground'>
                <span className='font-semibold text-foreground'>{followerCount}</span> 关注者
              </Link>
              <Link href={`/users/${user.username}/following`} className='hover:text-foreground'>
                <span className='font-semibold text-foreground'>{followingCount}</span> 关注
              </Link>
            </div>
          </div>

          <div className='flex gap-2 shrink-0'>
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
              className='rounded-full'
            />
          </div>
        </div>
      </div>

      {/* 内容区 */}
      <div className='pt-6'>
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
          <div className='py-16 text-center'>
            <Lock className='h-10 w-10 text-muted-foreground/30 mx-auto mb-4' />
            <h3 className='text-lg font-semibold mb-2'>{accessMessage?.title}</h3>
            <p className='text-sm text-muted-foreground mb-4'>{accessMessage?.description}</p>
            {accessMessage?.showLoginButton && (
              <Button onClick={openLoginDialog} variant='outline' className='rounded-full'>登录查看</Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
