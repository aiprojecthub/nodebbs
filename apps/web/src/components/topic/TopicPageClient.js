'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StickySidebar from '@/components/forum/StickySidebar';
import TopicContent from '@/components/topic/TopicContent';
import ReplySection from '@/components/topic/ReplySection';
import TopicSidebarWrapper from '@/components/topic/TopicSidebarWrapper';
import { postApi, creditsApi } from '@/lib/api';
import { toast } from 'sonner';

export default function TopicPageClient({
  topic: initialTopic,
  initialPosts,
  totalPosts,
  totalPages,
  currentPage,
  limit,
}) {
  const router = useRouter();
  const [isCreditEnabled, setIsCreditEnabled] = useState(false);

  // 统一管理话题状态
  const [topic, setTopic] = useState(initialTopic);

  // 获取积分系统状态
  useEffect(() => {
    const fetchCreditStatus = async () => {
      try {
        const { enabled } = await creditsApi.getStatus();
        setIsCreditEnabled(enabled);
      } catch (error) {
        console.error('Failed to fetch credit status:', error);
      }
    };
    fetchCreditStatus();
  }, []);

  // 更新话题状态的回调
  const handleTopicUpdate = (updates) => {
    setTopic((prev) => ({ ...prev, ...updates }));
  };

  // 滚动到指定帖子
  const scrollToPost = (postId) => {
    setTimeout(() => {
      const element = document.getElementById(`post-${postId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // 添加高亮效果
        element.classList.add('highlight-post');
        setTimeout(() => element.classList.remove('highlight-post'), 4000);
      }
    }, 300); // 等待 DOM 渲染
  };

  // 处理 hash 导航到指定楼层
  useEffect(() => {
    const hash = window.location.hash;

    // 检测 #post-123 格式
    const match = hash.match(/^#post-(\d+)$/);
    if (!match) return; // 没有 hash 时直接返回，不处理

    const postId = parseInt(match[1]);

    const handleHashNavigation = async () => {
      try {
        // 调用位置 API
        const { page } = await postApi.getPosition(postId, topic.id, limit);

        // 如果不在当前页，跳转到目标页
        if (page !== currentPage) {
          router.push(`/topic/${topic.id}?p=${page}#post-${postId}`, { scroll: false });
          return;
        }

        // 已在正确页面，滚动到目标元素
        scrollToPost(postId);
      } catch (error) {
        toast.error(error.message || '出错了');
        console.error('Failed to navigate to post:', error);
      }
    };

    // 页面加载后执行
    handleHashNavigation();

    // 监听 hash 变化
    const handleHashChange = () => {
      const newHash = window.location.hash;
      const newMatch = newHash.match(/^#post-(\d+)$/);
      if (newMatch) {
        handleHashNavigation();
      }
    };

    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [topic.id, currentPage, limit, router]);

  return (
    <div className='container mx-auto px-4 py-6 flex-1'>
      <main className='flex flex-col-reverse md:flex-col lg:flex-row gap-6'>
        {/* 主要内容区域 */}
        <div className='flex-1'>
          {/* 话题内容 */}
          <TopicContent topic={topic} isCreditEnabled={isCreditEnabled} />

          {/* 回复区域（列表+表单） */}
          <ReplySection
            topicId={topic.id}
            initialPosts={initialPosts}
            totalPosts={totalPosts}
            totalPages={totalPages}
            currentPage={currentPage}
            limit={limit}
            isClosed={topic.isClosed}
            isDeleted={topic.isDeleted}
            onTopicUpdate={handleTopicUpdate}
            isCreditEnabled={isCreditEnabled}
          />
        </div>

        {/* 右侧边栏 */}
        <div className='w-full lg:w-64 shrink-0'>
          <StickySidebar className='sticky top-[107px]'>
            <TopicSidebarWrapper
              topic={topic}
              onTopicUpdate={handleTopicUpdate}
            />
          </StickySidebar>
        </div>
      </main>
    </div>
  );
}
