'use client';

import { useState } from 'react';
import Link from '@/components/common/Link';
import UserAvatar from '@/components/user/UserAvatar';
import Time from '@/components/common/Time';
import { Badge } from '@/components/ui/badge';
import { ThumbsUp, MessageSquare, Eye, Loader2, Pin, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { postApi } from '@/lib/api';

export default function JatraTopicCard({ topic }) {
  const replyCount = Math.max((topic.postCount || 1) - 1, 0);
  const { isAuthenticated, openLoginDialog } = useAuth();
  const isPinned = topic.isPinned;

  const [isLiked, setIsLiked] = useState(!!topic.isFirstPostLiked);
  const [likeCount, setLikeCount] = useState(topic.firstPostLikeCount || 0);
  const [likeLoading, setLikeLoading] = useState(false);

  const handleLike = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) return openLoginDialog();
    if (!topic.firstPostId || likeLoading) return;

    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLikeCount((c) => c + (wasLiked ? -1 : 1));
    setLikeLoading(true);

    try {
      if (wasLiked) {
        await postApi.unlike(topic.firstPostId);
      } else {
        await postApi.like(topic.firstPostId);
      }
    } catch (err) {
      setIsLiked(wasLiked);
      setLikeCount((c) => c + (wasLiked ? 1 : -1));
      toast.error(err.message || '操作失败');
    } finally {
      setLikeLoading(false);
    }
  };

  return (
    <div
      className={cn(
        'jatra-card p-5 mb-4 hover:shadow-md transition-shadow group relative',
        isPinned && 'bg-primary/5! dark:bg-primary/10! ring-1 ring-primary/10'
      )}
    >
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

      {/* 标题与状态标记 */}
      <div className='mb-2 leading-snug'>
        {isPinned && (
          <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary align-middle mr-1.5'>
            <Pin className='w-3 h-3' />
            置顶
          </span>
        )}
        {topic.isClosed && (
          <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground align-middle mr-1.5'>
            <Lock className='w-3 h-3' />
            已关闭
          </span>
        )}
        <h2 className='inline text-xl font-bold text-foreground leading-snug group-hover:text-primary transition-colors align-middle'>
          {topic.title}
        </h2>
        {topic.approvalStatus === 'pending' && (
          <Badge
            variant='outline'
            className='text-chart-5 border-chart-5 text-xs h-5 inline-flex align-middle ml-2'
          >
            待审核
          </Badge>
        )}
        {topic.approvalStatus === 'rejected' && (
          <Badge
            variant='outline'
            className='text-destructive border-destructive text-xs h-5 inline-flex align-middle ml-2'
          >
            已拒绝
          </Badge>
        )}
      </div>

      {/* 摘要/内容 */}
      {topic.snippet && (
        <p className='text-muted-foreground leading-relaxed line-clamp-3 mb-4'>
          {topic.snippet}
        </p>
      )}

      {/* 底部：标签和统计 */}
      <div className='flex flex-wrap items-center justify-between pt-3 mt-2 relative z-20'>
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
          <button
            onClick={handleLike}
            disabled={likeLoading}
            aria-pressed={isLiked}
            title={isLiked ? '取消点赞' : '点赞'}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1 rounded-md border transition-colors font-medium disabled:opacity-60',
              isLiked
                ? 'border-primary/40 bg-primary/5 text-primary hover:bg-primary/10'
                : 'border-border text-muted-foreground hover:bg-muted'
            )}
          >
            {likeLoading ? (
              <Loader2 className='w-3.5 h-3.5 animate-spin' />
            ) : (
              <ThumbsUp className={cn('w-3.5 h-3.5', isLiked && 'fill-current')} />
            )}
            <span>点赞</span>
            <span className={cn('pl-2 border-l font-semibold ml-0.5', isLiked ? 'border-primary/30' : 'border-border')}>
              {likeCount}
            </span>
          </button>

          <Link
            href={`/topic/${topic.id}`}
            className='flex items-center gap-1.5 px-3 py-1 rounded-md border border-border text-muted-foreground hover:bg-muted transition-colors font-medium'
          >
            <MessageSquare className='w-3.5 h-3.5' />
            <span>回复</span>
            <span className='pl-2 border-l border-border font-semibold ml-0.5'>{replyCount}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
