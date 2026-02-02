'use client';

import { useState, useRef, useEffect } from 'react';
import Link from '@/components/common/Link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import MarkdownEditor from '@/components/common/MarkdownEditor';
import CopyButton from '@/components/common/CopyButton';
import {
  MoreHorizontal,
  Loader2,
  Flag,
  Trash2,
  Reply,
  AlertCircle,
  Clock,
  Coins,
  Check,
  Pencil,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import UserAvatar from '@/components/user/UserAvatar';
import ReportDialog from '@/components/common/ReportDialog';
import { RewardDialog } from '@/extensions/rewards/components/RewardDialog';
import { toast } from 'sonner';
import MarkdownRender from '@/components/common/MarkdownRender';
import { RewardListDialog } from '@/extensions/rewards/components/RewardListDialog';
import Time from '@/components/common/Time';
import { useReplyItem } from '@/hooks/topic/useReplyItem';

export default function ReplyItem({ reply, topicId, onDeleted, onReplyAdded, isRewardEnabled, rewardStats, onRewardSuccess }) {
  const {
    user,
    isAuthenticated,
    openLoginDialog,
    likingPostIds,
    deletingPostId,
    replyingToPostId,
    setReplyingToPostId,
    replyToContent,
    setReplyToContent,
    submitting,
    reportDialogOpen,
    setReportDialogOpen,
    rewardDialogOpen,
    setRewardDialogOpen,
    rewardListOpen,
    setRewardListOpen,
    origin,
    reportTarget,
    openReportDialog,
    localReply,
    localRewardStats,
    isPending,
    isRejected,
    isOwnReply,
    canInteract,
    canEdit,
    canDelete,
    isEditing,
    editContent,
    setEditContent,
    isSubmittingEdit,
    handleTogglePostLike,
    handleDeletePost,
    handleSubmitReplyToPost,
    handleRewardSuccess,
    handleStartEdit,
    handleCancelEdit,
    handleSubmitEdit,
  } = useReplyItem({
    reply,
    topicId,
    onDeleted,
    onReplyAdded,
    rewardStats,
    onRewardSuccess
  });

  // 长内容展开/折叠状态
  const contentRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsCollapse, setNeedsCollapse] = useState(false);
  const [hasCheckedHeight, setHasCheckedHeight] = useState(false);
  const MAX_CONTENT_HEIGHT = 300; // 折叠阈值高度 (px)

  // 检测内容高度 - 使用 useLayoutEffect 在绘制前完成检测，避免闪烁
  useEffect(() => {
    if (contentRef.current && !isEditing) {
      const height = contentRef.current.scrollHeight;
      setNeedsCollapse(height > MAX_CONTENT_HEIGHT);
      setHasCheckedHeight(true);
    }
  }, [localReply.content, isEditing]);

  // 处理键盘快捷键提交
  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmitReplyToPost(localReply.id);
    }
  };

  return (
    <>
      <div
        id={`post-${localReply.id}`}
        className={`bg-card border-b border-x-0 border-t-0 sm:border sm:rounded-lg hover:border-border/80 transition-colors duration-300 group ${
          isPending
            ? 'border-chart-5/30 bg-chart-5/5'
            : isRejected
            ? 'border-destructive/30 bg-destructive/5'
            : localReply.userRole === 'admin'
            ? 'border-border'
            : 'border-border'
        }`}
        data-post-number={localReply.postNumber}
      >
        <div className='p-3 sm:p-5'>
          {/* 头部信息区 */}
          <div className='flex items-start justify-between gap-4 mb-4'>
            <div className='flex items-start gap-3'>
              {/* 头像 */}
              <Link href={`/users/${localReply.username}`} className="shrink-0 mt-0.5">
                <UserAvatar
                  url={localReply.userAvatar}
                  name={localReply.userName}
                  size='md'
                  frameMetadata={localReply.userAvatarFrame?.itemMetadata}
                />
              </Link>

              <div className='flex flex-col gap-0.5 min-w-0'>
                {/* 第一行：用户名 */}
                <div className='flex items-center gap-2 text-sm'>
                  <Link
                    href={`/users/${localReply.username}`}
                   
                    className='font-medium text-foreground hover:underline decoration-primary/50 underline-offset-4 truncate'
                  >
                    {localReply.userName || localReply.userUsername}
                  </Link>
                </div>

                {/* 第二行：时间与徽章 */}
                <div className='flex items-center gap-2 text-xs text-muted-foreground/70 flex-wrap leading-none'>
                  <Time date={localReply.createdAt} fromNow />
                  
                  {/* 已编辑标记 */}
                  {localReply.editedAt && (
                    <span className="text-muted-foreground/50" title={`已编辑 ${localReply.editCount || 1} 次`}>
                      (已编辑)
                    </span>
                  )}
                  
                  {/* 角色标识 */}
                  {localReply.topicUserId === localReply.userId && (
                    <Badge variant="secondary" className="px-1.5 h-4 text-[10px] font-normal bg-primary/10 text-primary hover:bg-primary/20 border-0 rounded">
                      楼主
                    </Badge>
                  )}
                  
                  {localReply.userRole === 'admin' && (
                     <Badge variant="secondary" className="px-1.5 h-4 text-[10px] font-normal bg-chart-1/10 text-chart-1 hover:bg-chart-1/20 border-0 rounded">
                      管理员
                    </Badge>
                  )}

                  {/* 状态标识 */}
                  {isPending && (
                    <Badge variant="outline" className="px-1.5 h-4 text-[10px] font-normal text-chart-5 border-chart-5/30 gap-1 rounded">
                      <Clock className='h-2.5 w-2.5' /> 审核中
                    </Badge>
                  )}

                  {isRejected && (
                    <Badge variant="outline" className="px-1.5 h-4 text-[10px] font-normal text-destructive border-destructive/30 gap-1 rounded">
                      <AlertCircle className='h-2.5 w-2.5' /> 已拒绝
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* 右上角操作区：楼层号 */}
            <div className="flex items-center">
              {/* 楼层号 (带复制功能) - 放大显示 */}
              <CopyButton 
                value={`${origin}/topic/${topicId}#post-${localReply.id}`}
                className="h-8 px-2 text-xs sm:text-base font-bold text-muted-foreground/30 hover:text-primary hover:cursor-pointer font-mono hover:bg-transparent transition-colors"
                variant="ghost"
                onCopy={() => toast.success('链接已复制')}
              >
                 {({ copied }) => (
                  <>
                    <span className="sr-only">复制链接</span>
                    {copied ? (
                      <Check className="h-5 w-5 text-green-500" />
                    ) : (
                      <>#{localReply.postNumber}</>
                    )}
                  </>
                )}
              </CopyButton>
            </div>
          </div>

          {/* 内容区域 */}
          <div className="pl-0 sm:pl-[52px]">
            {/* 引用/回复目标 */}
            {localReply.replyToPostId && localReply.replyToPost && (
              <div className='mb-3 text-xs text-muted-foreground/60 flex items-center gap-1.5 bg-muted/30 px-3 py-2 rounded-md border border-border/50 w-fit max-w-full'>
                <Reply className='h-3 w-3 shrink-0 opacity-70' />
                <span className="shrink-0">回复</span>
                <Link
                  href={`/topic/${topicId}#post-${localReply.replyToPost.id}`}
                 
                  className="hover:text-primary transition-colors font-mono"
                >
                  #{localReply.replyToPost.postNumber}
                </Link>
                <span className="truncate max-w-[150px] sm:max-w-xs">
                  {localReply.replyToPost.userName || localReply.replyToPost.userUsername}
                </span>
              </div>
            )}

            {/* Markdown 内容 / 编辑器 */}
            {isEditing ? (
              <div className='bg-muted/30 rounded-lg p-3 sm:p-4 border border-border/50'>
                <div className='flex items-center justify-between text-xs text-muted-foreground mb-2'>
                  <span className="flex items-center gap-1">
                    <Pencil className="h-3 w-3" />
                    编辑回复
                  </span>
                </div>
                <MarkdownEditor
                  editorClassName='min-h-[120px]'
                  placeholder='编辑回复内容...'
                  value={editContent}
                  onChange={setEditContent}
                  disabled={isSubmittingEdit}
                  minimal={true}
                  autoFocus
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                      e.preventDefault();
                      handleSubmitEdit();
                    }
                  }}
                  uploadType="topics"
                />
                <div className='flex items-center justify-end gap-2 mt-3'>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={handleCancelEdit}
                    disabled={isSubmittingEdit}
                    className="h-8"
                  >
                    取消
                  </Button>
                  <Button
                    size='sm'
                    onClick={handleSubmitEdit}
                    disabled={isSubmittingEdit || !editContent.trim()}
                    className="h-8"
                  >
                    {isSubmittingEdit ? (
                      <>
                        <Loader2 className='h-3.5 w-3.5 mr-1.5 animate-spin' />
                        保存中...
                      </>
                    ) : (
                      '保存修改'
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <div 
                  ref={contentRef}
                  className={`max-w-none prose prose-stone dark:prose-invert prose-sm sm:prose-base break-words transition-all duration-300 ${
                    // 检测完成前默认折叠，检测完成后根据实际情况决定
                    (!hasCheckedHeight || (!isExpanded && needsCollapse)) ? 'max-h-[300px] overflow-hidden' : ''
                  }`}
                  style={{
                    // 只有检测完成且确认需要折叠时才显示渐变遮罩
                    maskImage: hasCheckedHeight && !isExpanded && needsCollapse 
                      ? 'linear-gradient(to bottom, black 70%, transparent 100%)' 
                      : 'none',
                    WebkitMaskImage: hasCheckedHeight && !isExpanded && needsCollapse
                      ? 'linear-gradient(to bottom, black 70%, transparent 100%)'
                      : 'none',
                  }}
                >
                  <MarkdownRender content={localReply.content} />
                </div>
                
                {/* 展开/收起按钮 */}
                {needsCollapse && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2 h-8 text-xs text-muted-foreground hover:bg-transparent hover:text-primary gap-1.5"
                    onClick={() => setIsExpanded(!isExpanded)}
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="h-3.5 w-3.5" />
                        收起
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3.5 w-3.5" />
                        展开全部
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}

            {/* 底部操作栏 */}
            <div className='flex items-center justify-end gap-2 mt-4 pt-3 border-t border-dashed border-border/60'>
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
                className='h-8 px-3 text-muted-foreground/70 hover:text-foreground hover:bg-muted/50 gap-1.5'
                title={canInteract ? '回复' : '此回复暂时无法回复'}
              >
                <Reply className='h-4 w-4' />
                <span className="text-xs">回复</span>
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
                className={`h-8 min-w-[3rem] px-3 gap-1.5 ${
                  localReply.isLiked
                    ? 'text-destructive hover:text-destructive/80 bg-destructive/5'
                    : 'text-muted-foreground/70 hover:text-destructive hover:bg-destructive/5'
                }`}
              >
                {likingPostIds.has(localReply.id) ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <>
                    <ThumbsUp
                      className={`h-4 w-4 ${
                        localReply.isLiked ? 'fill-current' : ''
                      }`}
                    />
                    <span className='text-xs'>
                      {localReply.likeCount > 0 ? localReply.likeCount : '点赞'}
                    </span>
                  </>
                )}
              </Button>

              {/* 打赏按钮 */}
              {(isRewardEnabled && !isOwnReply && canInteract) && (
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
                  className={`h-8 min-w-[3rem] px-3 gap-1.5 transition-colors ${
                    localRewardStats.totalAmount > 0
                      ? 'text-amber-600 bg-amber-50 hover:bg-amber-100 dark:text-amber-400 dark:bg-amber-900/20 dark:hover:bg-amber-900/40 border-amber-200/50 dark:border-amber-900/50'
                      : 'text-muted-foreground/70 hover:text-yellow-600 hover:bg-yellow-500/10'
                  }`}
                  title='打赏'
                >
                  <Coins className='h-4 w-4' />
                  <span className='text-xs'>
                    {localRewardStats.totalAmount > 0 ? localRewardStats.totalAmount : '打赏'}
                  </span>
                </Button>
              )}
              
              {/* 作者查看打赏记录按钮 */}
              {(isRewardEnabled && isOwnReply && localRewardStats.totalCount > 0) && (
                 <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => setRewardListOpen(true)}
                  className='h-8 px-3 text-muted-foreground/70 hover:text-foreground hover:bg-muted/50 gap-1.5'
                  title='查看打赏记录'
                 >
                   <Coins className='h-4 w-4' />
                   <span className='text-xs'>
                     {localRewardStats.totalAmount}
                   </span>
                 </Button>
              )}

              {/* 更多操作 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant='ghost'
                    size='sm'
                    className='h-8 w-8 p-0 text-muted-foreground/70 hover:text-foreground hover:bg-muted/50 rounded-md'
                  >
                    <MoreHorizontal className='h-4 w-4' />
                    <span className="sr-only">更多操作</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end' className="w-48">
                  {/* 编辑选项 */}
                  {canEdit && (
                    <DropdownMenuItem
                      onClick={handleStartEdit}
                      disabled={isEditing}
                      className="cursor-pointer"
                    >
                      <Pencil className='h-4 w-4' />
                      编辑回复
                    </DropdownMenuItem>
                  )}
                  {/* 删除选项 */}
                  {canDelete && (
                    <DropdownMenuItem
                      onClick={(e) =>
                        handleDeletePost(
                          e,
                          localReply.id,
                          localReply.postNumber
                        )
                      }
                      disabled={deletingPostId === localReply.id}
                      className='text-destructive focus:text-destructive cursor-pointer'
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
                  )}
                  {(canEdit || canDelete) && <DropdownMenuSeparator />}
                  <DropdownMenuItem
                    onClick={() => openReportDialog('post', localReply.id, `回复 #${localReply.postNumber}`)}
                    disabled={!isAuthenticated}
                    className="cursor-pointer"
                  >
                    <Flag className='h-4 w-4' />
                    举报回复
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* 楼中楼回复输入框 */}
        {replyingToPostId === localReply.id && (
          <div className='px-4 sm:px-6 pb-5 pt-0 opacity-100 transition-all'>
            <div className='bg-muted/30 rounded-lg p-3 sm:p-4 border border-border/50'>
              <div className='flex items-center justify-between text-xs text-muted-foreground mb-2'>
                <span className="flex items-center gap-1">
                  <Reply className="h-3 w-3" />
                  回复 <span className="font-medium text-foreground">@{localReply.userName || localReply.userUsername}</span>
                </span>
              </div>
              <MarkdownEditor
                editorClassName='min-h-[120px]'
                placeholder='写下你的回复...'
                value={replyToContent}
                onChange={setReplyToContent}
                disabled={submitting}
                minimal={true}
                autoFocus
                onKeyDown={handleKeyDown}
                uploadType="topics"
              />
              <div className='flex items-center justify-end gap-2 mt-3'>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => {
                    setReplyingToPostId(null);
                    setReplyToContent('');
                  }}
                  disabled={submitting}
                  className="h-8"
                >
                  取消
                </Button>
                <Button
                  size='sm'
                  onClick={() => handleSubmitReplyToPost(localReply.id)}
                  disabled={submitting || !replyToContent.trim()}
                  className="h-8"
                >
                  {submitting ? (
                    <>
                      <Loader2 className='h-3.5 w-3.5 mr-1.5 animate-spin' />
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
        onSuccess={handleRewardSuccess}
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