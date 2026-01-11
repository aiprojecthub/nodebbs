import Link from '@/components/common/Link';
import { Button } from '@/components/ui/button';
import { Hash } from 'lucide-react';
import { Loading } from '@/components/common/Loading';

/**
 * 回复搜索结果 Tab 组件
 * 纯 UI 组件，接收 props 渲染回复搜索结果
 */
export function SearchPostsTab({
  loading,
  typeLoading,
  results,
  onLoadPage,
}) {
  const { items, total, page, limit } = results;
  const totalPages = Math.ceil(total / limit);
  const isLoading = loading || typeLoading;

  // 加载状态
  if (isLoading) {
    return <Loading text='加载中...' className='py-16' />;
  }

  // 空状态
  if (total === 0) {
    return (
      <div className='text-center py-16 bg-card border border-border rounded-lg'>
        <Hash className='h-12 w-12 text-muted-foreground/50 mx-auto mb-4' />
        <div className='text-lg font-medium text-foreground mb-2'>
          未找到相关回复
        </div>
        <p className='text-sm text-muted-foreground'>
          尝试使用不同的关键词搜索
        </p>
      </div>
    );
  }

  return (
    <div className='mt-6'>
      <div className='mb-4 text-sm text-muted-foreground'>
        找到{' '}
        <span className='font-semibold text-foreground'>{total}</span>{' '}
        个相关回复
      </div>
      
      {/* 回复列表 */}
      <div className='space-y-3'>
        {items.map((post) => (
          <Link
            key={post.id}
            href={`/topic/${post.topicId}#post-${post.id}`}
            className='block bg-card border border-border rounded-lg p-4 hover:bg-accent/50 transition-all'
          >
            <div className='text-sm font-medium text-muted-foreground mb-2'>
              {post.topicTitle}
            </div>
            <div className='text-card-foreground line-clamp-3 mb-3'>
              {post.content}
            </div>
            <div className='flex items-center text-xs text-muted-foreground'>
              <span className='font-medium'>{post.username}</span>
              <span className='mx-2'>·</span>
              <span>#{post.postNumber}</span>
              <span className='mx-2'>·</span>
              <span>
                {new Date(post.createdAt).toLocaleDateString()}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* 分页 */}
      {total > limit && (
        <div className='flex justify-center mt-6'>
          <div className='flex items-center gap-1'>
            <Button
              variant='outline'
              size='sm'
              disabled={page === 1}
              onClick={() => onLoadPage('posts', page - 1)}
              className='text-sm'
            >
              上一页
            </Button>
            <span className='text-sm text-muted-foreground px-4'>
              第 {page} 页 / 共 {totalPages} 页
            </span>
            <Button
              variant='outline'
              size='sm'
              disabled={page >= totalPages}
              onClick={() => onLoadPage('posts', page + 1)}
              className='text-sm'
            >
              下一页
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
