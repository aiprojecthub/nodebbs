import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import { postApi } from '@/lib/api';
import { toast } from 'sonner';
import { confirm } from '@/components/common/ConfirmPopover';

/**
 * 单条回复项逻辑 Hook (useReplyItem)
 * 管理每一层楼的内部状态和交互行为
 * 包括点赞、删除、楼中楼回复、举报、打赏等
 *
 * 设计说明（为什么不使用 TopicContext）：
 * 1. 性能考量：每个 ReplyItem 都是列表项，如果订阅 Context，
 *    任何 Context 变化都会导致所有列表项重新渲染。
 * 2. 数据独立性：每个回复的点赞、打赏等状态互相独立，
 *    通过 props 传入初始值，在本地管理后续更新更高效。
 * 3. 组件复用：通过 props 接收数据，组件可以脱离 TopicContext 使用，
 *    例如在其他页面展示回复预览时。
 *
 * @param {Object} props - Hook 参数
 * @param {Object} props.reply - 回复对象数据
 * @param {number} props.topicId - 话题ID
 * @param {Function} props.onDeleted - 删除回调
 * @param {Function} props.onReplyAdded - 回复添加回调
 * @param {Object} props.rewardStats - 打赏统计
 * @param {Function} props.onRewardSuccess - 打赏成功回调
 * @returns {Object} 包含回复项的所有状态和交互方法
 */
export function useReplyItem({
  reply,
  topicId,
  onDeleted,
  onReplyAdded,
  rewardStats,
  onRewardSuccess
}) {
  const { user, isAuthenticated, openLoginDialog } = useAuth();
  const { canEditPost, canDeletePost } = usePermission();
  const [likingPostIds, setLikingPostIds] = useState(new Set());
  const [deletingPostId, setDeletingPostId] = useState(null);
  const [replyingToPostId, setReplyingToPostId] = useState(null);
  const [replyToContent, setReplyToContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [rewardDialogOpen, setRewardDialogOpen] = useState(false);
  const [rewardListOpen, setRewardListOpen] = useState(false);
  // 编辑状态
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [origin, setOrigin] = useState('');
  const [reportTarget, setReportTarget] = useState({
    type: '',
    id: 0,
    title: '',
  });

  // 本地状态
  const [localReply, setLocalReply] = useState(reply);
  const [localRewardStats, setLocalRewardStats] = useState(rewardStats || { totalCount: 0, totalAmount: 0 });

  // 同步 props 到本地状态
  useEffect(() => {
    setLocalRewardStats(rewardStats || { totalCount: 0, totalAmount: 0 });
  }, [rewardStats]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  // 检查审核状态
  const isPending = localReply.approvalStatus === 'pending';
  const isRejected = localReply.approvalStatus === 'rejected';
  const isOwnReply = user?.id === localReply.userId;
  const isAdmin = user?.isAdmin;
  const canInteract = !isPending && !isRejected;
  // 编辑权限：使用 RBAC 权限检查
  const canEdit = canEditPost(localReply);
  // 删除权限：使用 RBAC 权限检查
  const canDelete = canDeletePost(localReply);

  /**
   * 切换楼层点赞状态
   * @param {number} postId - 帖子ID
   * @param {boolean} isLiked - 当前是否已点赞
   */
  const handleTogglePostLike = async (postId, isLiked) => {
    if (!isAuthenticated) {
      openLoginDialog();
      return;
    }

    if (likingPostIds.has(postId)) {
      return;
    }

    setLikingPostIds((prev) => new Set(prev).add(postId));

    try {
      if (isLiked) {
        await postApi.unlike(postId);
      } else {
        await postApi.like(postId);
      }

      setLocalReply((prev) => ({
        ...prev,
        isLiked: !isLiked,
        likeCount: isLiked ? prev.likeCount - 1 : prev.likeCount + 1,
      }));

      toast.success(isLiked ? '已取消点赞' : '点赞成功');
    } catch (err) {
      console.error('点赞操作失败:', err);
      toast.error(err.message || '操作失败');
    } finally {
      setLikingPostIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
    }
  };

  /**
   * 删除回复
   * 包含二次确认和权限校验
   * @param {number} postId - 帖子ID
   * @param {number} postNumber - 楼层号 (1楼不可删除)
   */
  const handleDeletePost = async (e, postId, postNumber) => {
    if (!isAuthenticated) {
      openLoginDialog();
      return;
    }

    if (postNumber === 1) {
      toast.error('不能删除话题内容，请删除整个话题');
      return;
    }

    const confirmed = await confirm(e, {
      title: '确认删除',
      description: '确定要删除这条回复吗？此操作不可恢复。',
      confirmText: '确认删除',
      variant: 'destructive',
    });

    if (!confirmed) {
      return;
    }

    setDeletingPostId(postId);

    try {
      await postApi.delete(postId);
      toast.success('回复已删除');
      onDeleted?.(postId);
    } catch (err) {
      console.error('删除回复失败:', err);
      toast.error(err.message || '删除失败');
    } finally {
      setDeletingPostId(null);
    }
  };

  /**
   * 提交楼中楼回复
   * @param {number} replyToPostId - 被回复的目标帖子ID
   */
  const handleSubmitReplyToPost = async (replyToPostId) => {
    if (!replyToContent.trim()) {
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
        topicId: topicId,
        content: replyToContent,
        replyToPostId: replyToPostId,
      });

      if (response.requiresApproval) {
        toast.success(
          response.message || '您的回复已提交，等待审核后将公开显示'
        );
      } else {
        toast.success(response.message || '回复成功！');

        // 如果返回了新帖子数据且有回调，立即添加到列表
        if (response.post && onReplyAdded) {
          const newPost = {
            id: response.post.id,
            content: replyToContent,
            userId: user.id,
            userName: user.name,
            username: user.username,
            userUsername: user.username,
            userAvatar: user.avatar,
            topicId: topicId,
            replyToPostId: replyToPostId,
            replyToPost: {
              postNumber: localReply.postNumber,
              userName: localReply.userName,
              userUsername: localReply.userUsername,
            },
            postNumber: response.post.postNumber || 0,
            likeCount: 0,
            isLiked: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            editCount: 0,
            ...response.post,
          };
          onReplyAdded(newPost);
        }
      }

      setReplyToContent('');
      setReplyingToPostId(null);
    } catch (err) {
      console.error('发布回复失败:', err);
      toast.error('发布回复失败：' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * 处理打赏成功
   * @param {number} amount - 打赏金额
   */
  const handleRewardSuccess = (amount) => {
    setLocalRewardStats(prev => ({
      totalCount: (prev.totalCount || 0) + 1,
      totalAmount: (prev.totalAmount || 0) + amount
    }));
    onRewardSuccess?.(localReply.id, amount);
  };

  /**
   * 打开举报对话框
   * @param {string} type - 举报类型 (topic/post)
   * @param {number} id - 目标ID
   * @param {string} title - 目标标题或摘要
   */
  const openReportDialog = (type, id, title) => {
    setReportTarget({ type, id, title });
    setReportDialogOpen(true);
  };

  /**
   * 开始编辑回复
   * 将当前内容加载到编辑器中
   */
  const handleStartEdit = () => {
    if (!canEdit) return;
    setEditContent(localReply.rawContent || localReply.content);
    setIsEditing(true);
  };

  /**
   * 取消编辑
   * 清空编辑状态并退出编辑模式
   */
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent('');
  };

  /**
   * 提交编辑
   * 调用 API 更新回复内容
   */
  const handleSubmitEdit = async () => {
    if (!editContent.trim()) {
      toast.error('内容不能为空');
      return;
    }

    if (!canEdit) {
      toast.error('没有编辑权限');
      return;
    }

    setIsSubmittingEdit(true);

    try {
      const response = await postApi.update(localReply.id, editContent);

      // 更新本地状态
      setLocalReply((prev) => ({
        ...prev,
        content: editContent,
        rawContent: editContent,
        editedAt: new Date().toISOString(),
        editCount: (prev.editCount || 0) + 1,
        approvalStatus: response.post?.approvalStatus || prev.approvalStatus,
      }));

      setIsEditing(false);
      setEditContent('');

      // 根据返回信息提示用户
      if (response.requiresApproval) {
        toast.success(response.message || '回复已更新，等待审核后公开显示');
      } else {
        toast.success(response.message || '回复更新成功');
      }
    } catch (err) {
      console.error('编辑回复失败:', err);
      toast.error(err.message || '编辑失败');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  return {
    user,
    isAuthenticated,
    openLoginDialog,
    /** 正在进行点赞操作的ID集合 */
    likingPostIds,
    /** 正在删除的帖子ID */
    deletingPostId,
    /** 正在回复的帖子ID */
    replyingToPostId,
    setReplyingToPostId,
    /** 楼中楼回复内容 */
    replyToContent,
    setReplyToContent,
    /** 是否正在提交 */
    submitting,
    /** 举报弹窗状态 */
    reportDialogOpen,
    setReportDialogOpen,
    /** 打赏弹窗状态 */
    rewardDialogOpen,
    setRewardDialogOpen,
    /** 打赏列表弹窗状态 */
    rewardListOpen,
    setRewardListOpen,
    /** 网站Origin，用于分享链接 */
    origin,
    /** 举报目标对象 */
    reportTarget,
    /** 打开举报弹窗 */
    openReportDialog,
    /** 本地帖子数据 */
    localReply,
    /** 本地打赏统计 */
    localRewardStats,
    /** 是否待审核 */
    isPending,
    /** 是否已拒绝 */
    isRejected,
    /** 是否是自己的回复 */
    isOwnReply,
    /** 是否可交互 (非待审核/拒绝) */
    canInteract,
    /** 是否有编辑权限 */
    canEdit,
    /** 是否有删除权限 */
    canDelete,
    /** 是否处于编辑模式 */
    isEditing,
    /** 编辑中的内容 */
    editContent,
    setEditContent,
    /** 是否正在提交编辑 */
    isSubmittingEdit,
    /** 切换点赞 */
    handleTogglePostLike,
    /** 删除回复 */
    handleDeletePost,
    /** 提交楼中楼回复 */
    handleSubmitReplyToPost,
    /** 打赏成功回调 */
    handleRewardSuccess,
    /** 开始编辑 */
    handleStartEdit,
    /** 取消编辑 */
    handleCancelEdit,
    /** 提交编辑 */
    handleSubmitEdit,
  };
}
