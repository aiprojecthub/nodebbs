import Link from '@/components/common/Link';
import { Badge } from '@/components/ui/badge';
import UserAvatar from '@/components/user/UserAvatar';
import Time from '@/components/common/Time';
import { HighlightText } from './HighlightText';

/**
 * 搜索专用话题项组件
 * 精简设计：标题 → 摘要 → 作者·分类·时间
 * 去掉统计信息、标签等浏览导向的元素，聚焦搜索匹配内容
 */
export function SearchTopicItem({ topic, keyword }) {
  const categoryName =
    topic.categoryName || topic.category?.name || '未知分类';

  return (
    <div
      className='p-3 group relative hover:bg-accent/50'
      style={{ contain: 'layout style' }}
    >
      <div className='flex items-start gap-3 w-full'>
        {/* 头像 */}
        <div className='shrink-0 mt-0.5'>
          <Link href={`/users/${topic.username}`}>
            <UserAvatar
              url={topic.userAvatar}
              name={topic.userName || topic.username}
              size='md'
              className='ring-2 ring-transparent group-hover:ring-primary/20'
              frameMetadata={topic.userAvatarFrame?.itemMetadata}
            />
          </Link>
        </div>

        {/* 内容区域 */}
        <div className='flex-1 min-w-0'>
          {/* 标题（关键词高亮） */}
          <div className='mb-1.5 leading-snug relative'>
            <Link
              href={`/topic/${topic.id}`}
              className='text-base font-medium align-middle break-all before:absolute before:inset-0 before:z-0 text-foreground group-hover:text-primary'
            >
              <HighlightText text={topic.title} keyword={keyword} />
            </Link>
          </div>

          {/* 正文摘要（关键词高亮） */}
          {topic.snippet && (
            <div className='text-sm text-muted-foreground line-clamp-2 mb-2 wrap-break-word'>
              <HighlightText text={topic.snippet} keyword={keyword} />
            </div>
          )}

          {/* 元信息：作者 · 分类 · 时间 */}
          <div className='flex items-center gap-2 text-xs text-muted-foreground'>
            <span className='font-medium text-foreground/70'>
              {topic.userName || topic.username}
            </span>
            <span className='text-muted-foreground/40'>·</span>
            <Badge
              variant='secondary'
              className='text-xs font-normal px-1.5 py-0 h-auto bg-muted/50'
            >
              {categoryName}
            </Badge>
            <span className='text-muted-foreground/40'>·</span>
            <span className='text-muted-foreground/60'>
              <Time date={topic.createdAt || topic.lastPostAt} fromNow />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
