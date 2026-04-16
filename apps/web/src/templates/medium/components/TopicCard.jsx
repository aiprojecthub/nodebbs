import Link from '@/components/common/Link';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Eye, Pin, Lock } from 'lucide-react';
import UserAvatar from '@/components/user/UserAvatar';
import Time from '@/components/common/Time';

export default function TopicCard({ topic }) {
  const replyCount = Math.max((topic.postCount || 1) - 1, 0);
  const categoryName = topic.categoryName || topic.category?.name;

  return (
    <div className='py-6 border-b border-border/60 group'>
      {/* 作者信息 */}
      <div className='flex items-center gap-2 mb-2'>
        <Link href={`/users/${topic.username}`}>
          <UserAvatar
            url={topic.userAvatar}
            name={topic.userName || topic.username}
            size='xs'
            frameMetadata={topic.userAvatarFrame?.itemMetadata}
          />
        </Link>
        <Link
          href={`/users/${topic.username}`}
          className='text-[13px] font-medium text-foreground hover:underline'
        >
          {topic.userName || topic.username}
        </Link>
        {categoryName && (
          <>
            <span className='text-muted-foreground/40 text-xs'>in</span>
            <Link
              href={`/categories/${topic.categorySlug || ''}`}
              className='text-[13px] text-muted-foreground hover:text-foreground transition-colors'
            >
              {categoryName}
            </Link>
          </>
        )}
      </div>

      {/* 标题 */}
      <Link href={`/topic/${topic.id}`} className='block group/title'>
        <h2
          className='text-xl font-bold text-foreground leading-snug mb-1 group-hover/title:underline decoration-foreground/20 underline-offset-2 break-words'
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          {topic.isPinned && <Pin className='inline h-4 w-4 text-primary mr-1.5 -mt-0.5' />}
          {topic.isClosed && <Lock className='inline h-3.5 w-3.5 text-muted-foreground mr-1.5 -mt-0.5' />}
          {topic.title}
        </h2>
      </Link>

      {/* 摘要 */}
      {topic.snippet && (
        <Link href={`/topic/${topic.id}`} className='block'>
          <p className='text-[15px] text-muted-foreground leading-relaxed line-clamp-2 mb-3 break-words'>
            {topic.snippet}
          </p>
        </Link>
      )}

      {/* 底部: 标签 + 时间 + 统计 */}
      <div className='flex items-center gap-2 text-[13px] text-muted-foreground flex-wrap'>
        {topic.tags?.slice(0, 2).map((tag) => (
          <Badge
            key={tag}
            variant='secondary'
            className='text-xs font-normal px-2.5 py-0.5 bg-muted/60 hover:bg-muted transition-colors rounded-full'
          >
            {tag}
          </Badge>
        ))}
        <span className='text-muted-foreground/60'>
          <Time date={topic.createdAt || topic.lastPostAt} fromNow />
        </span>
        {replyCount > 0 && (
          <span className='flex items-center gap-1 text-muted-foreground/60'>
            <MessageSquare className='h-3.5 w-3.5' />
            {replyCount}
          </span>
        )}
        {topic.viewCount > 0 && (
          <span className='flex items-center gap-1 text-muted-foreground/60'>
            <Eye className='h-3.5 w-3.5' />
            {topic.viewCount}
          </span>
        )}
        {topic.approvalStatus === 'pending' && (
          <Badge variant='outline' className='text-chart-5 border-chart-5 text-xs'>待审核</Badge>
        )}
        {topic.approvalStatus === 'rejected' && (
          <Badge variant='outline' className='text-destructive border-destructive text-xs'>已拒绝</Badge>
        )}
      </div>
    </div>
  );
}
