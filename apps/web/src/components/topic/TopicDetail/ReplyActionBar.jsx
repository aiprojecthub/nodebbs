'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Reply,
  Loader2,
  ThumbsUp,
  Coins,
  MoreHorizontal,
  Pencil,
  Trash2,
  Flag,
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * 回复操作栏：回复/点赞/打赏/更多菜单
 * 原子组件
 *
 * @param {Object} props
 * @param {Object} props.reply - 回复数据
 * @param {boolean} props.isAuthenticated - 是否已登录
 * @param {Function} props.openLoginDialog - 打开登录弹窗
 * @param {boolean} props.isRewardEnabled - 是否开启打赏
 * @param {boolean} props.isOwnReply - 是否自己的回复
 * @param {boolean} props.canEdit - 是否可编辑
 * @param {boolean} props.canDelete - 是否可删除
 * @param {boolean} props.canInteract - 是否可交互
 * @param {boolean} props.isEditing - 是否正在编辑
 * @param {Object} props.rewardStats - 打赏统计
 * @param {Set} props.likingPostIds - 正在点赞的帖子ID集合
 * @param {number|null} props.deletingPostId - 正在删除的帖子ID
 * @param {Function} props.onReply - 回复按钮点击
 * @param {Function} props.onToggleLike - 点赞切换
 * @param {Function} props.onDelete - 删除按钮点击
 * @param {Function} props.onStartEdit - 开始编辑
 * @param {Function} props.onOpenReward - 打开打赏弹窗
 * @param {Function} props.onOpenRewardList - 打开打赏记录
 * @param {Function} props.onReport - 举报按钮点击
 */
export default function ReplyActionBar({
  reply,
  isAuthenticated,
  openLoginDialog,
  isRewardEnabled,
  isOwnReply,
  canEdit,
  canDelete,
  canInteract,
  isEditing,
  rewardStats,
  likingPostIds,
  deletingPostId,
  onReply,
  onToggleLike,
  onDelete,
  onStartEdit,
  onOpenReward,
  onOpenRewardList,
  onReport,
}) {
  return (
    <div className='flex items-center justify-end gap-2 mt-4 pt-3 border-t border-dashed border-border/60'>
      {/* 回复 */}
      <Button
        variant='ghost'
        size='sm'
        onClick={() => {
          if (!isAuthenticated) { openLoginDialog(); return; }
          if (!canInteract) { toast.error('此回复暂时无法回复'); return; }
          onReply();
        }}
        disabled={!canInteract}
        className='h-8 px-3 text-muted-foreground/70 hover:text-foreground hover:bg-muted/50 gap-1.5'
        title={canInteract ? '回复' : '此回复暂时无法回复'}
      >
        <Reply className='h-4 w-4' /><span className="text-xs">回复</span>
      </Button>

      {/* 点赞 */}
      <Button
        variant='ghost'
        size='sm'
        onClick={() => {
          if (!canInteract) { toast.error('此回复暂时无法点赞'); return; }
          onToggleLike(reply.id, reply.isLiked);
        }}
        disabled={!canInteract || likingPostIds.has(reply.id) || !isAuthenticated}
        className={`h-8 min-w-12 px-3 gap-1.5 ${reply.isLiked ? 'text-destructive hover:text-destructive/80 bg-destructive/5' : 'text-muted-foreground/70 hover:text-destructive hover:bg-destructive/5'}`}
      >
        {likingPostIds.has(reply.id) ? <Loader2 className='h-4 w-4 animate-spin' /> : (
          <>
            <ThumbsUp className={`h-4 w-4 ${reply.isLiked ? 'fill-current' : ''}`} />
            <span className='text-xs'>{reply.likeCount > 0 ? reply.likeCount : '点赞'}</span>
          </>
        )}
      </Button>

      {/* 打赏 */}
      {(isRewardEnabled && !isOwnReply && canInteract) && (
        <Button
          variant='ghost'
          size='sm'
          onClick={() => {
            if (!isAuthenticated) { openLoginDialog(); return; }
            onOpenReward();
          }}
          className={`h-8 min-w-12 px-3 gap-1.5 transition-colors ${rewardStats.totalAmount > 0 ? 'text-amber-600 bg-amber-50 hover:bg-amber-100 dark:text-amber-400 dark:bg-amber-900/20 dark:hover:bg-amber-900/40 border-amber-200/50 dark:border-amber-900/50' : 'text-muted-foreground/70 hover:text-yellow-600 hover:bg-yellow-500/10'}`}
          title='打赏'
        >
          <Coins className='h-4 w-4' /><span className='text-xs'>{rewardStats.totalAmount > 0 ? rewardStats.totalAmount : '打赏'}</span>
        </Button>
      )}

      {/* 查看打赏记录（自己的回复） */}
      {(isRewardEnabled && isOwnReply && rewardStats.totalCount > 0) && (
        <Button
          variant='ghost'
          size='sm'
          onClick={onOpenRewardList}
          className='h-8 px-3 text-muted-foreground/70 hover:text-foreground hover:bg-muted/50 gap-1.5'
          title='查看打赏记录'
        >
          <Coins className='h-4 w-4' /><span className='text-xs'>{rewardStats.totalAmount}</span>
        </Button>
      )}

      {/* 更多操作 */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' size='sm' className='h-8 w-8 p-0 text-muted-foreground/70 hover:text-foreground hover:bg-muted/50 rounded-md'>
            <MoreHorizontal className='h-4 w-4' /><span className="sr-only">更多操作</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className="w-48">
          {canEdit && (
            <DropdownMenuItem onClick={onStartEdit} disabled={isEditing} className="cursor-pointer">
              <Pencil className='h-4 w-4' /> 编辑回复
            </DropdownMenuItem>
          )}
          {canDelete && (
            <DropdownMenuItem
              onClick={onDelete}
              disabled={deletingPostId === reply.id}
              className='text-destructive focus:text-destructive cursor-pointer'
            >
              {deletingPostId === reply.id ? (
                <><Loader2 className='h-4 w-4 animate-spin' /> 删除中...</>
              ) : (
                <><Trash2 className='h-4 w-4' /> 删除回复</>
              )}
            </DropdownMenuItem>
          )}
          {(canEdit || canDelete) && <DropdownMenuSeparator />}
          <DropdownMenuItem onClick={onReport} disabled={!isAuthenticated} className="cursor-pointer">
            <Flag className='h-4 w-4' /> 举报回复
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
