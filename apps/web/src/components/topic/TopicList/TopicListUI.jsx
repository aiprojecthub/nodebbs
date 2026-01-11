import Link from '@/components/common/Link';
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
    <div className='text-center py-16 border border-border rounded-lg bg-card'>
      <BookOpen className='h-12 w-12 mx-auto mb-4 text-muted-foreground/50' />
      <div className='font-semibold mb-2'>暂无话题</div>
      <p className='text-sm text-muted-foreground mb-4 max-w-md mx-auto'>
        还没有人发布话题，成为第一个吧！
      </p>
      <Link href='/create'>
        <Button size='sm'>
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

  return (
    <div className='px-4 py-4 hover:bg-accent/50 transition-colors group'>
      <div className='flex items-start gap-4 w-full'>
        {/* 左侧：作者头像 */}
        <div className='shrink-0'>
          <Link href={`/users/${topic.username}`}>
            <UserAvatar
              url={topic.userAvatar}
              name={topic.userName || topic.username}
              size='md'
              className={!topic.userAvatarFrame?.itemMetadata ? 'ring-2 ring-transparent group-hover:ring-primary/20 transition-all' : ''}
              frameMetadata={topic.userAvatarFrame?.itemMetadata}
            />
          </Link>
        </div>

        {/* 中间：主要内容区域 */}
        <div className='flex-1 min-w-0'>
          {/* 标题行 */}
            {/* 标题行 - 使用 inline-block 以支持自然换行 */}
            <div className='mb-2 leading-snug'>
              {topic.isPinned && (
                <Pin className='inline-block w-4 h-4 text-chart-5 mr-1.5 align-middle relative -top-[1px]' />
              )}
              {topic.isClosed && (
                <Lock className='inline-block w-4 h-4 text-muted-foreground/60 mr-1.5 align-middle relative -top-[1px]' />
              )}
              <Link
                href={`/topic/${topic.id}`}
               
                className='text-lg font-medium text-foreground group-hover:text-primary visited:text-muted-foreground transition-colors align-middle break-all'
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
             
              className='font-medium text-muted-foreground hover:text-primary transition-colors'
            >
              {topic.userName || topic.username}
            </Link>

            {/* 分类 */}
            <div className='hidden sm:flex items-center'>
               <span className='text-muted-foreground/50 mr-2'>·</span>
               <Badge variant='ghost' className='text-xs font-normal p-0 h-auto hover:bg-transparent'>
                 {categoryName}
               </Badge>
            </div>

            <span className='text-muted-foreground/50'>·</span>

            {/* 发布时间 */}
            <Time date={topic.createdAt || topic.lastPostAt} fromNow />

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

            {/* 移动端统计信息 (放入 Meta 行，且居右) */}
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
}) {
  // 空状态
  if (topics.length === 0) {
    return <EmptyState />;
  }

  return (
    <>
      <div className='bg-card border border-border rounded-lg overflow-hidden w-full'>
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

