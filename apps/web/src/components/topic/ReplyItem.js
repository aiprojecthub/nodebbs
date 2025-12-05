'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Heart,
  MoreHorizontal,
  Loader2,
  Flag,
  Trash2,
  Reply,
  AlertCircle,
  Clock,
  Coins,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import UserAvatar from '@/components/forum/UserAvatar';
import TimeAgo from '@/components/forum/TimeAgo';
import ReportDialog from '@/components/moderation/ReportDialog';
import { RewardDialog } from '@/features/credits/components/RewardDialog';
import { useAuth } from '@/contexts/AuthContext';
import { postApi, creditsApi } from '@/lib/api';
import { toast } from 'sonner';
import MarkdownRender from '../common/MarkdownRender';

import { RewardListDialog } from '@/features/credits/components/RewardListDialog';

export default function ReplyItem({ reply, topicId, onDeleted, onReplyAdded, isCreditEnabled }) {
  const { user, isAuthenticated, openLoginDialog } = useAuth();
  const [likingPostIds, setLikingPostIds] = useState(new Set());
  const [deletingPostId, setDeletingPostId] = useState(null);
  const [replyingToPostId, setReplyingToPostId] = useState(null);
  const [replyToContent, setReplyToContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [rewardDialogOpen, setRewardDialogOpen] = useState(false);
  const [rewardListOpen, setRewardListOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState({
    type: '',
    id: 0,
    title: '',
  });

  // 本地状态
  const [localReply, setLocalReply] = useState(reply);
  const [rewardStats, setRewardStats] = useState({
    totalAmount: 0,
    totalCount: 0
  });

  // 获取打赏统计
  const fetchRewardStats = async () => {
    try {
      const data = await creditsApi.getPostRewards(localReply.id);
      setRewardStats({
        totalAmount: data.totalAmount || 0,
        totalCount: data.total || 0
      });
    } catch (error) {
      console.error('获取打赏统计失败:', error);
    }
  };

  // 初始化获取打赏统计
  useEffect(() => {
    fetchRewardStats();
  }, [localReply.id]);

  // 检查审核状态
  const isPending = localReply.approvalStatus === 'pending';
  const isRejected = localReply.approvalStatus === 'rejected';
  const isOwnReply = user?.id === localReply.userId;
  const canInteract = !isPending && !isRejected; // 只有已批准的回复可以点赞和回复

  // 切换点赞状态
  const handleTogglePostLike = async (postId, isLiked) => {
    if (!isAuthenticated) {
      openLoginDialog();
      return;
    }

    if (likingPostIds.has(postId)) {
      return;
    }

    setLikingPostIds((prev) => new Set(prev).add(postId));

    try {
      if (isLiked) {
        await postApi.unlike(postId);
      } else {
        await postApi.like(postId);
      }

      setLocalReply((prev) => ({
        ...prev,
        isLiked: !isLiked,
        likeCount: isLiked ? prev.likeCount - 1 : prev.likeCount + 1,
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

  // 删除回复
  const handleDeletePost = async (postId, postNumber) => {
    if (!isAuthenticated) {
      openLoginDialog();
      return;
    }

    if (postNumber === 1) {
      toast.error('不能删除话题内容，请删除整个话题');
      return;
    }

    if (!confirm('确定要删除这条回复吗？此操作不可恢复。')) {
      return;
    }

    setDeletingPostId(postId);

    try {
      await postApi.delete(postId);
      toast.success('回复已删除');
      onDeleted?.(postId);
    } catch (err) {
      console.error('删除回复失败:', err);
      toast.error(err.message || '删除失败');
    } finally {
      setDeletingPostId(null);
    }
  };

  // 提交回复到回复
  const handleSubmitReplyToPost = async (replyToPostId) => {
    if (!replyToContent.trim()) {
      toast.error('请输入回复内容');
      return;
    }

    if (!isAuthenticated) {
      openLoginDialog();
      return;
    }

    setSubmitting(true);

    try {
      const response = await postApi.create({
        topicId: topicId,
        content: replyToContent,
        replyToPostId: replyToPostId,
      });

      if (response.requiresApproval) {
        toast.success(
          response.message || '您的回复已提交，等待审核后将公开显示'
        );
      } else {
        toast.success(response.message || '回复成功！');

        // 如果返回了新帖子数据且有回调，立即添加到列表
        if (response.post && onReplyAdded) {
          const newPost = {
            id: response.post.id,
            content: replyToContent,
            userId: user.id,
            userName: user.name,
            username: user.username,
            userUsername: user.username,
            userAvatar: user.avatar,
            topicId: topicId,
            replyToPostId: replyToPostId,
            replyToPost: {
              postNumber: localReply.postNumber,
              userName: localReply.userName,
              userUsername: localReply.userUsername,
            },
            postNumber: response.post.postNumber || 0,
            likeCount: 0,
            isLiked: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            editCount: 0,
            ...response.post,
          };
          onReplyAdded(newPost);
        }
      }

      setReplyToContent('');
      setReplyingToPostId(null);
    } catch (err) {
      console.error('发布回复失败:', err);
      toast.error('发布回复失败：' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div
        id={`post-${localReply.id}`}
        className={`bg-card border rounded-lg hover:border-border/80 transition-colors group ${
          isPending
            ? 'border-chart-5/30 bg-chart-5/5'
            : isRejected
            ? 'border-destructive/30 bg-destructive/5'
            : 'border-border'
        }`}
        data-post-number={localReply.postNumber}
      >
        {/* 回复内容区域 */}
        <div className='px-4 sm:px-6 py-4'>
          {/* 顶部：作者信息栏 */}
          <div className='flex items-center justify-between mb-3'>
            {/* 左侧：作者信息 */}
            <div className='flex items-center gap-2'>
              <Link href={`/users/${localReply.username}`} prefetch={false}>
                <UserAvatar
                  url={localReply.userAvatar}
                  name={localReply.userName}
                  size='sm'
                  className='ring-1 ring-transparent group-hover:ring-primary/15 transition-all'
                />
              </Link>
              <div className='flex items-center gap-1.5 flex-wrap text-sm text-muted-foreground'>
                <Link
                  href={`/users/${localReply.username}`}
                  prefetch={false}
                  className='hover:text-foreground transition-colors'
                >
                  {localReply.userName || localReply.userUsername}
                </Link>
                <span className='text-muted-foreground/30'>·</span>
                <span className='text-xs'>
                  <TimeAgo date={localReply.createdAt} />
                </span>
                <span className='text-muted-foreground/30'>·</span>
                <span className='text-xs font-mono text-muted-foreground/50'>
                  #{localReply.postNumber}
                </span>
                {/* 审核状态标记 */}
                {isPending && (
                  <>
                    <span className='text-muted-foreground/30'>·</span>
                    <Badge
                      variant='outline'
                      className='text-chart-5 border-chart-5 text-xs h-5 gap-1'
                    >
                      <Clock className='h-3 w-3' />
                      待审核
                    </Badge>
                  </>
                )}
                {isRejected && (
                  <>
                    <span className='text-muted-foreground/30'>·</span>
                    <Badge
                      variant='outline'
                      className='text-destructive border-destructive text-xs h-5 gap-1'
                    >
                      <AlertCircle className='h-3 w-3' />
                      已拒绝
                    </Badge>
                  </>
                )}
              </div>
            </div>

            {/* 右侧：操作按钮 */}
            <div className='flex items-center gap-1'>
              {/* 回复按钮 */}
              <Button
                variant='ghost'
                size='sm'
                onClick={() => {
                  if (!isAuthenticated) {
                    openLoginDialog();
                    return;
                  }
                  if (!canInteract) {
                    toast.error('此回复暂时无法回复');
                    return;
                  }
                  setReplyingToPostId(localReply.id);
                  setReplyToContent('');
                }}
                disabled={!canInteract}
                className='h-7 px-2 text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed'
                title={canInteract ? '回复' : '此回复暂时无法回复'}
              >
                <Reply className='h-3.5 w-3.5' />
              </Button>

              {/* 点赞按钮 */}
              <Button
                variant='ghost'
                size='sm'
                onClick={() => {
                  if (!canInteract) {
                    toast.error('此回复暂时无法点赞');
                    return;
                  }
                  handleTogglePostLike(localReply.id, localReply.isLiked);
                }}
                disabled={
                  !canInteract ||
                  likingPostIds.has(localReply.id) ||
                  !isAuthenticated
                }
                className={`h-7 px-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  localReply.isLiked
                    ? 'text-destructive hover:text-destructive/80'
                    : 'text-muted-foreground/60 hover:text-destructive hover:bg-muted/50'
                }`}
                title={
                  canInteract
                    ? localReply.isLiked
                      ? '取消点赞'
                      : '点赞'
                    : '此回复暂时无法点赞'
                }
              >
                {likingPostIds.has(localReply.id) ? (
                  <Loader2 className='h-3.5 w-3.5 animate-spin' />
                ) : (
                  <>
                    <Heart
                      className={`h-3.5 w-3.5 ${
                        localReply.isLiked ? 'fill-current' : ''
                      }`}
                    />
                    {localReply.likeCount > 0 && (
                      <span className='text-xs ml-1'>
                        {localReply.likeCount}
                      </span>
                    )}
                  </>
                )}
              </Button>

              {/* 打赏按钮 */}
              {(isCreditEnabled && !isOwnReply && canInteract) && (
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
                  className='h-7 px-2 text-muted-foreground/60 hover:text-yellow-600 hover:bg-muted/50'
                  title='打赏'
                >
                  <Coins className='h-3.5 w-3.5' />
                  {rewardStats.totalAmount > 0 && (
                    <span className='text-xs ml-1'>
                      {rewardStats.totalAmount}
                    </span>
                  )}
                </Button>
              )}
              
              {/* 如果是作者且有打赏记录，显示查看记录按钮（仅图标） */}
              {(isCreditEnabled && isOwnReply && rewardStats.totalCount > 0) && (
                 <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => setRewardListOpen(true)}
                  className='h-7 px-2 text-muted-foreground/60 hover:text-foreground hover:bg-muted/50'
                  title='查看打赏记录'
                 >
                   <Coins className='h-3.5 w-3.5' />
                   {rewardStats.totalAmount > 0 && (
                     <span className='text-xs'>
                       {rewardStats.totalAmount}
                     </span>
                   )}
                 </Button>
              )}

              {/* 更多操作 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant='ghost'
                    size='sm'
                    className='h-7 w-7 p-0 text-muted-foreground/60 hover:text-foreground hover:bg-muted/50'
                  >
                    <MoreHorizontal className='h-3.5 w-3.5' />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end'>
                  {/* 删除选项 */}
                  {isAuthenticated &&
                    (user?.id === localReply.userId ||
                      ['moderator', 'admin'].includes(user?.role)) && (
                      <>
                        <DropdownMenuItem
                          onClick={() =>
                            handleDeletePost(
                              localReply.id,
                              localReply.postNumber
                            )
                          }
                          disabled={deletingPostId === localReply.id}
                          className='text-destructive focus:text-destructive'
                        >
                          {deletingPostId === localReply.id ? (
                            <>
                              <Loader2 className='h-4 w-4 animate-spin' />
                              删除中...
                            </>
                          ) : (
                            <>
                              <Trash2 className='h-4 w-4' />
                              删除回复
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                  <DropdownMenuItem
                    onClick={() => {
                      setReportTarget({
                        type: 'post',
                        id: localReply.id,
                        title: `回复 #${localReply.postNumber}`,
                      });
                      setReportDialogOpen(true);
                    }}
                    disabled={!isAuthenticated}
                  >
                    <Flag className='h-4 w-4' />
                    举报回复
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* 回复内容 */}
          <div>
            {/* 如果是回复某条回复，显示回复目标 */}
            {localReply.replyToPostId && localReply.replyToPost && (
              <div className='mb-3 text-xs text-muted-foreground/60 items-center gap-1.5 bg-muted/30 px-2.5 py-1.5 rounded inline-flex'>
                <Reply className='h-3 w-3' />
                <span>回复</span>
                <Link
                  href={`/topic/${topicId}#post-${localReply.replyToPost.id}`}
                  prefetch={false}
                >
                  #{localReply.replyToPost.postNumber}
                </Link>
                <span>
                  @
                  {localReply.replyToPost.userName ||
                    localReply.replyToPost.userUsername}
                </span>
              </div>
            )}

            {/* 回复内容 */}
            <div className='max-w-none prose prose-stone dark:prose-invert'>
              <MarkdownRender content={localReply.content} />
            </div>
          </div>
        </div>

        {/* 回复到回复的输入框 */}
        {replyingToPostId === localReply.id && (
          <div className='px-3 sm:px-4 pb-4 border-t border-border'>
            <div className='mt-4'>
              <div className='text-xs text-muted-foreground mb-2'>
                回复 #{localReply.postNumber} @
                {localReply.userName || localReply.userUsername}
              </div>
              <Textarea
                className='w-full min-h-20 resize-none text-sm'
                placeholder='写下你的回复...'
                value={replyToContent}
                onChange={(e) => setReplyToContent(e.target.value)}
                disabled={submitting}
                autoFocus
              />
              <div className='flex items-center justify-end gap-2 mt-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => {
                    setReplyingToPostId(null);
                    setReplyToContent('');
                  }}
                  disabled={submitting}
                >
                  取消
                </Button>
                <Button
                  size='sm'
                  onClick={() => handleSubmitReplyToPost(localReply.id)}
                  disabled={submitting || !replyToContent.trim()}
                >
                  {submitting ? (
                    <>
                      <Loader2 className='h-4 w-4 animate-spin' />
                      提交中...
                    </>
                  ) : (
                    '发表回复'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 举报对话框 */}
      <ReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        reportType={reportTarget.type}
        targetId={reportTarget.id}
        targetTitle={reportTarget.title}
      />

      {/* 打赏对话框 */}
      <RewardDialog
        open={rewardDialogOpen}
        onOpenChange={setRewardDialogOpen}
        postId={localReply.id}
        postAuthor={localReply.userName || localReply.userUsername}
        onSuccess={() => {
          // 打赏成功后刷新打赏列表和统计
          fetchRewardStats();
          if (typeof window !== 'undefined' && window.__refreshRewards) {
            window.__refreshRewards();
          }
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
        postId={localReply.id}
      />
    </>
  );
}
