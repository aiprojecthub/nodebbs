'use client';

import { Calendar } from 'lucide-react';
import UserAvatar from '@/components/forum/UserAvatar';
import StickySidebar from '@/components/forum/StickySidebar';
import Time from '@/components/forum/Time';
import SendMessageButton from '@/components/user/SendMessageButton';
import BlockUserButton from '@/components/user/BlockUserButton';
import ReportUserButton from '@/components/user/ReportUserButton';
import UserProfileClient from '@/components/user/UserProfileClient';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
export default function UserProfileSidebar({ user }) {
  const avatarFrame = user.avatarFrame;
  const badges = user.badges || [];

  return (
    <div className='w-full lg:w-72 shrink-0'>
      <StickySidebar className='sticky top-[81px]' enabled={false}>
        <aside>
          {/* 用户头像和基本信息 */}
          <div className='mb-4 flex flex-col items-center'>
            <UserAvatar
              url={user.avatar}
              name={user.username}
              className='w-24 h-24'
              frameMetadata={avatarFrame?.itemMetadata}
            />

            <div className='mb-4 mt-1 text-center'>
              <h1 className='text-2xl font-semibold leading-tight'>
                {user.name || user.username}
              </h1>
              
              {/* 勋章展示 */}
              {badges.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  <TooltipProvider>
                    {badges.map((userBadge) => {
                      const badge = userBadge.badge || userBadge; // Handle potential nested structure
                      return (
                        <Tooltip key={badge.id}>
                          <TooltipTrigger>
                            <div className="relative w-6 h-6">
                              <img 
                                src={badge.iconUrl} 
                                alt={badge.name} 
                                className="w-full h-full object-contain"
                              />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-semibold">{badge.name}</p>
                            {badge.description && (
                              <p className="text-xs text-muted-foreground max-w-[200px]">{badge.description}</p>
                            )}
                             {userBadge.earnedAt && (
                                <p className="text-[10px] text-muted-foreground mt-1">
                                  获得于: <Time date={userBadge.earnedAt} format="YYYY-MM-DD" />
                                </p>
                             )}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </TooltipProvider>
                </div>
              )}
            </div>

            {/* 关注按钮和粉丝数（客户端组件） */}
            <UserProfileClient
              username={user.username}
              initialFollowerCount={user.followerCount}
              initialFollowingCount={user.followingCount}
              initialIsFollowing={user.isFollowing}
            />

            {/* 其他操作按钮 */}
            <div className='space-y-2 mb-4'>
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

          {/* 统计信息 - GitHub 风格 */}
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
