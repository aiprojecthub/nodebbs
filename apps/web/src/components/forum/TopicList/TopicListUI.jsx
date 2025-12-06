import Link from 'next/link';
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
import UserAvatar from '../UserAvatar';
import TimeAgo from '../TimeAgo';
import { Pager } from '@/components/common/Pagination';

// 空状态组件
export function EmptyState() {
  return (
    <div className='text-center py-16 border border-border rounded-lg bg-card'>
      <BookOpen className='h-12 w-12 mx-auto mb-4 text-muted-foreground/50' />
      <div className='font-semibold mb-2'>暂无话题</div>
      <p className='text-sm text-muted-foreground mb-4 max-w-md mx-auto'>
        还没有人发布话题，成为第一个吧！
      </p>
      <Link href='/create' prefetch={false}>
        <Button size='sm'>
          <Plus className='h-4 w-4' />
          发布第一个话题
        </Button>
      </Link>
    </div>
  );
}

// 列表头部组件
export function TopicListHeader({ totalTopics, pinnedTopics, lockedTopics }) {
  return (
    <div className='flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b border-border'>
      <div className='flex items-center space-x-4 text-xs'>
        <div className='flex items-center space-x-1.5'>
          <MessageSquare className='h-3.5 w-3.5 text-foreground' />
          <span className='font-semibold text-foreground'>
            {totalTopics} 个话题
          </span>
        </div>
        {pinnedTopics > 0 && (
          <div className='flex items-center space-x-1.5'>
            <Pin className='h-3.5 w-3.5 text-chart-5' />
            <span className='text-muted-foreground'>{pinnedTopics} 置顶</span>
          </div>
        )}
        {lockedTopics > 0 && (
          <div className='flex items-center space-x-1.5'>
            <Lock className='h-3.5 w-3.5 text-muted-foreground' />
            <span className='text-muted-foreground'>{lockedTopics} 已关闭</span>
          </div>
        )}
      </div>
    </div>
  );
}

// 单个话题项组件
export function TopicItem({ topic }) {
  const categoryName =
    topic.categoryName || topic.category?.name || '未知分类';

  return (
    <div className='px-4 py-4 hover:bg-accent/50 transition-colors group'>
      <div className='flex items-start gap-4 w-full'>
        {/* 左侧：作者头像 */}
        <div className='shrink-0'>
          <Link href={`/users/${topic.username}`} prefetch={false}>
            <UserAvatar
              url={topic.userAvatar}
              name={topic.username}
              size='md'
              className='ring-2 ring-transparent group-hover:ring-primary/20 transition-all'
              frameMetadata={topic.userAvatarFrame?.itemMetadata}
            />
          </Link>
        </div>

        {/* 中间：主要内容区域 */}
        <div className='flex-1 min-w-0'>
          {/* 标题行 */}
          <div className='mb-2'>
            <div className='flex items-start gap-2 flex-wrap'>
              {topic.isPinned && (
                <Pin className='h-4 w-4 text-chart-5 shrink-0 mt-1.5' />
              )}
              {topic.isClosed && (
                <Lock className='h-4 w-4 text-muted-foreground/60 shrink-0 mt-1.5' />
              )}
              <Link
                href={`/topic/${topic.id}`}
                prefetch={false}
                className='text-lg font-medium text-foreground group-hover:text-primary visited:text-muted-foreground transition-colors leading-tight'
              >
                {topic.title}
              </Link>
              {topic.approvalStatus === 'pending' && (
                <Badge
                  variant='outline'
                  className='text-chart-5 border-chart-5 text-xs h-5 shrink-0'
                >
                  待审核
                </Badge>
              )}
              {topic.approvalStatus === 'rejected' && (
                <Badge
                  variant='outline'
                  className='text-destructive border-destructive text-xs h-5 shrink-0'
                >
                  已拒绝
                </Badge>
              )}
            </div>
          </div>

          {/* 元信息行 */}
          <div className='flex items-center gap-2 text-sm text-muted-foreground flex-wrap'>
            {/* 作者名 */}
            <Link
              href={`/users/${topic.username}`}
              prefetch={false}
              className='font-medium text-muted-foreground hover:text-primary transition-colors'
            >
              {topic.username}
            </Link>

            <span className='text-muted-foreground/50'>·</span>

            {/* 分类 */}
            <Badge variant='ghost' className='text-xs font-normal'>
              {categoryName}
            </Badge>

            <span className='text-muted-foreground/50'>·</span>

            {/* 发布时间 */}
            <TimeAgo date={topic.createdAt || topic.lastPostAt} />

            {/* 标签 */}
            {topic.tags?.length > 0 && (
              <>
                <span className='text-muted-foreground/50'>·</span>
                <div className='flex items-center gap-1.5'>
                  {topic.tags.slice(0, 3).map((tag) => (
                    <Badge
                      key={tag}
                      variant='outline'
                      className='text-xs h-4 px-1.5 opacity-60'
                    >
                      {tag}
                    </Badge>
                  ))}
                  {topic.tags.length > 3 && (
                    <span className='text-xs opacity-60'>
                      +{topic.tags.length - 3}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* 右侧：统计信息 - 桌面端 */}
        <div className='hidden sm:flex flex-col items-end gap-1.5 shrink-0 min-w-[100px]'>
          <div className='flex items-center gap-4 text-xs text-muted-foreground/70'>
            <div className='flex items-center gap-1.5'>
              <MessageSquare className='h-3.5 w-3.5' />
              <span className='font-medium tabular-nums'>
                {Math.max((topic.postCount || 1) - 1, 0)}
              </span>
            </div>

            <div className='flex items-center gap-1.5'>
              <Eye className='h-3.5 w-3.5' />
              <span className='font-medium tabular-nums'>
                {topic.viewCount || 0}
              </span>
            </div>
          </div>

          {topic.lastPostAt && (
            <div className='text-xs text-muted-foreground/60 whitespace-nowrap'>
              最后回复 <TimeAgo date={topic.lastPostAt} />
            </div>
          )}
        </div>

        {/* 移动端统计信息 */}
        <div className='flex sm:hidden items-center gap-3 text-xs text-muted-foreground/70 ml-auto shrink-0'>
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
  showHeader,
  onPageChange,
}) {
  // 空状态
  if (topics.length === 0) {
    return <EmptyState />;
  }

  const pinnedTopics = topics.filter((t) => t.isPinned).length;
  const lockedTopics = topics.filter((t) => t.isClosed).length;

  return (
    <>
      <div className='bg-card border border-border rounded-lg overflow-hidden w-full'>
        {/* 列表头部 */}
        {showHeader && (
          <TopicListHeader
            totalTopics={totalTopics}
            pinnedTopics={pinnedTopics}
            lockedTopics={lockedTopics}
          />
        )}

        {/* 话题列表 */}
        <div className='divide-y divide-border'>
          {topics.map((topic) => (
            <TopicItem key={topic.id} topic={topic} />
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
