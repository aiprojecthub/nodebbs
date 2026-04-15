import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import { postApi } from '@/lib/api';
import { toast } from 'sonner';
import { confirm } from '@/components/common/ConfirmPopover';

/**
 * 单条回复项逻辑 Hook
 * 管理回复的本地状态、交互行为（点赞、删除、编辑、楼中楼回复、打赏、举报）
 *
 * 设计说明（为什么不使用 TopicContext）：
 * 每个 ReplyItem 是列表项，订阅 Context 会导致全量重渲染。
 * 通过 props 传入初始值，在本地管理后续更新。
 */
export function useReplyItem({
  reply,
  topicId,
  onDeleted,
  onReplyAdded,
  rewardStats,
  onRewardSuccess,
}) {
  const { user, isAuthenticated, openLoginDialog } = useAuth();
  const { canEditPost, canDeletePost } = usePermission();

  // ===== State =====
  const [localReply, setLocalReply] = useState(reply);
  const [localRewardStats, setLocalRewardStats] = useState(rewardStats || { totalCount: 0, totalAmount: 0 });
  const [likingPostIds, setLikingPostIds] = useState(new Set());
  const [deletingPostId, setDeletingPostId] = useState(null);
  const [replyingToPostId, setReplyingToPostId] = useState(null);
  const [replyToContent, setReplyToContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [rewardDialogOpen, setRewardDialogOpen] = useState(false);
  const [rewardListOpen, setRewardListOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [origin, setOrigin] = useState('');
  const [reportTarget, setReportTarget] = useState({ type: '', id: 0, title: '' });
  // 内容折叠
  const contentRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsCollapse, setNeedsCollapse] = useState(false);
  const [hasCheckedHeight, setHasCheckedHeight] = useState(false);
  // 引用展开
  const [quoteExpanded, setQuoteExpanded] = useState(false);
  const [quoteContent, setQuoteContent] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  // ===== Effects =====
  useEffect(() => {
    setLocalRewardStats(rewardStats || { totalCount: 0, totalAmount: 0 });
  }, [rewardStats]);

  useEffect(() => {
    if (typeof window !== 'undefined') setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (contentRef.current) {
      setNeedsCollapse(contentRef.current.scrollHeight > 300);
      setHasCheckedHeight(true);
    }
  }, [localReply.content]);

  // ===== Derived =====
  const isPending = localReply.approvalStatus === 'pending';
  const isRejected = localReply.approvalStatus === 'rejected';
  const isOwnReply = user?.id === localReply.userId;
  const canEdit = canEditPost(localReply);
  const canDelete = canDeletePost(localReply);
  const canInteract = !isPending && !isRejected;

  // ===== Handlers =====
  const handleTogglePostLike = async (postId, isLiked) => {
    if (!isAuthenticated) return openLoginDialog();
    if (likingPostIds.has(postId)) return;
    setLikingPostIds((prev) => new Set(prev).add(postId));
    try {
      if (isLiked) { await postApi.unlike(postId); } else { await postApi.like(postId); }
      setLocalReply((prev) => ({ ...prev, isLiked: !isLiked, likeCount: isLiked ? prev.likeCount - 1 : prev.likeCount + 1 }));
      toast.success(isLiked ? '已取消点赞' : '点赞成功');
    } catch (err) {
      console.error('点赞操作失败:', err);
      toast.error(err.message || '操作失败');
    } finally {
      setLikingPostIds((prev) => { const s = new Set(prev); s.delete(postId); return s; });
    }
  };

  const handleDeletePost = async (e, postId, postNumber) => {
    if (!isAuthenticated) return openLoginDialog();
    if (postNumber === 1) { toast.error('不能删除话题内容，请删除整个话题'); return; }
    const confirmed = await confirm(e, { title: '确认删除', description: '确定要删除这条回复吗？此操作不可恢复。', confirmText: '确认删除', variant: 'destructive' });
    if (!confirmed) return;
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

  const handleSubmitReplyToPost = async (replyToPostId) => {
    if (!replyToContent.trim()) { toast.error('请输入回复内容'); return; }
    if (!isAuthenticated) return openLoginDialog();
    setSubmitting(true);
    try {
      const response = await postApi.create({ topicId, content: replyToContent, replyToPostId });
      if (response.requiresApproval) {
        toast.success(response.message || '您的回复已提交，等待审核后将公开显示');
      } else {
        toast.success(response.message || '回复成功！');
        if (response.post && onReplyAdded) {
          onReplyAdded({
            id: response.post.id, content: replyToContent, userId: user.id,
            userName: user.name, username: user.username, userUsername: user.username,
            userAvatar: user.avatar, topicId, replyToPostId,
            replyToPost: { id: localReply.id, postNumber: localReply.postNumber, userName: localReply.userName, userUsername: localReply.userUsername },
            postNumber: response.post.postNumber || 0, likeCount: 0, isLiked: false,
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), editCount: 0,
            ...response.post,
          });
        }
      }
      setReplyToContent('');
      setReplyingToPostId(null);
    } catch (err) {
      console.error('发布回复失败:', err);
      toast.error(err.message || '发布回复失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = () => {
    if (!canEdit) return;
    setEditContent(localReply.rawContent || localReply.content);
    setIsEditing(true);
  };

  const handleCancelEdit = () => { setIsEditing(false); setEditContent(''); };

  const handleSubmitEdit = async () => {
    if (!editContent.trim()) { toast.error('内容不能为空'); return; }
    if (!canEdit) { toast.error('没有编辑权限'); return; }
    setIsSubmittingEdit(true);
    try {
      const response = await postApi.update(localReply.id, editContent);
      setLocalReply((prev) => ({ ...prev, content: editContent, rawContent: editContent, editedAt: new Date().toISOString(), editCount: (prev.editCount || 0) + 1, approvalStatus: response.post?.approvalStatus || prev.approvalStatus }));
      setIsEditing(false);
      setEditContent('');
      toast.success(response.requiresApproval ? (response.message || '回复已更新，等待审核后公开显示') : (response.message || '回复更新成功'));
    } catch (err) {
      console.error('编辑回复失败:', err);
      toast.error(err.message || '编辑失败');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleRewardSuccess = (amount) => {
    setLocalRewardStats(prev => ({ totalCount: (prev.totalCount || 0) + 1, totalAmount: (prev.totalAmount || 0) + amount }));
    onRewardSuccess?.(localReply.id, amount);
  };

  const handleQuoteToggle = async () => {
    if (quoteExpanded) { setQuoteExpanded(false); return; }
    setQuoteExpanded(true);
    if (quoteContent !== null) return;
    setQuoteLoading(true);
    try {
      const post = await postApi.getById(localReply.replyToPost.id);
      setQuoteContent(post.content);
    } catch { setQuoteContent(''); } finally { setQuoteLoading(false); }
  };

  return {
    user, isAuthenticated, openLoginDialog,
    localReply, localRewardStats,
    likingPostIds, deletingPostId,
    replyingToPostId, setReplyingToPostId,
    replyToContent, setReplyToContent,
    submitting,
    reportDialogOpen, setReportDialogOpen, reportTarget, setReportTarget,
    rewardDialogOpen, setRewardDialogOpen,
    rewardListOpen, setRewardListOpen,
    isEditing, editContent, setEditContent, isSubmittingEdit,
    origin,
    contentRef, isExpanded, setIsExpanded, needsCollapse, hasCheckedHeight,
    quoteExpanded, quoteContent, quoteLoading,
    isPending, isRejected, isOwnReply, canEdit, canDelete, canInteract,
    handleTogglePostLike, handleDeletePost, handleSubmitReplyToPost,
    handleStartEdit, handleCancelEdit, handleSubmitEdit,
    handleRewardSuccess, handleQuoteToggle,
  };
}
