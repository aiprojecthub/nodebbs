'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TopicsList, PostsList } from './UserActivityTabsUI';
import { useUserActivity } from '@/hooks/user/useUserActivity';

/**
 * 用户活动 Tab 组件
 * 显示用户发布的话题和回复
 */
export default function UserActivityTabs({
  userId,
  initialTab,
  initialTopics,
  initialPosts,
  topicsTotal,
  postsTotal,
  currentPage,
  limit,
}) {
  // 使用 Hook 管理 Tab 状态和数据
  const {
    activeTab,
    topics,
    posts,
    isLoadingTopics,
    isLoadingPosts,
    topicsPageTotal,
    postsPageTotal,
    handleTabChange,
    handleTopicsPageChange,
    handlePostsPageChange,
  } = useUserActivity({
    userId,
    initialTab,
    initialTopics,
    initialPosts,
    topicsTotal,
    postsTotal,
    currentPage,
    limit,
  });

  return (
    <Tabs value={activeTab} className='w-full' onValueChange={handleTabChange}>
      <TabsList>
        <TabsTrigger value='topics'>发布的话题</TabsTrigger>
        <TabsTrigger value='posts'>参与的回复</TabsTrigger>
      </TabsList>

      <TabsContent value='topics' className='mt-0'>
        <TopicsList
          topics={topics}
          isLoading={isLoadingTopics}
          total={topicsPageTotal}
          currentPage={currentPage}
          pageSize={limit}
          onPageChange={handleTopicsPageChange}
        />
      </TabsContent>

      <TabsContent value='posts' className='mt-0'>
        <PostsList
          posts={posts}
          isLoading={isLoadingPosts}
          total={postsPageTotal}
          currentPage={currentPage}
          pageSize={limit}
          onPageChange={handlePostsPageChange}
        />
      </TabsContent>
    </Tabs>
  );
}
