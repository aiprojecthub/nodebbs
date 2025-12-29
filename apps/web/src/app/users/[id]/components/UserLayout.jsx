'use client';

import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/common/Loading';
import UserSidebar from './UserSidebar';
import UserActivityTabs from './UserActivityTabs';
import { useUserProfile } from '@/hooks/user/useUserProfile';

/**
 * 用户主页布局组件
 * 组合侧边栏和活动内容区，处理内容访问权限
 */
export default function UserLayout({
  user,
  initialTab,
  initialTopics,
  initialPosts,
  topicsTotal,
  postsTotal,
  currentPage,
  limit,
}) {
  // 获取权限状态
  const {
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

  // 渲染内容区域
  const renderContent = () => {
    // 如果内容对所有人可见，直接显示
    if (!needsAuthCheck) {
      return (
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
      );
    }

    // 等待认证状态加载
    if (authLoading) {
      return <Loading className='py-12' />;
    }

    // 检查权限
    if (canViewContent) {
      return (
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
      );
    }

    // 无权访问，显示提示
    return (
      <div className='bg-card border border-border rounded-lg p-8 text-center'>
        <Lock className='h-12 w-12 text-muted-foreground/50 mx-auto mb-4' />
        <h3 className='text-lg font-semibold text-foreground mb-2'>
          {accessMessage?.title}
        </h3>
        <p className='text-sm text-muted-foreground mb-4'>
          {accessMessage?.description}
        </p>
        {accessMessage?.showLoginButton && (
          <Button onClick={openLoginDialog}>登录查看</Button>
        )}
      </div>
    );
  };

  return (
    <div className='container mx-auto px-4 py-6 flex-1'>
      <div className='flex flex-col lg:flex-row gap-6'>
        {/* 左侧：用户信息侧边栏 */}
        <UserSidebar user={user} />

        {/* 右侧：用户活动 */}
        <main className='flex-1 min-w-0'>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
