import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { postApi, topicApi } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

/**
 * 话题详情页核心逻辑 Hook
 * 负责管理 Topic 对象、打赏统计、以及所有针对 Topic 的操作（点赞、订阅、开关贴等）
 *
 * @param {Object} props - Hook 参数
 * @param {Object} props.initialTopic - 初始话题数据
 * @param {Object} props.initialRewardStats - 初始打赏统计数据
 * @param {boolean} props.initialIsRewardEnabled - 是否开启打赏功能
 * @param {number} props.currentPage - 当前页码
 * @param {number} props.limit - 每页显示数量
 * @returns {Object} 包含话题状态和操作方法的对象
 */
export function useTopicDetail({
  initialTopic,
  initialRewardStats = {},
  initialIsRewardEnabled = false,
  currentPage,
  limit,
}) {
  const router = useRouter();
  const { isAuthenticated, openLoginDialog } = useAuth();
  
  const isRewardEnabled = initialIsRewardEnabled;
  const [topic, setTopic] = useState(initialTopic);
  const [rewardStats, setRewardStats] = useState(initialRewardStats);
  
  // 统一的操作 loading 状态管理
  const [actionLoading, setActionLoading] = useState({
    bookmark: false,
    subscribe: false,
    toggleStatus: false,
    togglePin: false,
    delete: false,
  });

  // 监听 initialRewardStats 变化
  useEffect(() => {
    setRewardStats(initialRewardStats);
  }, [initialRewardStats]);

  /**
   * 更新话题数据的通用方法
   * @param {Object} updates - 要更新的字段
   */
  const updateTopic = (updates) => {
    setTopic((prev) => ({ ...prev, ...updates }));
  };
  
  /**
   * 更新指定操作的 loading 状态
   * @param {string} action - 操作名称
   * @param {boolean} loading - loading 状态
   */
  const setLoading = (action, loading) => {
    setActionLoading(prev => ({ ...prev, [action]: loading }));
  };

  // --- 动作处理 (Actions) ---

  /**
   * 切换收藏状态
   * 包含乐观更新和错误回滚
   */
  const toggleBookmark = async () => {
    if (!isAuthenticated) return openLoginDialog();

    // 乐观更新
    const previousState = topic.isBookmarked;
    updateTopic({ isBookmarked: !previousState });
    setLoading('bookmark', true);

    try {
      if (previousState) {
        await topicApi.unbookmark(topic.id);
        toast.success('已取消收藏');
      } else {
        await topicApi.bookmark(topic.id);
        toast.success('收藏成功');
      }
    } catch (err) {
      // 回滚
      updateTopic({ isBookmarked: previousState });
      console.error('收藏操作失败:', err);
      toast.error(err.message || '操作失败');
    } finally {
      setLoading('bookmark', false);
    }
  };

  /**
   * 切换订阅状态
   * 包含乐观更新和错误回滚
   */
  const toggleSubscribe = async () => {
    if (!isAuthenticated) return openLoginDialog();

    const previousState = topic.isSubscribed;
    updateTopic({ isSubscribed: !previousState });
    setLoading('subscribe', true);

    try {
      if (previousState) {
        await topicApi.unsubscribe(topic.id);
        toast.success('已取消订阅');
      } else {
        await topicApi.subscribe(topic.id);
        toast.success('订阅成功，有新回复时会收到通知');
      }
    } catch (err) {
      updateTopic({ isSubscribed: previousState });
      console.error('订阅操作失败:', err);
      toast.error(err.message || '操作失败');
    } finally {
      setLoading('subscribe', false);
    }
  };

  /**
   * 切换话题开启/关闭状态
   * 包含乐观更新和错误回滚
   */
  const toggleTopicStatus = async () => {
    if (!isAuthenticated) return openLoginDialog();

    setLoading('toggleStatus', true);
    const previousState = topic.isClosed;

    try {
      // 乐观更新
      updateTopic({ isClosed: !previousState });

      await topicApi.update(topic.id, {
        isClosed: !previousState,
      });

      toast.success(!previousState ? '话题已关闭' : '话题已重新开启');
      router.refresh();
    } catch (err) {
      // 回滚
      updateTopic({ isClosed: previousState });
      console.error('操作失败:', err);
      toast.error(err.message || '操作失败');
    } finally {
      setLoading('toggleStatus', false);
    }
  };

  /**
   * 切换话题置顶状态
   * 包含乐观更新和错误回滚
   */
  const togglePinTopic = async () => {
    if (!isAuthenticated) return openLoginDialog();

    setLoading('togglePin', true);
    const previousState = topic.isPinned;

    try {
      // 乐观更新
      updateTopic({ isPinned: !previousState });

      await topicApi.update(topic.id, {
        isPinned: !previousState,
      });

      toast.success(!previousState ? '话题已置顶' : '已取消置顶');
      router.refresh();
    } catch (err) {
      // 回滚
      updateTopic({ isPinned: previousState });
      console.error('置顶操作失败:', err);
      toast.error(err.message || '操作失败');
    } finally {
      setLoading('togglePin', false);
    }
  };

  /**
   * 删除话题（逻辑删除）
   */
  const deleteTopic = async () => {
    if (!isAuthenticated) return openLoginDialog();

    setLoading('delete', true);

    try {
      await topicApi.delete(topic.id);
      toast.success('话题已删除');
      // 删除后跳转到首页或分类页
      router.push('/');
    } catch (err) {
      console.error('删除话题失败:', err);
      toast.error(err.message || '删除失败');
    } finally {
      setLoading('delete', false);
    }
  };

  /**
   * 处理打赏成功的回调
   * 更新本地打赏统计数据
   * @param {number} postId - 帖子ID
   * @param {number} amount - 打赏金额
   */
  const handleRewardSuccess = (postId, amount) => {
    setRewardStats((prev) => {
      const currentStats = prev[postId] || { totalAmount: 0, totalCount: 0 };
      return {
        ...prev,
        [postId]: {
          totalAmount: currentStats.totalAmount + amount,
          totalCount: currentStats.totalCount + 1,
        },
      };
    });
  };

  /**
   * 平滑滚动到指定帖子，并添加高亮效果
   * @param {number} postId - 帖子ID
   */
  const scrollToPost = (postId) => {
    setTimeout(() => {
      const element = document.getElementById(`post-${postId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('highlight-post');
        setTimeout(() => element.classList.remove('highlight-post'), 4000);
      }
    }, 300);
  };

  // 哈希导航逻辑
  useEffect(() => {
    const hash = window.location.hash;
    const match = hash.match(/^#post-(\d+)$/);
    if (!match) return;

    const postId = parseInt(match[1]);

    const handleHashNavigation = async () => {
      try {
        const { page } = await postApi.getPosition(postId, topic.id, limit);
        if (page !== currentPage) {
          router.push(`/topic/${topic.id}?p=${page}#post-${postId}`, { scroll: false });
          return;
        }
        scrollToPost(postId);
      } catch (err) {
        console.error('Failed to navigate to post:', err);
      }
    };

    handleHashNavigation();

    const handleHashChange = () => {
      const newMatch = window.location.hash.match(/^#post-(\d+)$/);
      if (newMatch) handleHashNavigation();
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [topic.id, currentPage, limit, router]);

  return {
    /** 当前话题数据 */
    topic,
    /** 更新话题数据的方法 */
    updateTopic,
    /** 打赏统计数据 Map */
    rewardStats,
    /** 是否开启打赏功能 */
    isRewardEnabled,
    /** 处理打赏成功的回调 */
    handleRewardSuccess,
    /** 滚动到指定帖子 */
    scrollToPost,
    
    // === 操作状态 ===
    /** 操作 loading 状态对象 { bookmark, subscribe, toggleStatus } */
    actionLoading,
    
    // === Actions ===
    /** 切换收藏方法 */
    toggleBookmark,
    /** 切换订阅方法 */
    toggleSubscribe,
    /** 切换话题状态方法 */
    toggleTopicStatus,
    /** 切换话题置顶方法 */
    togglePinTopic,
    /** 删除话题方法 */
    deleteTopic,
  };
}
