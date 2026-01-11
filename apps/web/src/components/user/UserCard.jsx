import React from 'react';
import Link from '@/components/common/Link';
import UserAvatar from '@/components/user/UserAvatar';
import UserBadge from '@/extensions/badges/components/Badge';
import { cn } from '@/lib/utils';

/**
 * 通用用户卡片组件
 * @param {Object} props
 * @param {Object} props.user - 用户信息对象 (name, username, avatar, avatarFrame)
 * @param {Array} props.badges - 勋章列表
 * @param {string} props.variant - 样式变体: 'default' (简洁/透明), 'banner' (带背景条的卡片)
 * @param {string} props.avatarSize - 头像尺寸 (UserAvatar size prop: 'md', 'lg', 'xl')
 * @param {string} props.avatarClassName - 头像额外样式 (用于自定义尺寸, e.g. w-24 h-24)
 * @param {string} props.className - 容器额外样式
 */
export default function UserCard({
  user,
  badges = [],
  variant = 'default',
  avatarSize = 'xl',
  avatarClassName = '',
  className = '',
}) {
  if (!user) return null;

  const isBanner = variant === 'banner';

  const CardWrapper = ({ children }) => {
    if (isBanner) {
      return (
        <div
          className={cn(
            'border border-border rounded-lg bg-card overflow-hidden',
            className
          )}
        >
          {/* 背景装饰条 */}
          <div className='h-16 bg-gradient-to-r from-primary/10 to-primary/5' />
          <div className='px-4 pb-4'>{children}</div>
        </div>
      );
    }
    return (
      <div className={cn('flex flex-col items-center', className)}>
        {children}
      </div>
    );
  };

  return (
    <CardWrapper>
      <div
        className={cn(
          'flex flex-col items-center text-center gap-4',
          isBanner ? 'relative -mt-8' : ''
        )}
      >
        <UserAvatar
          url={user.avatar}
          name={user.username}
          size={avatarSize}
          className={cn(avatarClassName)}
          frameMetadata={user.avatarFrame?.itemMetadata}
        />

        <div>
          <h4
            className={cn(
              isBanner ? 'text-base' : 'text-2xl font-semibold leading-tight'
            )}
          >
            {isBanner ? (
              <Link
                href={`/users/${user.username}`}
               
                className='font-bold hover:text-primary hover:underline block truncate'
              >
                {user.name || user.username}
              </Link>
            ) : (
              user.name || user.username
            )}
          </h4>
          {isBanner && (
            <p className={cn('text-muted-foreground truncate text-xs')}>
              @{user.username}
            </p>
          )}
        </div>

        {/* 勋章展示 */}
        {badges && badges.length > 0 && (
          <div
            className={cn(
              'flex flex-wrap justify-center',
              isBanner ? 'gap-1.5' : 'gap-2'
            )}
          >
            {badges.map((item) => {
              // 兼容不同的 badges 数据结构 (Badge object vs UserBadge object)
              const badge = item.badge || item;
              // 注意: UserProfileSidebar 原代码用了 size="xl"，而 TopicSidebar 用了 size="lg" 或 "md"
              // 这里我们根据 variant 做一个自适应，或者接受 prop
              const badgeSize = isBanner ? 'lg' : 'xl';

              return (
                <UserBadge
                  key={badge.id || badge.slug}
                  badge={badge}
                  userBadge={item.badge ? item : null} // 如果是 userBadge 结构则传递
                  size={badgeSize}
                  className='transition-transform hover:scale-110'
                />
              );
            })}
          </div>
        )}
      </div>
    </CardWrapper>
  );
}
