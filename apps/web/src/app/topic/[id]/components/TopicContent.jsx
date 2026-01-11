'use client';

import Link from '@/components/common/Link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  MessageSquare,
  Heart,
  Lock,
  Pin,
  Archive,
  Loader2,
  AlertCircle,
  Coins,
} from 'lucide-react';
import MarkdownRender from '@/components/common/MarkdownRender';
import { RewardDialog } from '@/extensions/rewards/components/RewardDialog';
import { RewardListDialog } from '@/extensions/rewards/components/RewardListDialog';
import Time from '@/components/common/Time';
import { useTopicContent } from '@/hooks/topic/useTopicContent';

/**
 * 话题内容组件（首帖展示）
 * 所有数据统一从 useTopicContent Hook 获取，确保单一数据入口
 */
export default function TopicContent() {
  const {
    // 来自 Context 的共享状态
    topic,
    rewardStats,
    isRewardEnabled,
    handleRewardSuccess,
    // 来自 AuthContext
    user,
    isAuthenticated,
    openLoginDialog,
    // 首帖专用状态
    likingPostIds,
    likeState,
    rewardDialogOpen,
    setRewardDialogOpen,
    rewardListOpen,
    setRewardListOpen,
    handleTogglePostLike,
  } = useTopicContent();

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
              作为{user?.role === 'admin' ? '管理员' : '版主'}
              ，您可以查看已删除的话题内容。普通用户无法访问此话题。
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
      <div className='mb-6'>
        <div className='flex items-start gap-3'>
          <div className='shrink-0 mt-1.5'>
            {topic.isDeleted ? (
              <Archive className='h-6 w-6 text-destructive/80' />
            ) : topic.isClosed ? (
              <Lock className='h-6 w-6 text-muted-foreground/70' />
            ) : (
              <MessageSquare className='h-6 w-6 text-chart-2/80' />
            )}
          </div>

          <div className='flex-1 min-w-0'>
            <h1 className='text-3xl font-bold mb-3 leading-tight text-foreground break-all'>
              {topic.isPinned && (
                <Pin className='inline-block h-5 w-5 mr-2 text-chart-5 -mt-1' />
              )}
              {topic.title}
              {topic.isDeleted && (
                <Badge
                  variant='outline'
                  className='ml-3 text-destructive border-destructive text-xs'
                >
                  已删除
                </Badge>
              )}
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
        className='bg-card border border-border rounded-lg mb-6'
        data-post-number='1'
      >
        <div className='px-4 sm:px-6 py-5'>
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
                    <Heart
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
            // 局部更新打赏统计，无需重新调用批量接口
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
