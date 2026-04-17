import Link from '@/components/common/Link';
import UserAvatar from '@/components/user/UserAvatar';
import Time from '@/components/common/Time';
import { ThumbsUp, MessageSquare, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function JatraTopicCard({ topic }) {
  const replyCount = Math.max((topic.postCount || 1) - 1, 0);

  return (
    <div className='jatra-card p-5 mb-4 hover:shadow-md transition-shadow group relative'>
      <Link href={`/topic/${topic.id}`} className='absolute inset-0 z-10'>
        <span className='sr-only'>View Topic</span>
      </Link>
      
      {/* 头部：用户信息和时间与浏览量 */}
      <div className='flex items-start justify-between mb-3 relative z-20'>
        <div className='flex items-center gap-3'>
          <Link href={`/users/${topic.username}`} className='shrink-0 hover:opacity-80 transition'>
            <UserAvatar
              url={topic.userAvatar}
              name={topic.userName || topic.username}
              size='sm'
              frameMetadata={topic.userAvatarFrame?.itemMetadata}
            />
          </Link>
          <div className='flex flex-col'>
            <Link href={`/users/${topic.username}`} className='font-semibold text-foreground hover:text-primary transition text-[15px]'>
              {topic.userName || topic.username}
            </Link>
            <span className='text-muted-foreground text-xs'>@{topic.username}</span>
          </div>
        </div>

        <div className='flex flex-col items-end gap-1 text-xs text-muted-foreground'>
          <span className='flex items-center gap-1.5'>
            <Time date={topic.createdAt} format='MMM DD, YYYY' />
          </span>
          {topic.viewCount > 0 && (
            <span className='flex items-center gap-1 font-medium'>
              <Eye className='w-3 h-3' />
              {topic.viewCount}
            </span>
          )}
        </div>
      </div>

      {/* 标题 */}
      <h2 className='text-xl flex items-center font-bold text-foreground mb-2 leading-snug group-hover:text-primary transition-colors'>
        {topic.title}
        {topic.isPinned && <span className='ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium'>Pinned</span>}
      </h2>

      {/* 摘要/内容 */}
      {topic.snippet && (
        <p className='text-muted-foreground leading-relaxed line-clamp-3 mb-4'>
          {topic.snippet}
        </p>
      )}

      {/* 底部：标签和统计 */}
      <div className='flex flex-wrap items-center justify-between border-t border-border pt-3 mt-2 relative z-20'>
        <div className='flex items-center gap-2'>
          {topic.categoryName && (
            <Link href={`/categories/${topic.categorySlug}`} className='text-xs bg-muted text-muted-foreground hover:bg-muted/80 px-2.5 py-1 rounded-md transition'>
              {topic.categoryName}
            </Link>
          )}
          {topic.tags?.slice(0, 3).map((tag) => (
            <Link key={tag} href={`/tag/${tag}`} className='text-xs bg-primary/10 text-primary hover:bg-primary/20 px-2.5 py-1 rounded-md transition'>
              #{tag}
            </Link>
          ))}
        </div>

        <div className='flex items-center gap-3 text-[13px]'>
          <button className='flex items-center gap-1.5 px-3 py-1 rounded-md border border-border text-muted-foreground hover:bg-muted transition-colors font-medium'>
            <ThumbsUp className='w-3.5 h-3.5' />
            <span>Like</span>
            <span className='pl-2 border-l border-border font-semibold ml-0.5'>{topic.firstPostLikeCount || 0}</span>
          </button>
          
          <button className='flex items-center gap-1.5 px-3 py-1 rounded-md border border-border text-muted-foreground hover:bg-muted transition-colors font-medium'>
            <MessageSquare className='w-3.5 h-3.5' />
            <span>Replies</span>
            <span className='pl-2 border-l border-border font-semibold ml-0.5'>{replyCount}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
