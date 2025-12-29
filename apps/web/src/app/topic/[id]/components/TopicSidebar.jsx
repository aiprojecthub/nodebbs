'use client';

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
} from 'lucide-react';
import Link from 'next/link';
import ReportDialog from '@/components/common/ReportDialog';
import TopicForm from '@/components/topic/TopicForm';
import Time from '@/components/common/Time';
import UserCard from '@/components/user/UserCard';
import { useTopicSidebar } from '@/hooks/topic/useTopicSidebar';

/**
 * 话题侧边栏组件
 * 显示操作按钮、作者信息、分类和统计数据
 */
export default function TopicSidebar() {
  // 从 Hook 获取所有数据和回调
  const {
    topic,
    user,
    isAuthenticated,
    isBookmarked,
    bookmarkLoading,
    handleToggleBookmark: onToggleBookmark,
    isSubscribed,
    subscribeLoading,
    handleToggleSubscribe: onToggleSubscribe,
    handleToggleTopicStatus: onToggleTopicStatus,
    isEditDialogOpen,
    setIsEditDialogOpen,
    editLoading,
    handleEditTopic: onEditTopic,
    reportDialogOpen,
    setReportDialogOpen,
    canCloseOrPinTopic,
    isTopicOwner,
  } = useTopicSidebar();
  const author = {
    avatar: topic.userAvatar,
    username: topic.username,
    name: topic.userName,
    avatarFrame: topic.userAvatarFrame,
  };
  
  const category = {
    name: topic.categoryName,
    color: topic.categoryColor,
  };

  // 提交编辑
  const handleSubmitEdit = async (formData) => {
    try {
      await onEditTopic({
        title: formData.title,
        content: formData.content,
        categoryId: formData.categoryId,
        tags: formData.tags,
      });
    } catch (err) {
      // 错误已在父组件处理
      throw err;
    }
  };

  // 获取要显示的勋章
  const displayBadges = (isTopicOwner && user?.badges) ? user.badges : (topic.userBadges || []);

  return (
    <div className='space-y-4'>
      {/* 操作按钮 - GitHub 风格（一行3个按钮）*/}
      <div className='flex gap-2'>
        <Button
          variant='outline'
          size='sm'
          className={`flex-1 ${
            isSubscribed ? 'bg-primary/10 border-primary text-primary' : ''
          }`}
          onClick={onToggleSubscribe}
          disabled={subscribeLoading || !isAuthenticated}
          title={isSubscribed ? '取消订阅通知' : '订阅通知'}
        >
          {subscribeLoading ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : (
            <Bell className={`h-4 w-4 ${isSubscribed ? 'fill-current' : ''}`} />
          )}
          <span className='text-xs'>{isSubscribed ? '取消订阅' : '订阅'}</span>
        </Button>

        <Button
          variant='outline'
          size='sm'
          className={`flex-1 ${isBookmarked ? 'text-yellow-600' : ''}`}
          onClick={onToggleBookmark}
          disabled={bookmarkLoading || !isAuthenticated}
          title={isBookmarked ? '取消收藏' : '收藏话题'}
        >
          {bookmarkLoading ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : (
            <Bookmark
              className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`}
            />
          )}
          <span className='text-xs'>{isBookmarked ? '取消收藏' : '收藏'}</span>
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
            {/* 编辑话题 - 只有话题作者或管理员可见 */}
            {(isTopicOwner || canCloseOrPinTopic) && (
              <>
                <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                  <Edit className='h-4 w-4' />
                  编辑话题
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}

            {/* 关闭/开启话题 - 只有版主和管理员可见 */}
            {canCloseOrPinTopic && (
              <>
                <DropdownMenuItem onClick={onToggleTopicStatus}>
                  <Lock className='h-4 w-4' />
                  {topic.isClosed ? '重新开启' : '关闭话题'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}

            <DropdownMenuItem onClick={() => setReportDialogOpen(true)}>
              <Flag className='h-4 w-4' />
              举报话题
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 优化后的作者卡片 - 使用通用组件 */}
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
           <Link href={`/categories/${topic.categorySlug}`} className="block" prefetch={false}>
              <Badge
                style={{
                  backgroundColor: category?.color + '20', // 10% opacity
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
              <Link key={tag.id} href={`/tags/${tag.slug}`} prefetch={false}>
                <Badge variant="secondary" className="hover:bg-secondary/80 transition-colors cursor-pointer">
                  {tag.name}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 统计信息 - GitHub 风格 (恢复原样) */}
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
          maxWidth="sm:max-w-[95vw] lg:max-w-[1200px] max-h-[90vh] overflow-y-auto"
          footer={null}
      >
          <TopicForm
            initialData={{
              title: topic.title,
              content: topic.content,
              categoryId: topic.categoryId,
              tags: topic.tags?.map((tag) => tag.name) || [],
            }}
            onSubmit={handleSubmitEdit}
            onCancel={() => setIsEditDialogOpen(false)}
            isSubmitting={editLoading}
            submitButtonText='保存修改'
            isEditMode={true}
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
