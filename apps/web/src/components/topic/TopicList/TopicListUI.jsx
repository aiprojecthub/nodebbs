import Link from '@/components/common/Link';
import { Fragment } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  MessageSquare,
  Eye,
  Pin,
  Lock,
  BookOpen,
  Plus,
} from 'lucide-react';
import UserAvatar from '@/components/user/UserAvatar';
import { Pager } from '@/components/common/Pagination';
import Time from '@/components/common/Time';

// 空状态组件
export function EmptyState() {
  return (
    <div className='text-center py-20 border-0 sm:border sm:border-border sm:rounded-xl bg-card'>
      <div className='w-16 h-16 mx-auto mb-6 rounded-full bg-muted/50 flex items-center justify-center'>
        <BookOpen className='h-8 w-8 text-muted-foreground/50' />
      </div>
      <div className='text-lg font-semibold mb-2 text-foreground'>暂无话题</div>
      <p className='text-sm text-muted-foreground mb-6 max-w-md mx-auto px-4'>
        还没有人发布话题，成为第一个吧！
      </p>
      <Link href='/create'>
        <Button size='default'>
          <Plus className='h-4 w-4' />
          发布第一个话题
        </Button>
      </Link>
    </div>
  );
}

// 单个话题项组件
export function TopicItem({ topic }) {
  const categoryName =
    topic.categoryName || topic.category?.name || '未知分类';

  const isPinned = topic.isPinned;

  return (
    <div
      className={`
        p-3 group relative
        ${isPinned
          ? 'bg-primary/[0.03] dark:bg-primary/[0.06] border-l-[3px] border-l-primary'
          : 'hover:bg-accent/50'
        }
      `}
      style={{ contain: 'layout style' }}
    >
      <div className='flex items-start gap-4 w-full'>
        {/* 左侧：作者头像 */}
        <div className='shrink-0 mt-0.5'>
          <Link href={`/users/${topic.username}`}>
            <UserAvatar
              url={topic.userAvatar}
              name={topic.userName || topic.username}
              size='md'
              className={`
                ${!topic.userAvatarFrame?.itemMetadata
                  ? isPinned
                    ? 'ring-2 ring-primary/20'
                    : 'ring-2 ring-transparent group-hover:ring-primary/20'
                  : ''
                }
              `}
              frameMetadata={topic.userAvatarFrame?.itemMetadata}
            />
          </Link>
        </div>

        {/* 中间：主要内容区域 */}
        <div className='flex-1 min-w-0'>
          {/* 标题行 */}
          <div className='mb-2 leading-snug relative'>
            {/* 置顶标签 */}
            {isPinned && (
              <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary align-middle relative -top-[1px]'>
                <Pin className='w-3 h-3' />
                置顶
              </span>
            )}
            {topic.isClosed && (
              <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground align-middle relative -top-[1px]'>
                <Lock className='w-3 h-3' />
                已关闭
              </span>
            )}
            <Link
              href={`/topic/${topic.id}`}
              className={`
                text-base sm:text-lg font-medium align-middle break-all
                before:absolute before:inset-0 before:z-0
                ${isPinned
                  ? 'text-foreground group-hover:text-primary'
                  : 'text-foreground group-hover:text-primary visited:text-muted-foreground'
                }
              `}
            >
              {topic.title}
            </Link>
            {topic.approvalStatus === 'pending' && (
              <Badge
                variant='outline'
                className='text-chart-5 border-chart-5 text-xs h-5 inline-flex align-middle ml-2 relative -top-[1px]'
              >
                待审核
              </Badge>
            )}
            {topic.approvalStatus === 'rejected' && (
              <Badge
                variant='outline'
                className='text-destructive border-destructive text-xs h-5 inline-flex align-middle ml-2 relative -top-[1px]'
              >
                已拒绝
              </Badge>
            )}
          </div>

          {/* 元信息行 */}
          <div className='flex items-center gap-2 text-sm text-muted-foreground flex-wrap'>
            {/* 作者名 */}
            <Link
              href={`/users/${topic.username}`}
              className='font-medium text-foreground/70 hover:text-primary'
            >
              {topic.userName || topic.username}
            </Link>

            {/* 分类 */}
            <div className='hidden sm:flex items-center'>
              <span className='text-muted-foreground/40 mr-2'>·</span>
              <Badge
                variant='secondary'
                className='text-xs font-normal px-2 py-0.5 h-auto bg-muted/50 hover:bg-muted transition-colors'
              >
                {categoryName}
              </Badge>
            </div>

            <span className='text-muted-foreground/40'>·</span>

            {/* 发布时间 */}
            <span className='text-muted-foreground/70'>
              <Time date={topic.createdAt || topic.lastPostAt} fromNow />
            </span>

            {/* 标签 */}
            {topic.tags?.length > 0 && (
              <>
                <span className='text-muted-foreground/40'>·</span>
                <div className='flex items-center gap-1.5'>
                  {topic.tags.slice(0, 3).map((tag) => (
                    <Badge
                      key={tag}
                      variant='outline'
                      className='text-xs h-5 px-2 text-muted-foreground/70 border-muted-foreground/20 hover:border-muted-foreground/40 transition-colors'
                    >
                      {tag}
                    </Badge>
                  ))}
                  {topic.tags.length > 3 && (
                    <span className='text-xs text-muted-foreground/60'>
                      +{topic.tags.length - 3}
                    </span>
                  )}
                </div>
              </>
            )}

            {/* 移动端统计信息 (放入 Meta 行，且居右) */}
            <div className='flex sm:hidden items-center gap-3 text-xs text-muted-foreground/60 ml-auto shrink-0'>
              <div className='flex items-center gap-1'>
                <MessageSquare className='h-3 w-3' />
                <span className='font-medium tabular-nums'>
                  {Math.max((topic.postCount || 1) - 1, 0)}
                </span>
              </div>
              <div className='flex items-center gap-1'>
                <Eye className='h-3 w-3' />
                <span className='font-medium tabular-nums'>
                  {topic.viewCount || 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：统计信息 - 桌面端 */}
        <div className='hidden sm:flex flex-col items-end gap-2 shrink-0 min-w-[100px]'>
          <div className='flex items-center gap-4 text-xs text-muted-foreground/60'>
            <div className='flex items-center gap-1.5 hover:text-muted-foreground'>
              <MessageSquare className='h-3.5 w-3.5' />
              <span className='font-medium tabular-nums'>
                {Math.max((topic.postCount || 1) - 1, 0)}
              </span>
            </div>

            <div className='flex items-center gap-1.5 hover:text-muted-foreground'>
              <Eye className='h-3.5 w-3.5' />
              <span className='font-medium tabular-nums'>
                {topic.viewCount || 0}
              </span>
            </div>
          </div>

          {topic.lastPostAt && (
            <div className='text-xs text-muted-foreground/50 whitespace-nowrap'>
              最后回复 <Time date={topic.lastPostAt} fromNow />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 主 UI 组件
export function TopicListUI({
  topics,
  totalTopics,
  currentPage,
  totalPages,
  limit,
  showPagination,
  onPageChange,
  itemInserts,
}) {
  // 空状态
  if (topics.length === 0) {
    return <EmptyState />;
  }

  return (
    <>
      <div className='bg-card sm:border sm:border-border sm:rounded-xl overflow-hidden w-full'>
        {/* 话题列表 */}
        <div className='divide-y divide-border/60'>
          {topics.map((topic, index) => (
            <Fragment key={topic.id}>
              <TopicItem topic={topic} />
              {itemInserts?.[index]}
            </Fragment>
          ))}
        </div>
      </div>

      {/* 分页 */}
      {showPagination && totalPages > 1 && (
        <Pager
          total={totalTopics}
          page={currentPage}
          pageSize={limit}
          onPageChange={onPageChange}
        />
      )}
    </>
  );
}
