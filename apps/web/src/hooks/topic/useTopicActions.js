import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTopicContext } from '@/contexts/TopicContext';
import { useAuth } from '@/contexts/AuthContext';
import { topicApi } from '@/lib/api';
import { toast } from 'sonner';

/**
 * 话题操作逻辑 Hook (useTopicActions)
 * 提取编辑/置顶/关闭/删除等操作的共享逻辑，供不同 UI 组件消费
 *
 * 使用方：
 * - TopicActions（default/twitter 侧边栏样式）
 * - TopicActionMenu（内联样式）
 * - 任何需要话题操作按钮的模板组件
 */
export function useTopicActions() {
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

  /**
   * 编辑话题
   * 包含 API 调用、乐观更新、审核状态处理
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

  return {
    // 话题数据
    topic,
    // 用户状态
    user,
    isAuthenticated,
    openLoginDialog,
    // 操作 loading 状态
    actionLoading,
    // 编辑对话框
    isEditDialogOpen,
    setIsEditDialogOpen,
    editLoading,
    handleEditTopic,
    // 举报对话框
    reportDialogOpen,
    setReportDialogOpen,
    // 权限
    canPin,
    canClose,
    canEdit,
    canDelete,
    // 操作方法
    toggleBookmark,
    toggleSubscribe,
    toggleTopicStatus,
    togglePinTopic,
    deleteTopic,
  };
}
