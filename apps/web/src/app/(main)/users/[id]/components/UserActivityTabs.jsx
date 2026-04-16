'use client';

import { MessageSquare, Eye, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from '@/components/common/Link';
import Time from '@/components/common/Time';
import { Loading } from '@/components/common/Loading';
import { Pager } from '@/components/common/Pagination';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

// ===== 内部子组件 =====

function EmptyState({ type }) {
  const config = {
    topics: { title: '暂无发布的话题', description: '该用户还没有发布任何话题' },
    posts: { title: '暂无回复', description: '该用户还没有发布任何回复' },
  };
  const { title, description } = config[type] || config.topics;

  return (
    <div className='card-base p-12 text-center'>
      <MessageSquare className='h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50' />
      <h3 className='text-base font-semibold mb-2'>{title}</h3>
      <p className='text-sm text-muted-foreground'>{description}</p>
    </div>
  );
}

function TopicItem({ topic }) {
  return (
    <div className='card-base hover:border-muted-foreground/50 transition-colors'>
      <div className='p-4'>
        <div className='flex items-start gap-3'>
          <div className='shrink-0 mt-1'>
            {topic.isClosed ? (
              <div className='w-5 h-5 rounded-full bg-muted-foreground/10 flex items-center justify-center'>
                <div className='w-2 h-2 rounded-full bg-muted-foreground' />
              </div>
            ) : (
              <div className='w-5 h-5 rounded-full bg-chart-2/10 flex items-center justify-center'>
                <div className='w-2 h-2 rounded-full bg-chart-2' />
              </div>
            )}
          </div>
          <div className='flex-1 min-w-0'>
            <Link href={`/topic/${topic.id}`} className='text-base font-semibold hover:text-primary transition-colors line-clamp-2 block mb-2 break-all'>
              {topic.title}
            </Link>
            <div className='flex flex-wrap items-center gap-3 text-xs text-muted-foreground'>
              {topic.category && <Badge variant='secondary' className='text-xs'>{topic.category.name}</Badge>}
              <span className='flex items-center gap-1'><Clock className='h-3 w-3' /><Time date={topic.createdAt} fromNow /></span>
              <span className='flex items-center gap-1'><MessageSquare className='h-3 w-3' />{(topic.postCount || 1) - 1}</span>
              <span className='flex items-center gap-1'><Eye className='h-3 w-3' />{topic.viewCount || 0}</span>
            </div>
            {topic.tags && topic.tags.length > 0 && (
              <div className='flex flex-wrap gap-1.5 mt-2'>
                {topic.tags.map((tag) => (
                  <Badge key={typeof tag === 'string' ? tag : tag.slug} variant='outline' className='text-xs'>
                    {typeof tag === 'string' ? tag : tag.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PostItem({ post }) {
  return (
    <div className='card-base hover:border-muted-foreground/50 transition-colors'>
      <div className='p-4'>
        {post.topicTitle && (
          <div className='mb-3'>
            <Link href={`/topic/${post.topicId}`} className='text-sm text-muted-foreground hover:text-primary transition-colors'>
              <span className='font-medium'>回复于:</span> {post.topicTitle}
            </Link>
          </div>
        )}
        <div className='prose prose-sm dark:prose-invert max-w-none mb-3'>
          <div className='line-clamp-3 text-sm' dangerouslySetInnerHTML={{ __html: post.content }} />
        </div>
        <div className='flex flex-wrap items-center gap-3 text-xs text-muted-foreground'>
          <span className='flex items-center gap-1'><Clock className='h-3 w-3' /><Time date={post.createdAt} fromNow /></span>
          <span className='flex items-center gap-1'><MessageSquare className='h-3 w-3' />{post.likeCount || 0} 点赞</span>
        </div>
      </div>
    </div>
  );
}

function TopicsList({ topics, isLoading, total, currentPage, pageSize, onPageChange }) {
  if (isLoading) return <Loading text='加载中' className='card-base p-12' />;
  if (topics.length === 0) return <EmptyState type='topics' />;
  return (
    <>
      <div className='space-y-3'>
        {topics.map((topic) => <TopicItem key={topic.id} topic={topic} />)}
      </div>
      {total > pageSize && <Pager total={total} page={currentPage} pageSize={pageSize} onPageChange={onPageChange} />}
    </>
  );
}

function PostsList({ posts, isLoading, total, currentPage, pageSize, onPageChange }) {
  if (isLoading) return <Loading text='加载中' className='card-base p-12' />;
  if (posts.length === 0) return <EmptyState type='posts' />;
  return (
    <>
      <div className='space-y-3'>
        {posts.map((post) => <PostItem key={post.id} post={post} />)}
      </div>
      {total > pageSize && <Pager total={total} page={currentPage} pageSize={pageSize} onPageChange={onPageChange} />}
    </>
  );
}
