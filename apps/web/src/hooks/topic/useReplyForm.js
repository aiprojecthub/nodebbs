import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { postApi } from '@/lib/api';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useTopicContext } from '@/contexts/TopicContext';

/**
 * 回复表单逻辑 Hook (useReplyForm)
 * 管理主楼回复框的状态、提交逻辑以及从 Context 获取的开关贴权限
 *
 * @param {Object} props - Hook 参数
 * @param {Function} props.onReplyAdded - 回复添加成功的回调
 * @returns {Object} 包含表单状态和操作方法的对象
 */
export function useReplyForm({
  onReplyAdded,
}) {
  const router = useRouter();
  const { topic, toggleTopicStatus } = useTopicContext();
  const { user, isAuthenticated, openLoginDialog, loading } = useAuth();
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /**
   * 提交回复
   * 包含空校验、登录权限校验和 API 调用
   */
  const handleSubmitReply = async () => {
    if (!replyContent.trim()) {
      toast.error('请输入回复内容');
      return;
    }

    if (!isAuthenticated) {
      openLoginDialog();
      return;
    }

    setSubmitting(true);

    try {
      const response = await postApi.create({
        topicId: topic.id,
        content: replyContent,
      });

      if (response.requiresApproval) {
        toast.success(
          response.message || '您的回复已提交，等待审核后将公开显示'
        );
      } else {
        toast.success(response.message || '回复成功！');

        // 如果返回了新帖子数据，立即添加到列表
        if (response.post && onReplyAdded) {
          const newPost = {
            id: response.post.id,
            content: replyContent,
            userId: user.id,
            userName: user.name,
            username: user.username,
            userUsername: user.username,
            userAvatar: user.avatar,
            topicId: topic.id,
            postNumber: response.post.postNumber || 0,
            likeCount: 0,
            isLiked: false,
            replyToPostId: null,
            replyToPost: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            editCount: 0,
            ...response.post,
          };
          onReplyAdded(newPost);
        } else {
          // 如果没有返回数据或没有回调，刷新页面
          router.refresh();
        }
      }

      setReplyContent('');
    } catch (err) {
      console.error('发布回复失败:', err);
      toast.error('发布回复失败：' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * 切换主题开启/关闭状态
   * 直接调用 Context 中的共享方法
   */
  const handleToggleTopicStatus = async () => {
    await toggleTopicStatus();
  };

  return {
    /** 当前登录用户 */
    user,
    /** 是否已登录 */
    isAuthenticated,
    /** 打开登录弹窗方法 */
    openLoginDialog,
    /** 加载状态 */
    loading,
    /** 回复框内容 */
    replyContent,
    /** 设置回复框内容方法 */
    setReplyContent,
    /** 是否正在提交 */
    submitting,
    /** 提交回复方法 */
    handleSubmitReply,
    /** 切换话题状态方法 */
    handleToggleTopicStatus,
    /** 当前话题是否已关闭 (来自 Context) */
    isClosed: topic.isClosed,
    /** 当前话题是否已删除 (来自 Context) */
    isDeleted: topic.isDeleted,
    /** 当前用户是否有权关闭话题 (来自后端) */
    canClose: topic.canClose || false,
  };
}
