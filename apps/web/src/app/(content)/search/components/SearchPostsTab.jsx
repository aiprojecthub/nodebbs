import Link from '@/components/common/Link';
import { Hash } from 'lucide-react';
import { Loading } from '@/components/common/Loading';
import { Pager } from '@/components/common/Pagination';
import Time from '@/components/common/Time';
import { HighlightText } from './HighlightText';

/**
 * 回复搜索结果 Tab 组件
 */
export function SearchPostsTab({ loading, results, onLoadPage, searchQuery }) {
  const { items, total, page, limit } = results;

  if (loading) {
    return (
      <div className='mx-3 sm:mx-0 bg-card border border-border rounded-lg'>
        <Loading text='加载中...' className='py-16' />
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className='text-center py-16 mx-3 sm:mx-0 bg-card border border-border rounded-lg'>
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
    <div className='space-y-3'>
      {/* 结果计数 */}
      <div className='text-sm text-muted-foreground px-3 sm:px-0'>
        搜索 <span className='font-medium text-foreground'>{searchQuery}</span> 共 {total} 条结果
      </div>

      {/* 回复列表 */}
      <div className='mx-3 sm:mx-0 space-y-3'>
        {items.map((post) => (
          <Link
            key={post.id}
            href={`/topic/${post.topicId}#post-${post.id}`}
            className='block bg-card border border-border rounded-lg p-4 hover:bg-accent/50 transition-colors'
          >
            <div className='text-sm font-medium text-muted-foreground mb-2'>
              <HighlightText text={post.topicTitle} keyword={searchQuery} />
            </div>
            <div className='text-card-foreground line-clamp-3 mb-3'>
              <HighlightText text={post.content} keyword={searchQuery} />
            </div>
            <div className='flex items-center text-xs text-muted-foreground'>
              <span className='font-medium'>{post.username}</span>
              <span className='mx-2'>·</span>
              <span>#{post.postNumber}</span>
              <span className='mx-2'>·</span>
              <span>
                <Time date={post.createdAt} fromNow />
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* 统一分页组件 */}
      {total > limit && (
        <div className='mx-3 sm:mx-0'>
          <Pager
            total={total}
            page={page}
            pageSize={limit}
            onPageChange={(p) => onLoadPage('posts', p)}
          />
        </div>
      )}
    </div>
  );
}
