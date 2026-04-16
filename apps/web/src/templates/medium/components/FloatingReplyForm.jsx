'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Lock, Loader2, X, MessageSquare } from 'lucide-react';
import UserAvatar from '@/components/user/UserAvatar';
import { useReplyForm } from '@/hooks/topic/useReplyForm';
import MarkdownEditor from '@/components/common/MarkdownEditor';
import { useSidebar, SIDEBAR_WIDTH } from './SidebarContext';

/**
 * Medium 模板 — 底部固定回复表单
 * fixed 定位，left 偏移量跟随侧栏状态
 * open === null (未交互): CSS 媒体查询控制 — lg:有偏移，<lg:无偏移
 * open === true/false: JS 精确控制
 */
export default function FloatingReplyForm({ onReplyAdded }) {
  const [expanded, setExpanded] = useState(false);
  const { open, isOpen } = useSidebar();

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
  } = useReplyForm({ onReplyAdded });

  if (loading) return null;

  // open === null: 未交互，用 CSS 类控制
  // open !== null: 用户已交互，用 JS style 控制
  const interacted = open !== null;
  const barClass = interacted ? '' : 'left-0 lg:left-[220px]';
  const barStyle = interacted ? { left: isOpen ? `${SIDEBAR_WIDTH}px` : 0 } : undefined;

  const baseClass = 'fixed bottom-0 right-0 z-30 border-t border-border bg-background/95 backdrop-blur';

  // 话题已关闭
  if (!isDeleted && isClosed) {
    return (
      <div className={`${baseClass} ${barClass}`} style={barStyle}>
        <div className='max-w-[1100px] mx-auto px-6 lg:px-10 py-3 flex items-center gap-3'>
          <Lock className='h-4 w-4 text-muted-foreground shrink-0' />
          <span className='text-sm text-muted-foreground flex-1'>此话题已关闭，不再接受新回复</span>
          {canClose && (
            <Button variant='outline' size='sm' onClick={handleToggleTopicStatus} className='shrink-0 rounded-full text-xs'>
              重新开启
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (isDeleted) return null;

  // 未登录
  if (!isAuthenticated) {
    return (
      <div className={`${baseClass} ${barClass}`} style={barStyle}>
        <div className='max-w-[1100px] mx-auto px-6 lg:px-10 py-3 flex items-center justify-between'>
          <span className='text-sm text-muted-foreground'>登录后参与讨论</span>
          <Button size='sm' onClick={openLoginDialog} className='rounded-full text-xs'>登录</Button>
        </div>
      </div>
    );
  }

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmitReply();
    }
    if (e.key === 'Escape') {
      setExpanded(false);
    }
  };

  return (
    <>
      {/* 展开后的遮罩 */}
      {expanded && (
        <div className='fixed inset-0 z-20 bg-black/20' onClick={() => setExpanded(false)} />
      )}

      {/* 底部固定栏 */}
      <div
        className={`${baseClass} ${barClass} transition-all duration-300 ${expanded ? 'shadow-[0_-4px_20px_rgba(0,0,0,0.08)]' : ''}`}
        style={barStyle}
      >
        <div className='max-w-[1100px] mx-auto px-6 lg:px-10'>
          {expanded ? (
            <div className='py-4'>
              <div className='flex items-center justify-between mb-3'>
                <div className='flex items-center gap-2'>
                  <UserAvatar url={user?.avatar} name={user?.name || user?.username} size='sm' />
                  <span className='text-sm font-medium'>{user?.name || user?.username}</span>
                </div>
                <button onClick={() => setExpanded(false)} className='p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors'>
                  <X className='h-4 w-4' />
                </button>
              </div>

              <MarkdownEditor
                editorClassName='min-h-[120px] text-sm'
                placeholder='写下你的想法...'
                value={replyContent}
                onChange={setReplyContent}
                disabled={submitting}
                minimal
                autoFocus
                onKeyDown={handleKeyDown}
                uploadType='topics'
              />

              <div className='flex items-center justify-between mt-3'>
                <div className='text-xs text-muted-foreground'>
                  Ctrl + Enter 发送
                </div>
                <div className='flex items-center gap-2'>
                  {canClose && (
                    <Button variant='outline' size='sm' className='rounded-full text-xs' onClick={handleToggleTopicStatus}>
                      关闭话题
                    </Button>
                  )}
                  <Button
                    size='sm'
                    className='rounded-full text-xs px-4'
                    onClick={handleSubmitReply}
                    disabled={submitting || !replyContent.trim()}
                  >
                    {submitting ? (
                      <><Loader2 className='h-3.5 w-3.5 animate-spin' /> 发送中...</>
                    ) : '发表评论'}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setExpanded(true)}
              className='w-full py-3.5 flex items-center gap-3 text-left'
            >
              <UserAvatar url={user?.avatar} name={user?.name || user?.username} size='xs' />
              <span className='flex-1 text-sm text-muted-foreground'>写下你的想法...</span>
              <MessageSquare className='h-4 w-4 text-muted-foreground/50' />
            </button>
          )}
        </div>
      </div>
    </>
  );
}
