'use client';

import { FormDialog } from '@/components/common/FormDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  Bell,
  Bookmark,
  Edit,
  Pin,
  Lock,
  Trash2,
  Flag,
  Loader2,
} from 'lucide-react';
import ReportDialog from '@/components/common/ReportDialog';
import TopicForm from '@/components/topic/TopicForm';
import { useTopicActions } from '@/hooks/topic/useTopicActions';
import { confirm } from '@/components/common/ConfirmPopover';

/**
 * Jatra 模板 — 话题内联操作栏
 * 「订阅  收藏  ...」 样式，放在标题 meta 区域下方
 * 业务逻辑来自共享的 useTopicActions hook
 */
export default function TopicActionMenu() {
  const {
    topic,
    isAuthenticated,
    actionLoading,
    isEditDialogOpen,
    setIsEditDialogOpen,
    editLoading,
    handleEditTopic,
    reportDialogOpen,
    setReportDialogOpen,
    canPin,
    canClose,
    canEdit,
    canDelete,
    toggleBookmark,
    toggleSubscribe,
    toggleTopicStatus,
    togglePinTopic,
    deleteTopic,
  } = useTopicActions();

  const hasManageActions = canEdit || canPin || canClose || canDelete;

  if (!isAuthenticated) return null;

  return (
    <>
      <div className='flex justify-center items-center gap-2.5 px-5 pb-4 pt-3'>
        {/* 订阅 */}
        <button
          className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border text-xs transition-colors ${
            topic.isSubscribed
              ? 'border-primary/30 bg-primary/5 text-primary'
              : 'border-border text-muted-foreground hover:bg-accent/50 hover:text-foreground'
          }`}
          onClick={toggleSubscribe}
          disabled={actionLoading.subscribe}
        >
          {actionLoading.subscribe ? (
            <Loader2 className='h-3.5 w-3.5 animate-spin' />
          ) : (
            <Bell className={`h-3.5 w-3.5 ${topic.isSubscribed ? 'fill-current' : ''}`} />
          )}
          {topic.isSubscribed ? '已订阅' : '订阅'}
        </button>

        {/* 收藏 */}
        <button
          className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border text-xs transition-colors ${
            topic.isBookmarked
              ? 'border-yellow-500/30 bg-yellow-500/5 text-yellow-600'
              : 'border-border text-muted-foreground hover:bg-accent/50 hover:text-foreground'
          }`}
          onClick={toggleBookmark}
          disabled={actionLoading.bookmark}
        >
          {actionLoading.bookmark ? (
            <Loader2 className='h-3.5 w-3.5 animate-spin' />
          ) : (
            <Bookmark className={`h-3.5 w-3.5 ${topic.isBookmarked ? 'fill-current' : ''}`} />
          )}
          {topic.isBookmarked ? '已收藏' : '收藏'}
        </button>

        {/* 更多操作 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className='inline-flex items-center justify-center w-8 h-8 rounded-full border border-border text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors'>
              <MoreHorizontal className='h-3.5 w-3.5' />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='start' className='w-44'>
            {canEdit && (
              <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                <Edit className='h-4 w-4' />
                编辑话题
              </DropdownMenuItem>
            )}
            {canPin && (
              <DropdownMenuItem onClick={togglePinTopic}>
                <Pin className={`h-4 w-4 ${topic.isPinned ? 'fill-current' : ''}`} />
                {topic.isPinned ? '取消置顶' : '置顶话题'}
              </DropdownMenuItem>
            )}
            {canClose && (
              <DropdownMenuItem onClick={toggleTopicStatus}>
                <Lock className='h-4 w-4' />
                {topic.isClosed ? '重新开启' : '关闭话题'}
              </DropdownMenuItem>
            )}
            {canDelete && (
              <>
                {hasManageActions && <DropdownMenuSeparator />}
                <DropdownMenuItem
                  className='text-destructive focus:text-destructive'
                  onClick={async (e) => {
                    const confirmed = await confirm(e, {
                      title: '确认删除话题',
                      description: '删除后话题将不再显示，此操作可以恢复。',
                      confirmText: '删除',
                      variant: 'destructive',
                    });
                    if (confirmed) deleteTopic();
                  }}
                >
                  <Trash2 className='h-4 w-4' />
                  删除话题
                </DropdownMenuItem>
              </>
            )}
            {(hasManageActions) && <DropdownMenuSeparator />}
            <DropdownMenuItem onClick={() => setReportDialogOpen(true)}>
              <Flag className='h-4 w-4' />
              举报话题
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 编辑对话框 */}
      <FormDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        title='编辑话题'
        description='修改话题的标题、内容和分类'
        maxWidth='sm:max-w-[95vw] lg:max-w-7xl'
        footer={null}
      >
        <TopicForm
          initialData={{
            title: topic.title,
            content: topic.content,
            categoryId: topic.categoryId,
            tags: topic.tags?.map((tag) => tag.name) || [],
          }}
          onSubmit={handleEditTopic}
          onCancel={() => setIsEditDialogOpen(false)}
          isSubmitting={editLoading}
          submitButtonText='保存修改'
          isEditMode={true}
          stickyTop='lg:top-4'
        />
      </FormDialog>

      {/* 举报对话框 */}
      <ReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        reportType='topic'
        targetId={topic.id}
        targetTitle={topic.title}
      />
    </>
  );
}
