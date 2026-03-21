'use client';

import { Button } from '@/components/ui/button';
import { Reply, Loader2, ThumbsUp, Coins, MoreHorizontal, Pencil, Trash2, Flag } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

export default function ReplyActions({ reply, hooks, isRewardEnabled }) {
  const {
    isAuthenticated,
    canInteract,
    openLoginDialog,
    setReplyingToPostId,
    setReplyToContent,
    handleTogglePostLike,
    likingPostIds,
    isOwnReply,
    setRewardDialogOpen,
    localRewardStats,
    setRewardListOpen,
    canEdit,
    handleStartEdit,
    isEditing,
    canDelete,
    handleDeletePost,
    deletingPostId,
    openReportDialog,
  } = hooks;

  return (
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
          setReplyingToPostId(reply.id);
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
          handleTogglePostLike(reply.id, reply.isLiked);
        }}
        disabled={!canInteract || likingPostIds.has(reply.id) || !isAuthenticated}
        className={`h-8 min-w-12 px-3 gap-1.5 ${
          reply.isLiked
            ? 'text-destructive hover:text-destructive/80 bg-destructive/5'
            : 'text-muted-foreground/70 hover:text-destructive hover:bg-destructive/5'
        }`}
      >
        {likingPostIds.has(reply.id) ? (
          <Loader2 className='h-4 w-4 animate-spin' />
        ) : (
          <>
            <ThumbsUp
              className={`h-4 w-4 ${reply.isLiked ? 'fill-current' : ''}`}
            />
            <span className='text-xs'>
              {reply.likeCount > 0 ? reply.likeCount : '点赞'}
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
          className={`h-8 min-w-12 px-3 gap-1.5 transition-colors ${
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
              onClick={(e) => handleDeletePost(e, reply.id, reply.postNumber)}
              disabled={deletingPostId === reply.id}
              className='text-destructive focus:text-destructive cursor-pointer'
            >
              {deletingPostId === reply.id ? (
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
            onClick={() => openReportDialog('post', reply.id, `回复 #${reply.postNumber}`)}
            disabled={!isAuthenticated}
            className="cursor-pointer"
          >
            <Flag className='h-4 w-4' />
            举报回复
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
