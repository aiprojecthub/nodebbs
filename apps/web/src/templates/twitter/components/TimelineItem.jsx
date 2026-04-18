import Link from '@/components/common/Link';
import UserAvatar from '@/components/user/UserAvatar';
import Time from '@/components/common/Time';
import {
  MessageSquare,
  Eye,
  ThumbsUp,
  Pin,
  Lock,
  Bookmark,
} from 'lucide-react';

export default function TimelineItem({ topic }) {
  const replyCount = Math.max((topic.postCount || 1) - 1, 0);

  return (
    <Link
      href={`/topic/${topic.id}`}
      className='flex gap-3 px-4 py-3 border-b border-border hover:bg-accent/30 transition-colors cursor-pointer'
    >
      {/* 头像 */}
      <div className='shrink-0 pt-0.5'>
        <UserAvatar
          url={topic.userAvatar}
          name={topic.userName || topic.username}
          size='md'
          frameMetadata={topic.userAvatarFrame?.itemMetadata}
        />
      </div>

      {/* 内容 */}
      <div className='flex-1 min-w-0'>
        {/* 用户信息行 */}
        <div className='flex items-center gap-1 text-[15px] leading-5'>
          <span className='font-bold text-foreground truncate'>
            {topic.userName || topic.username}
          </span>
          <span className='text-muted-foreground text-sm shrink-0 hidden sm:inline'>
            @{topic.username}
          </span>
          <span className='text-muted-foreground shrink-0'>·</span>
          <span className='text-muted-foreground text-sm shrink-0'>
            <Time date={topic.createdAt} fromNow />
          </span>
          {topic.isPinned && (
            <Pin className='w-3.5 h-3.5 text-primary shrink-0 ml-auto' />
          )}
          {topic.isClosed && (
            <Lock className='w-3.5 h-3.5 text-muted-foreground shrink-0' />
          )}
        </div>

        {/* 标题 */}
        <h2 className='text-[15px] font-bold text-foreground leading-snug mt-0.5 break-words'>
          {topic.title}
        </h2>

        {/* 摘要 */}
        {topic.snippet && (
          <p className='text-[15px] text-foreground/80 leading-relaxed mt-1 line-clamp-2 break-words'>
            {topic.snippet}
          </p>
        )}

        {/* 分类 & 标签 */}
        {(topic.categoryName || topic.tags?.length > 0) && (
          <div className='flex items-center gap-2 mt-2 text-[13px]'>
            {topic.categoryName && (
              <span className='text-muted-foreground'>
                {topic.categoryName}
              </span>
            )}
            {topic.tags?.slice(0, 3).map((tag) => (
              <span key={tag} className='text-primary'>
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* 互动栏 */}
        <div className='flex items-center gap-5 mt-2.5 -ml-1.5'>
          {/* 回复 */}
          <span className='flex items-center gap-1 text-muted-foreground text-[13px]'>
            <MessageSquare className='h-[15px] w-[15px]' />
            <span className='tabular-nums'>{replyCount ?? 0}</span>
          </span>

          {/* 浏览 */}
          <span className='flex items-center gap-1 text-muted-foreground text-[13px]'>
            <Eye className='h-[15px] w-[15px]' />
            {topic.viewCount > 0 && <span className='tabular-nums'>{topic.viewCount}</span>}
          </span>
          
        </div>
      </div>
    </Link>
  );
}
