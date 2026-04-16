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
 * Medium 模板 — 话题操作栏
 * 订阅 | 收藏 | 更多菜单，内联排列
 */
export default function TopicActionMenu() {
  const {
    topic,
    isAuthenticated,
    openLoginDialog,
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

  return (
    <>
      <div className='flex items-center gap-1'>
        {/* 订阅 */}
        <button
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors ${
            topic.isSubscribed
              ? 'text-primary bg-primary/5'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
          onClick={isAuthenticated ? toggleSubscribe : openLoginDialog}
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
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors ${
            topic.isBookmarked
              ? 'text-foreground bg-muted/50'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
          onClick={isAuthenticated ? toggleBookmark : openLoginDialog}
          disabled={actionLoading.bookmark}
        >
          {actionLoading.bookmark ? (
            <Loader2 className='h-3.5 w-3.5 animate-spin' />
          ) : (
            <Bookmark className={`h-3.5 w-3.5 ${topic.isBookmarked ? 'fill-current' : ''}`} />
          )}
          {topic.isBookmarked ? '已收藏' : '收藏'}
        </button>

        {/* 更多 */}
        {isAuthenticated && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className='inline-flex items-center justify-center w-8 h-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors'>
                <MoreHorizontal className='h-4 w-4' />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-44'>
              {canEdit && (
                <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                  <Edit className='h-4 w-4' /> 编辑
                </DropdownMenuItem>
              )}
              {canPin && (
                <DropdownMenuItem onClick={togglePinTopic}>
                  <Pin className={`h-4 w-4 ${topic.isPinned ? 'fill-current' : ''}`} />
                  {topic.isPinned ? '取消置顶' : '置顶'}
                </DropdownMenuItem>
              )}
              {canClose && (
                <DropdownMenuItem onClick={toggleTopicStatus}>
                  <Lock className='h-4 w-4' />
                  {topic.isClosed ? '重新开启' : '关闭'}
                </DropdownMenuItem>
              )}
              {canDelete && (
                <>
                  {hasManageActions && <DropdownMenuSeparator />}
                  <DropdownMenuItem
                    className='text-destructive focus:text-destructive'
                    onClick={async (e) => {
                      const confirmed = await confirm(e, {
                        title: '确认删除',
                        description: '删除后将不再显示，此操作可以恢复。',
                        confirmText: '删除',
                        variant: 'destructive',
                      });
                      if (confirmed) deleteTopic();
                    }}
                  >
                    <Trash2 className='h-4 w-4' /> 删除
                  </DropdownMenuItem>
                </>
              )}
              {hasManageActions && <DropdownMenuSeparator />}
              <DropdownMenuItem onClick={() => setReportDialogOpen(true)}>
                <Flag className='h-4 w-4' /> 举报
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* 编辑对话框 */}
      <FormDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        title='编辑文章'
        description='修改标题、内容和分类'
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
