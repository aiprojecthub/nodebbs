'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Coins, ThumbsUp } from 'lucide-react';
import { RewardDialog } from '@/extensions/rewards/components/RewardDialog';
import { RewardListDialog } from '@/extensions/rewards/components/RewardListDialog';
import { useTopicContext } from '@/contexts/TopicContext';
import { useAuth } from '@/contexts/AuthContext';

/**
 * 首帖操作栏（点赞 + 打赏）
 * 原子组件，从 TopicContext 获取数据和操作
 */
export default function FirstPostActions() {
  const {
    topic,
    rewardStats,
    isRewardEnabled,
    handleRewardSuccess,
    toggleFirstPostLike,
    actionLoading,
  } = useTopicContext();

  const { user, isAuthenticated, openLoginDialog } = useAuth();

  const [rewardDialogOpen, setRewardDialogOpen] = useState(false);
  const [rewardListOpen, setRewardListOpen] = useState(false);

  if (!topic.firstPostId) return null;

  return (
    <>
      <div className='flex items-center justify-end gap-2 pt-4'>
        {/* 点赞按钮 */}
        <Button
          variant='ghost'
          size='sm'
          onClick={toggleFirstPostLike}
          disabled={actionLoading.like}
          className={`${
            topic.isFirstPostLiked
              ? 'text-destructive hover:text-destructive/80 bg-destructive/5'
              : 'text-muted-foreground hover:text-destructive hover:bg-destructive/5'
          }`}
          title={topic.isFirstPostLiked ? '取消点赞' : '点赞'}
        >
          {actionLoading.like ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : (
            <>
              <ThumbsUp
                className={`h-4 w-4 ${
                  topic.isFirstPostLiked ? 'fill-current' : ''
                }`}
              />
              <span className='text-sm'>
                {topic.firstPostLikeCount > 0
                  ? topic.firstPostLikeCount
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

        {/* 查看打赏记录 */}
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

      {/* 打赏对话框 */}
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

      {/* 打赏记录对话框 */}
      <RewardListDialog
        open={rewardListOpen}
        onOpenChange={setRewardListOpen}
        postId={topic.firstPostId}
      />
    </>
  );
}
