'use client';

import { useState, useEffect } from 'react';
import Link from '@/components/common/Link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Pin,
  Archive,
  Loader2,
  AlertCircle,
  Coins,
  ThumbsUp,
} from 'lucide-react';
import MarkdownRender from '@/components/common/MarkdownRender';
import { RewardDialog } from '@/extensions/rewards/components/RewardDialog';
import { RewardListDialog } from '@/extensions/rewards/components/RewardListDialog';
import Time from '@/components/common/Time';
import { useTopicContext } from '@/contexts/TopicContext';
import { useAuth } from '@/contexts/AuthContext';
import { postApi } from '@/lib/api';
import { toast } from 'sonner';

/**
 * 话题内容组件（首帖展示）
 */
export default function TopicContent() {
  const {
    topic,
    rewardStats,
    isRewardEnabled,
    handleRewardSuccess,
  } = useTopicContext();

  const { user, isAuthenticated, openLoginDialog } = useAuth();

  // 首帖点赞状态
  const [likingPostIds, setLikingPostIds] = useState(new Set());
  const [likeState, setLikeState] = useState({
    isFirstPostLiked: topic.isFirstPostLiked || false,
    firstPostLikeCount: topic.firstPostLikeCount || 0,
  });

  // topic 更新时同步点赞状态
  useEffect(() => {
    setLikeState({
      isFirstPostLiked: topic.isFirstPostLiked || false,
      firstPostLikeCount: topic.firstPostLikeCount || 0,
    });
  }, [topic.isFirstPostLiked, topic.firstPostLikeCount]);

  // 打赏弹窗状态
  const [rewardDialogOpen, setRewardDialogOpen] = useState(false);
  const [rewardListOpen, setRewardListOpen] = useState(false);

  /**
   * 切换首帖点赞状态
   */
  const handleTogglePostLike = async (postId, isLiked) => {
    if (!isAuthenticated) return openLoginDialog();
    if (likingPostIds.has(postId)) return;

    setLikingPostIds((prev) => new Set(prev).add(postId));

    try {
      if (isLiked) {
        await postApi.unlike(postId);
      } else {
        await postApi.like(postId);
      }

      setLikeState((prev) => ({
        isFirstPostLiked: !isLiked,
        firstPostLikeCount: isLiked
          ? (prev.firstPostLikeCount || 0) - 1
          : (prev.firstPostLikeCount || 0) + 1,
      }));

      toast.success(isLiked ? '已取消点赞' : '点赞成功');
    } catch (err) {
      console.error('点赞操作失败:', err);
      toast.error(err.message || '操作失败');
    } finally {
      setLikingPostIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
    }
  };

  return (
    <>
      {/* 已删除话题提示 */}
      {topic.isDeleted && (
        <div className='mb-4 bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-start gap-3'>
          <Archive className='h-5 w-5 text-destructive shrink-0 mt-0.5' />
          <div className='flex-1'>
            <p className='text-sm font-medium text-destructive mb-1'>
              此话题已被删除
            </p>
            <p className='text-xs text-muted-foreground'>
              您有权限查看已删除的话题内容。普通用户无法访问此话题。
            </p>
          </div>
        </div>
      )}

      {/* 被拒绝话题提示 */}
      {topic.approvalStatus === 'rejected' && user?.id === topic.userId && (
        <div className='mb-4 bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-start gap-3'>
          <AlertCircle className='h-5 w-5 text-destructive shrink-0 mt-0.5' />
          <div className='flex-1'>
            <p className='text-sm font-medium text-destructive mb-1'>
              此话题审核未通过
            </p>
            <p className='text-xs text-muted-foreground'>
              您可以编辑话题内容后重新提交审核。编辑后，话题将自动重新进入待审核状态。
            </p>
          </div>
        </div>
      )}

      {/* 话题标题 */}
      <div className='px-3 pt-4 sm:px-0 sm:pt-0 mb-6'>
        <div className='flex items-start'>
          <div className='flex-1 min-w-0'>
            <h1 className='text-2xl sm:text-3xl font-semibold mb-3 leading-tight text-foreground break-all'>
              {topic.isPinned && (
                <Pin className='inline-block h-5 w-5 text-chart-5 -mt-1' />
              )}
              {topic.title}
            </h1>

            {/* 元信息 */}
            <div className='flex items-center gap-2 text-sm text-muted-foreground/70 flex-wrap'>
              <span
                className={
                  topic.isDeleted
                    ? 'text-destructive/80'
                    : topic.isClosed
                    ? 'text-muted-foreground/70'
                    : 'text-chart-2/80'
                }
              >
                {topic.isDeleted
                  ? '已删除'
                  : topic.isClosed
                  ? '已关闭'
                  : '开放中'}
              </span>
              <span className='opacity-50'>•</span>
              <Link
                href={`/users/${topic.username}`}

                className='hover:text-foreground transition-colors'
              >
                {topic.userName || topic.username}
              </Link>
              <span className='opacity-70'>
                发布于 <Time date={topic.createdAt} fromNow />
              </span>
              {topic.approvalStatus === 'pending' && (
                <>
                  <span className='opacity-50'>•</span>
                  <Badge
                    variant='outline'
                    className='text-chart-5 border-chart-5 text-xs'
                  >
                    待审核
                  </Badge>
                </>
              )}
              {topic.approvalStatus === 'rejected' && (
                <>
                  <span className='opacity-50'>•</span>
                  <Badge
                    variant='outline'
                    className='text-destructive border-destructive text-xs'
                  >
                    已拒绝
                  </Badge>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 话题内容 - 首帖 */}
      <div
        className='bg-card border-b sm:border sm:border-border sm:rounded-lg mb-6'
        data-post-number='1'
      >
        <div className='px-3 sm:px-6 py-4 sm:py-5'>
          <article className='max-w-none prose prose-stone dark:prose-invert break-all'>
            <MarkdownRender content={topic.content} />
          </article>

          {/* 首帖底部操作栏 */}
          {topic.firstPostId && (
            <div className='flex items-center justify-end gap-2 mt-5 pt-4 border-t border-border/50'>
              {/* 点赞按钮 */}
              <Button
                variant='ghost'
                size='sm'
                onClick={() =>
                  handleTogglePostLike(
                    topic.firstPostId,
                    likeState.isFirstPostLiked
                  )
                }
                disabled={
                  likingPostIds.has(topic.firstPostId) || !isAuthenticated
                }
                className={`${
                  likeState.isFirstPostLiked
                    ? 'text-destructive hover:text-destructive/80 bg-destructive/5'
                    : 'text-muted-foreground hover:text-destructive hover:bg-destructive/5'
                }`}
                title={likeState.isFirstPostLiked ? '取消点赞' : '点赞'}
              >
                {likingPostIds.has(topic.firstPostId) ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <>
                    <ThumbsUp
                      className={`h-4 w-4 ${
                        likeState.isFirstPostLiked ? 'fill-current' : ''
                      }`}
                    />
                    <span className='text-sm'>
                      {likeState.firstPostLikeCount > 0
                        ? likeState.firstPostLikeCount
                        : '点赞'}
                    </span>
                  </>
                )}
              </Button>

              {/* 打赏按钮 */}
              {(isRewardEnabled && user?.id !== topic.userId) && (
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => {
                    if (!isAuthenticated) {
                      openLoginDialog();
                      return;
                    }
                    setRewardDialogOpen(true);
                  }}
                  className={`gap-1.5 transition-colors ${
                    (rewardStats[topic.firstPostId]?.totalAmount || 0) > 0
                      ? 'text-amber-600 bg-amber-50 hover:bg-amber-100 dark:text-amber-400 dark:bg-amber-900/20 dark:hover:bg-amber-900/40 border-amber-200/50 dark:border-amber-900/50'
                      : 'text-muted-foreground hover:text-yellow-600 hover:bg-yellow-500/10'
                  }`}
                  title='打赏'
                >
                  <Coins className='h-4 w-4' />
                  {(rewardStats[topic.firstPostId]?.totalAmount || 0) > 0 ? (
                    <span className='text-sm font-medium'>
                      {rewardStats[topic.firstPostId].totalAmount}
                    </span>
                  ) : (
                    <span className='text-sm'>
                      打赏
                    </span>
                  )}
                </Button>
              )}

              {/* 如果是作者，或者有打赏记录，且不是当前用户（因为当前用户点击打赏按钮也能看到记录入口），显示查看记录按钮 */}
              {(isRewardEnabled && user?.id === topic.userId && (rewardStats[topic.firstPostId]?.totalCount || 0) > 0) && (
                 <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => setRewardListOpen(true)}
                  className='text-muted-foreground hover:text-foreground'
                  title='查看打赏记录'
                 >
                   <span className="text-xs">
                     {rewardStats[topic.firstPostId].totalCount} 次打赏
                   </span>
                 </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 打赏对话框 */}
      {topic.firstPostId && (
        <RewardDialog
          open={rewardDialogOpen}
          onOpenChange={setRewardDialogOpen}
          postId={topic.firstPostId}
          postAuthor={topic.userName || topic.username}
          onSuccess={(amount) => {
            handleRewardSuccess(topic.firstPostId, amount);
          }}
          onViewHistory={() => {
            setRewardDialogOpen(false);
            setRewardListOpen(true);
          }}
        />
      )}

      {/* 打赏记录对话框 */}
      {topic.firstPostId && (
        <RewardListDialog
          open={rewardListOpen}
          onOpenChange={setRewardListOpen}
          postId={topic.firstPostId}
        />
      )}
    </>
  );
}
