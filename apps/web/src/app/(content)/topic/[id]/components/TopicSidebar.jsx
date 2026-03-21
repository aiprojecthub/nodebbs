'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
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
import Link from '@/components/common/Link';
import ReportDialog from '@/components/common/ReportDialog';
import TopicForm from '@/components/topic/TopicForm';
import Time from '@/components/common/Time';
import UserCard from '@/components/user/UserCard';
import { useTopicContext } from '@/contexts/TopicContext';
import { useAuth } from '@/contexts/AuthContext';
import { topicApi } from '@/lib/api';
import { toast } from 'sonner';
import { confirm } from '@/components/common/ConfirmPopover';

/**
 * 话题侧边栏组件
 * 显示操作按钮、作者信息、分类和统计数据
 */
export default function TopicSidebar() {
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

  // 本地状态：编辑弹窗、举报弹窗
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  // 权限（来自后端）
  const canPin = topic.canPin || false;
  const canClose = topic.canClose || false;
  const canEdit = topic.canEdit || false;
  const canDelete = topic.canDelete || false;
  const isTopicOwner = user && topic.userId === user.id;

  // 作者信息
  const author = {
    avatar: topic.userAvatar,
    username: topic.username,
    name: topic.userName,
    avatarFrame: topic.userAvatarFrame,
    displayRole: topic.userDisplayRole,
  };

  // 分类信息
  const category = {
    name: topic.categoryName,
    color: topic.categoryColor,
  };

  // 勋章：作者本人看自己的实时勋章，其他人看话题返回的勋章
  const displayBadges = (isTopicOwner && user?.badges) ? user.badges : (topic.userBadges || []);

  /**
   * 处理编辑话题
   */
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

      // 更新 Context 中的 topic 数据
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
    <div className='space-y-4'>
      {/* 操作按钮 - GitHub 风格（一行3个按钮）*/}
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
            {/* 编辑话题 */}
            {canEdit && (
              <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                <Edit className='h-4 w-4' />
                编辑话题
              </DropdownMenuItem>
            )}

            {/* 置顶/取消置顶 */}
            {canPin && (
              <DropdownMenuItem onClick={togglePinTopic}>
                <Pin className={`h-4 w-4 ${topic.isPinned ? 'fill-current' : ''}`} />
                {topic.isPinned ? '取消置顶' : '置顶话题'}
              </DropdownMenuItem>
            )}

            {/* 关闭/开启话题 */}
            {canClose && (
              <DropdownMenuItem onClick={toggleTopicStatus}>
                <Lock className='h-4 w-4' />
                {topic.isClosed ? '重新开启' : '关闭话题'}
              </DropdownMenuItem>
            )}

            {/* 删除话题 */}
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

      {/* 作者卡片 */}
      <UserCard
        user={author}
        badges={displayBadges}
        variant="banner"
      />

      {/* 分类信息 */}
      <div className='border border-border rounded-lg bg-card'>
        <div className='px-3 py-2 border-b border-border'>
          <h3 className='text-sm font-semibold'>分类</h3>
        </div>
        <div className='p-3'>
           <Link href={`/categories/${topic.categorySlug}`} className="block">
              <Badge
                style={{
                  backgroundColor: category?.color + '20',
                  color: category?.color,
                  borderColor: category?.color + '40'
                }}
                variant='outline'
                className="w-full justify-center text-sm py-1.5 hover:opacity-80 transition-opacity"
              >
                {category?.name}
              </Badge>
           </Link>
        </div>
      </div>

      {/* 标签信息 */}
      {topic.tags && topic.tags.length > 0 && (
        <div className='border border-border rounded-lg bg-card'>
          <div className='px-3 py-2 border-b border-border'>
            <h3 className='text-sm font-semibold'>标签</h3>
          </div>
          <div className='p-3 flex flex-wrap gap-2'>
            {topic.tags.map((tag) => (
              <Link key={tag.id} href={`/tags/${tag.slug}`}>
                <Badge variant="secondary" className="hover:bg-secondary/80 transition-colors cursor-pointer">
                  {tag.name}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 统计信息 */}
      <div className='border border-border rounded-lg bg-card p-3'>
        <div className='space-y-2 text-sm'>
          <div className='flex items-center justify-between'>
            <span className='text-muted-foreground'>浏览数</span>
            <span className='font-semibold'>{topic.viewCount}</span>
          </div>
          {topic.editedAt && (
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground'>最后编辑</span>
              <span className='text-xs'>
                <Time date={topic.editedAt} fromNow />
              </span>
            </div>
          )}
          {topic.editCount > 0 && (
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground'>编辑次数</span>
              <span className='font-semibold'>{topic.editCount}</span>
            </div>
          )}
        </div>
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
    </div>
  );
}
