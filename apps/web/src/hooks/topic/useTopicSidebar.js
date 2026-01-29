import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { topicApi } from '@/lib/api';
import { toast } from 'sonner';
import { useTopicContext } from '@/contexts/TopicContext';

/**
 * 侧边栏逻辑 Hook (useTopicSidebar)
 * 管理侧边栏的操作，如收藏、订阅、编辑、举报
 * 大部分业务逻辑直接消费 TopicContext 的共享方法
 *
 * 设计说明：
 * - loading 状态由 Context 统一管理 (actionLoading)
 * - 编辑、举报弹窗状态在本地管理（因为这些是侧边栏专属交互）
 * - 权限检查使用后端返回的 canPin/canClose/canEdit/canDelete 字段（更精确，考虑了 categories 等条件）
 *
 * @returns {Object} 包含侧边栏状态和操作方法的对象
 */
export function useTopicSidebar() {
  const router = useRouter();
  const {
    topic,
    updateTopic,
    toggleBookmark,
    toggleSubscribe,
    toggleTopicStatus,
    togglePinTopic,
    deleteTopic,
    actionLoading,  // 使用 Context 统一管理的 loading 状态
  } = useTopicContext();

  const { user, isAuthenticated, openLoginDialog } = useAuth();

  // 侧边栏专属的本地状态
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  // 权限检查 - 使用后端返回的权限字段（更精确，考虑了 categories 等条件）
  const canPin = topic.canPin || false;
  const canClose = topic.canClose || false;
  const canEdit = topic.canEdit || false;
  const canDelete = topic.canDelete || false;
  const isTopicOwner = user && topic.userId === user.id;

  /**
   * 处理编辑话题
   * 调用 API 并更新 Context 数据
   * @param {Object} editData - 编辑表单数据
   */
  const handleEditTopic = async (editData) => {
    if (!isAuthenticated) return openLoginDialog();

    setEditLoading(true);

    try {
      const response = await topicApi.update(topic.id, editData);

      if (topic.approvalStatus === 'rejected' && response?.approvalStatus === 'pending') {
        toast.success('话题已重新提交审核，等待审核后将公开显示');
      } else {
        toast.success('话题更新成功');
      }

      setIsEditDialogOpen(false);
      
      // 更新 Context 中的 topic 数据
      const tagsArray = Array.isArray(editData.tags)
        ? editData.tags.map((tagName, index) => ({
            id: `temp-${index}`,
            name: tagName,
          }))
        : [];

      updateTopic({
        title: editData.title,
        content: editData.content,
        categoryId: editData.categoryId,
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

  return {
    /** 导出 topic 供 UI 使用 (必须) */
    topic, 
    /** 当前登录用户 */
    user,
    /** 是否已登录 */
    isAuthenticated,
    
    // === 收藏功能 ===
    /** 是否已收藏 (快捷访问) */
    isBookmarked: topic.isBookmarked,
    /** 收藏操作加载状态 (来自 Context) */
    bookmarkLoading: actionLoading.bookmark,
    /** 切换收藏方法 (直接使用 Context 方法) */
    handleToggleBookmark: toggleBookmark,
    
    // === 订阅功能 ===
    /** 是否已订阅 (快捷访问) */
    isSubscribed: topic.isSubscribed,
    /** 订阅操作加载状态 (来自 Context) */
    subscribeLoading: actionLoading.subscribe,
    /** 切换订阅方法 (直接使用 Context 方法) */
    handleToggleSubscribe: toggleSubscribe,
    
    // === 话题状态切换 ===
    /** 切换话题状态方法 (直接使用 Context 方法) */
    handleToggleTopicStatus: toggleTopicStatus,

    // === 话题置顶 ===
    /** 话题是否已置顶 (快捷访问) */
    isPinned: topic.isPinned,
    /** 置顶操作加载状态 (来自 Context) */
    pinLoading: actionLoading.togglePin,
    /** 切换置顶方法 (直接使用 Context 方法) */
    handleTogglePinTopic: togglePinTopic,

    // === 删除话题 ===
    /** 删除操作加载状态 (来自 Context) */
    deleteLoading: actionLoading.delete,
    /** 删除话题方法 (直接使用 Context 方法) */
    handleDeleteTopic: deleteTopic,
    
    // === 编辑功能 (侧边栏专属) ===
    /** 编辑弹窗是否打开 */
    isEditDialogOpen,
    /** 设置编辑弹窗状态 */
    setIsEditDialogOpen,
    /** 编辑提交加载状态 */
    editLoading,
    /** 提交编辑话题方法 */
    handleEditTopic,
    
    // === 举报功能 (侧边栏专属) ===
    /** 举报弹窗是否打开 */
    reportDialogOpen,
    /** 设置举报弹窗状态 */
    setReportDialogOpen,
    
    // === 权限检查（来自后端，已考虑 categories 等条件） ===
    /** 当前用户是否有权置顶话题 */
    canPin,
    /** 当前用户是否有权关闭话题 */
    canClose,
    /** 当前用户是否有权编辑话题 */
    canEdit,
    /** 当前用户是否有权删除话题 */
    canDelete,
    /** 当前用户是否是话题作者 */
    isTopicOwner,
  };
}
