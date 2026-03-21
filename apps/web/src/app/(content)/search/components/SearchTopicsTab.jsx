import { BookOpen } from 'lucide-react';
import { Loading } from '@/components/common/Loading';
import { Pager } from '@/components/common/Pagination';
import { SearchTopicItem } from './SearchTopicItem';

/**
 * 话题搜索结果 Tab 组件
 * 使用搜索专用的 SearchTopicItem，支持关键词高亮
 */
export function SearchTopicsTab({ loading, results, onLoadPage, searchQuery }) {
  const { items, total, page, limit } = results;

  if (loading) {
    return (
      <div className='mx-3 sm:mx-0 bg-card border-0 sm:border sm:border-border sm:rounded-xl'>
        <Loading text='加载中...' className='py-16' />
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className='text-center py-20 mx-3 sm:mx-0 border-0 sm:border sm:border-border sm:rounded-xl bg-card'>
        <div className='w-16 h-16 mx-auto mb-6 rounded-full bg-muted/50 flex items-center justify-center'>
          <BookOpen className='h-8 w-8 text-muted-foreground/50' />
        </div>
        <div className='text-lg font-semibold mb-2 text-foreground'>
          未找到相关话题
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

      {/* 话题列表 */}
      <div className='bg-card sm:border sm:border-border sm:rounded-xl overflow-hidden'>
        <div className='divide-y divide-border/60'>
          {items.map((topic) => (
            <SearchTopicItem
              key={topic.id}
              topic={topic}
              keyword={searchQuery}
            />
          ))}
        </div>
      </div>

      {/* 统一分页组件 */}
      {total > limit && (
        <div className='mx-3 sm:mx-0'>
          <Pager
            total={total}
            page={page}
            pageSize={limit}
            onPageChange={(p) => onLoadPage('topics', p)}
          />
        </div>
      )}
    </div>
  );
}
