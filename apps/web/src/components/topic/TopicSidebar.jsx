import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useState } from 'react';
import ReportDialog from '@/components/moderation/ReportDialog';
import TopicForm from '@/components/forum/TopicForm';
import UserAvatar from '../forum/UserAvatar';
import Time from '../forum/Time';

export default function TopicSidebar({
  topic,
  isBookmarked,
  bookmarkLoading,
  onToggleBookmark,
  isSubscribed,
  subscribeLoading,
  onToggleSubscribe,
  onToggleTopicStatus,
  isEditDialogOpen,
  setIsEditDialogOpen,
  onEditTopic,
  editLoading,
  isAuthenticated,
  user,
}) {
  const author = {
    avatar: topic.userAvatar,
    username: topic.username,
    name: topic.userName,
    avatarFrame: topic.userAvatarFrame,
  };
  // const category = getCategoryById(topic.categoryId);
  const category = {
    name: topic.categoryName,
    color: topic.categoryColor,
  };

  // 检查是否有关闭话题的权限
  const canCloseOrPinTopic = user && ['moderator', 'admin'].includes(user.role);
  const isTopicOwner = user && topic.userId === user.id;

  // 举报对话框状态
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

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

      {/* 参与者 - GitHub 风格 */}
      <div className='border border-border rounded-lg bg-card'>
        <div className='px-3 py-2 border-b border-border'>
          <h3 className='text-sm font-semibold'>作者</h3>
        </div>
        <div className='p-3'>
          <div className='flex items-center gap-2'>
            <UserAvatar
              url={author?.avatar}
              name={author?.username}
              size='lg'
              frameMetadata={author?.avatarFrame?.itemMetadata}
            />
            <Link
              href={`/users/${author?.username}`}
              prefetch={false}
              className='text-sm hover:text-primary hover:underline font-medium'
            >
              {author?.name}
            </Link>
          </div>
        </div>
      </div>

      {/* 标签 - GitHub 风格 */}
      <div className='border border-border rounded-lg bg-card'>
        <div className='px-3 py-2 border-b border-border'>
          <h3 className='text-sm font-semibold'>标签</h3>
        </div>
        <div className='p-3'>
          <div className='flex flex-wrap gap-2'>
            <Badge
              style={{
                color: category?.color,
              }}
              variant='secondary'
            >
              {category?.name}
            </Badge>
            {topic.tags.map((tag) => (
              <Badge key={tag.id} variant='outline' className='text-xs'>
                {tag.name}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* 统计信息 - GitHub 风格 */}
      <div className='border border-border rounded-lg bg-card p-3'>
        <div className='space-y-2 text-sm'>
          {/* <div className='flex items-center justify-between'>
            <span className='text-muted-foreground'>回复数</span>
            <span className='font-semibold'>{topic.postCount}</span>
          </div> */}
          <div className='flex items-center justify-between'>
            <span className='text-muted-foreground'>浏览数</span>
            <span className='font-semibold'>{topic.viewCount}</span>
          </div>
          <div className='flex items-center justify-between pt-2 border-t border-border'>
            <span className='text-muted-foreground'>创建时间</span>
            <span className='text-xs'>
              <Time date={topic.createdAt} />
            </span>
          </div>
          {topic.updatedAt !== topic.createdAt && (
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground'>更新时间</span>
              <span className='text-xs'>
                <Time date={topic.updatedAt} />
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 编辑话题对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className='sm:max-w-[95vw] lg:max-w-[1200px] max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>编辑话题</DialogTitle>
            <DialogDescription>修改话题的标题、内容和分类</DialogDescription>
          </DialogHeader>

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
        </DialogContent>
      </Dialog>

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
