import { MessageSquare, Eye, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import Time from '@/components/common/Time';
import { Loading } from '@/components/common/Loading';
import { Pager } from '@/components/common/Pagination';

// 空状态组件
export function EmptyState({ type }) {
  const config = {
    topics: {
      title: '暂无发布的话题',
      description: '该用户还没有发布任何话题',
    },
    posts: {
      title: '暂无回复',
      description: '该用户还没有发布任何回复',
    },
  };

  const { title, description } = config[type] || config.topics;

  return (
    <div className='border border-border rounded-lg p-12 text-center bg-card'>
      <MessageSquare className='h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50' />
      <h3 className='text-base font-semibold mb-2'>{title}</h3>
      <p className='text-sm text-muted-foreground'>{description}</p>
    </div>
  );
}

// 话题项组件
export function TopicItem({ topic }) {
  return (
    <div className='border border-border rounded-lg hover:border-muted-foreground/50 transition-colors bg-card'>
      <div className='p-4'>
        <div className='flex items-start gap-3'>
          {/* Status indicator */}
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
            {/* Title */}
            <Link
              href={`/topic/${topic.id}`}
              prefetch={false}
              className='text-base font-semibold hover:text-primary transition-colors line-clamp-2 block mb-2 break-all'
            >
              {topic.title}
            </Link>

            {/* Meta info */}
            <div className='flex flex-wrap items-center gap-3 text-xs text-muted-foreground'>
              {topic.category && (
                <Badge variant='secondary' className='text-xs'>
                  {topic.category.name}
                </Badge>
              )}
              <span className='flex items-center gap-1'>
                <Clock className='h-3 w-3' />
                <Time date={topic.createdAt} fromNow />
              </span>
              <span className='flex items-center gap-1'>
                <MessageSquare className='h-3 w-3' />
                {(topic.postCount || 1) - 1}
              </span>
              <span className='flex items-center gap-1'>
                <Eye className='h-3 w-3' />
                {topic.viewCount || 0}
              </span>
            </div>

            {/* Tags */}
            {topic.tags && topic.tags.length > 0 && (
              <div className='flex flex-wrap gap-1.5 mt-2'>
                {topic.tags.map((tag) => (
                  <Badge
                    key={typeof tag === 'string' ? tag : tag.slug}
                    variant='outline'
                    className='text-xs'
                  >
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

// 回复项组件
export function PostItem({ post }) {
  return (
    <div className='border border-border rounded-lg hover:border-muted-foreground/50 transition-colors bg-card'>
      <div className='p-4'>
        {/* Topic reference */}
        {post.topicTitle && (
          <div className='mb-3'>
            <Link
              href={`/topic/${post.topicId}`}
              prefetch={false}
              className='text-sm text-muted-foreground hover:text-primary transition-colors'
            >
              <span className='font-medium'>回复于:</span> {post.topicTitle}
            </Link>
          </div>
        )}

        {/* Post content */}
        <div className='prose prose-sm dark:prose-invert max-w-none mb-3'>
          <div
            className='line-clamp-3 text-sm'
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </div>

        {/* Meta info */}
        <div className='flex flex-wrap items-center gap-3 text-xs text-muted-foreground'>
          <span className='flex items-center gap-1'>
            <Clock className='h-3 w-3' />
            <Time date={post.createdAt} fromNow />
          </span>
          <span className='flex items-center gap-1'>
            <MessageSquare className='h-3 w-3' />
            {post.likeCount || 0} 点赞
          </span>
        </div>
      </div>
    </div>
  );
}

// 话题列表组件
export function TopicsList({
  topics,
  isLoading,
  total,
  currentPage,
  pageSize,
  onPageChange,
}) {
  if (isLoading) {
    return (
      <Loading
        text='加载中'
        className='border border-border rounded-lg p-12 bg-card'
      />
    );
  }

  if (topics.length === 0) {
    return <EmptyState type='topics' />;
  }

  return (
    <>
      <div className='space-y-3'>
        {topics.map((topic) => (
          <TopicItem key={topic.id} topic={topic} />
        ))}
      </div>

      {/* Pagination */}
      {total > pageSize && (
        <Pager
          total={total}
          page={currentPage}
          pageSize={pageSize}
          onPageChange={onPageChange}
        />
      )}
    </>
  );
}

// 回复列表组件
export function PostsList({
  posts,
  isLoading,
  total,
  currentPage,
  pageSize,
  onPageChange,
}) {
  if (isLoading) {
    return (
      <Loading
        text='加载中'
        className='border border-border rounded-lg p-12 bg-card'
      />
    );
  }

  if (posts.length === 0) {
    return <EmptyState type='posts' />;
  }

  return (
    <>
      <div className='space-y-3'>
        {posts.map((post) => (
          <PostItem key={post.id} post={post} />
        ))}
      </div>

      {/* Pagination */}
      {total > pageSize && (
        <Pager
          total={total}
          page={currentPage}
          pageSize={pageSize}
          onPageChange={onPageChange}
        />
      )}
    </>
  );
}
