import Link from '@/components/common/Link';
import { User } from 'lucide-react';
import UserAvatar from '@/components/user/UserAvatar';
import { Loading } from '@/components/common/Loading';
import { Pager } from '@/components/common/Pagination';
import { HighlightText } from './HighlightText';

/**
 * 用户搜索结果 Tab 组件
 */
export function SearchUsersTab({ loading, results, onLoadPage, searchQuery }) {
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
        <User className='h-12 w-12 text-muted-foreground/50 mx-auto mb-4' />
        <div className='text-lg font-medium text-foreground mb-2'>
          未找到相关用户
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

      {/* 用户网格 */}
      <div className='mx-3 sm:mx-0 grid grid-cols-1 md:grid-cols-2 gap-4'>
        {items.map((user) => (
          <Link
            key={user.id}
            href={`/users/${user.username}`}
            className='block bg-card border border-border rounded-lg p-4 hover:bg-accent/50 hover:border-accent-foreground/20 transition-colors'
          >
            <div className='flex items-center space-x-3'>
              <UserAvatar
                url={user.avatar}
                name={user.name || user.username}
                size='lg'
              />
              <div className='flex-1 min-w-0'>
                <div className='font-medium text-card-foreground truncate'>
                  <HighlightText
                    text={user.name || user.username}
                    keyword={searchQuery}
                  />
                </div>
                <div className='text-sm text-muted-foreground truncate'>
                  @{user.username}
                </div>
                {user.bio && (
                  <div className='text-xs text-muted-foreground line-clamp-1 mt-1'>
                    {user.bio}
                  </div>
                )}
              </div>
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
            onPageChange={(p) => onLoadPage('users', p)}
          />
        </div>
      )}
    </div>
  );
}
