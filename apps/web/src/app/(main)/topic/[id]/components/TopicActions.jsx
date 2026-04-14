'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { FormDialog } from '@/components/common/FormDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Lock,
  Flag,
  Edit,
  MoreHorizontal,
  Bell,
  Bookmark,
  Loader2,
  Pin,
  Trash2,
} from 'lucide-react';
import ReportDialog from '@/components/common/ReportDialog';
import TopicForm from '@/components/topic/TopicForm';
import { useTopicContext } from '@/contexts/TopicContext';
import { useAuth } from '@/contexts/AuthContext';
import { topicApi } from '@/lib/api';
import { toast } from 'sonner';
import { confirm } from '@/components/common/ConfirmPopover';

/**
 * 话题操作按钮组件
 * 包含订阅/收藏按钮 + 更多操作菜单（编辑/置顶/关闭/删除/举报）
 */
export default function TopicActions() {
  const router = useRouter();
  const {
    topic,
    updateTopic,
    toggleBookmark,
    toggleSubscribe,
    toggleTopicStatus,
    togglePinTopic,
    deleteTopic,
    actionLoading,
  } = useTopicContext();

  const { user, isAuthenticated, openLoginDialog } = useAuth();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  const canPin = topic.canPin || false;
  const canClose = topic.canClose || false;
  const canEdit = topic.canEdit || false;
  const canDelete = topic.canDelete || false;

  const handleEditTopic = async (formData) => {
    if (!isAuthenticated) return openLoginDialog();

    setEditLoading(true);

    try {
      const response = await topicApi.update(topic.id, formData);

      if (topic.approvalStatus === 'rejected' && response?.approvalStatus === 'pending') {
        toast.success('话题已重新提交审核，等待审核后将公开显示');
      } else {
        toast.success('话题更新成功');
      }

      setIsEditDialogOpen(false);

      const tagsArray = Array.isArray(formData.tags)
        ? formData.tags.map((tagName, index) => ({
            id: `temp-${index}`,
            name: tagName,
          }))
        : [];

      updateTopic({
        title: formData.title,
        content: formData.content,
        categoryId: formData.categoryId,
        tags: tagsArray,
        updatedAt: response?.updatedAt || new Date().toISOString(),
        editCount: (topic.editCount || 0) + 1,
      });

      router.refresh();
    } catch (err) {
      console.error('更新话题失败:', err);
      toast.error(err.message || '更新失败');
      throw err;
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <>
      <div className='flex gap-2'>
        <Button
          variant='outline'
          size='sm'
          className={`flex-1 ${
            topic.isSubscribed ? 'bg-primary/10 border-primary text-primary' : ''
          }`}
          onClick={toggleSubscribe}
          disabled={actionLoading.subscribe || !isAuthenticated}
          title={topic.isSubscribed ? '取消订阅通知' : '订阅通知'}
        >
          {actionLoading.subscribe ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : (
            <Bell className={`h-4 w-4 ${topic.isSubscribed ? 'fill-current' : ''}`} />
          )}
          <span className='text-xs'>{topic.isSubscribed ? '取消订阅' : '订阅'}</span>
        </Button>

        <Button
          variant='outline'
          size='sm'
          className={`flex-1 ${topic.isBookmarked ? 'text-yellow-600' : ''}`}
          onClick={toggleBookmark}
          disabled={actionLoading.bookmark || !isAuthenticated}
          title={topic.isBookmarked ? '取消收藏' : '收藏话题'}
        >
          {actionLoading.bookmark ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : (
            <Bookmark
              className={`h-4 w-4 ${topic.isBookmarked ? 'fill-current' : ''}`}
            />
          )}
          <span className='text-xs'>{topic.isBookmarked ? '取消收藏' : '收藏'}</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant='outline'
              size='sm'
              className='flex-1'
              disabled={!isAuthenticated}
            >
              <MoreHorizontal className='h-4 w-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-48'>
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
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className='text-destructive focus:text-destructive'
                  onClick={async (e) => {
                    const confirmed = await confirm(e, {
                      title: '确认删除话题',
                      description: '删除后话题将不再显示，此操作可以恢复。',
                      confirmText: '删除',
                      variant: 'destructive',
                    });
                    if (confirmed) {
                      deleteTopic();
                    }
                  }}
                >
                  <Trash2 className='h-4 w-4' />
                  删除话题
                </DropdownMenuItem>
              </>
            )}
            {(canEdit || canPin || canClose || canDelete) && <DropdownMenuSeparator />}
            <DropdownMenuItem onClick={() => setReportDialogOpen(true)}>
              <Flag className='h-4 w-4' />
              举报话题
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 编辑话题对话框 */}
      <FormDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          title="编辑话题"
          description="修改话题的标题、内容和分类"
          maxWidth="sm:max-w-[95vw] lg:max-w-7xl"
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
