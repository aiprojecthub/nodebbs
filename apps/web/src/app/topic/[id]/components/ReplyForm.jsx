'use client';

import { Button } from '@/components/ui/button';
import { Lock, Archive, Loader2 } from 'lucide-react';
import UserAvatar from '@/components/user/UserAvatar';
import { useReplyForm } from '@/hooks/topic/useReplyForm';
import { Loading } from '@/components/common/Loading';
import MarkdownEditor from '@/components/common/MarkdownEditor';

/**
 * 回复表单组件
 * 所有数据统一从 useReplyForm Hook 获取，确保单一数据入口
 */
export default function ReplyForm({
  onReplyAdded,
}) {
  const {
    user,
    isAuthenticated,
    openLoginDialog,
    loading,
    replyContent,
    setReplyContent,
    submitting,
    handleSubmitReply,
    handleToggleTopicStatus,
    isClosed,
    isDeleted,
    canClose,
  } = useReplyForm({
    onReplyAdded,
  });

  if (loading) {
    return <Loading className='py-12' />;
  }

  if (!isAuthenticated) {
    return (
      <div className='mt-4 sm:mt-6 bg-card border-x-0 border-y sm:border sm:border-border sm:rounded-lg p-6 text-center'>
        <p className='text-muted-foreground mb-4'>请先登录后再发表评论</p>
        <Button onClick={openLoginDialog}>登录</Button>
      </div>
    );
  }

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmitReply();
    }
  };

  return (
    <div className='mt-4 sm:mt-6'>
      {/* 话题已删除提示 */}
      {isDeleted && (
        <div className='mb-4 bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-center space-x-3'>
          <Archive className='h-5 w-5 text-destructive shrink-0' />
          <div>
            <p className='text-sm font-medium text-destructive'>
              此话题已被删除
            </p>
            <p className='text-xs text-muted-foreground mt-1'>
              已删除的话题不能发表新回复。
            </p>
          </div>
        </div>
      )}

      {/* 话题已关闭提示 */}
      {!isDeleted && isClosed && (
        <div className='mb-4 bg-muted border border-border rounded-lg p-4 flex items-center space-x-3'>
          <Lock className='h-5 w-5 text-muted-foreground shrink-0' />
          <div>
            <p className='text-sm font-medium text-card-foreground'>
              此话题已关闭
            </p>
            <p className='text-xs text-muted-foreground mt-1'>
              {canClose
                ? '您有权限重新开启此话题。'
                : '此话题不再接受新回复。'}
            </p>
          </div>
        </div>
      )}

      <div className='bg-card border-y sm:border sm:border-border sm:rounded-lg'>
        {/* 回复框头部 */}
        <div className='flex items-center space-x-3 px-3 py-2 sm:px-4 sm:py-3 bg-muted border-b border-border sm:rounded-t-lg'>
          <UserAvatar url={user?.avatar} name={user?.username} size='sm' />
          <span className='text-sm font-medium text-card-foreground'>
            写下你的评论
          </span>
        </div>

        {/* 回复输入区域 */}
        <div className='p-3 sm:p-4'>
          <MarkdownEditor
            editorClassName='min-h-[150px] text-base sm:text-sm'
            placeholder={isDeleted ? '已删除的话题不能回复' : '发表你的评论...'}
            value={replyContent}
            onChange={setReplyContent}
            disabled={submitting || isClosed || isDeleted}
            minimal={true}
            onKeyDown={handleKeyDown}
            uploadType="topics"
          />
        </div>

        {/* 回复框底部 */}
        <div className='px-3 py-2 sm:px-4 sm:py-3 bg-muted border-t border-border sm:rounded-b-lg'>
          <div className='flex items-center justify-between'>
            <div className='text-sm text-muted-foreground'>
            </div>
            <div className='flex items-center space-x-2'>
              {!isDeleted && canClose && (
                  <Button
                    variant='outline'
                    size='sm'
                    className='h-9 sm:h-8'
                    onClick={handleToggleTopicStatus}
                  >
                    {isClosed ? '重新开启' : '关闭话题'}
                  </Button>
                )}
              <Button
                size='sm'
                className='bg-chart-2 hover:bg-chart-2/90 text-primary-foreground h-9 sm:h-8 px-4 sm:px-3'
                onClick={handleSubmitReply}
                disabled={
                  submitting ||
                  !replyContent.trim() ||
                  isClosed ||
                  isDeleted
                }
              >
                {submitting ? (
                  <>
                    <Loader2 className='h-4 w-4 animate-spin' />
                    提交中...
                  </>
                ) : (
                  '发表评论'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
