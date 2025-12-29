'use client';

import StickySidebar from '@/components/common/StickySidebar';
import { TopicProvider } from '@/contexts/TopicContext';
import TopicContent from './TopicContent';
import ReplySection from './ReplySection';
import TopicSidebar from './TopicSidebar';

export default function TopicLayout({
  topic: initialTopic,
  initialPosts,
  totalPosts,
  totalPages,
  currentPage,
  limit,
  initialRewardStats = {},
  initialIsRewardEnabled = false,
}) {
  return (
    <TopicProvider
      initialTopic={initialTopic}
      initialRewardStats={initialRewardStats}
      initialIsRewardEnabled={initialIsRewardEnabled}
      currentPage={currentPage}
      limit={limit}
    >
      <TopicLayoutContent
        initialPosts={initialPosts}
        totalPosts={totalPosts}
        totalPages={totalPages}
        currentPage={currentPage}
        limit={limit}
      />
    </TopicProvider>
  );
}

function TopicLayoutContent({
  initialPosts,
  totalPosts,
  totalPages,
  currentPage,
  limit,
}) {
  return (
    <div className='container mx-auto p-2 lg:px-4 lg:py-6'>
      <main className='flex gap-6'>
        {/* 主要内容区域 */}
        <div className='flex-1 min-w-0'>
          {/* 话题内容 */}
          <TopicContent />

          {/* 回复区域（列表+表单） */}
          <ReplySection
            initialPosts={initialPosts}
            totalPosts={totalPosts}
            totalPages={totalPages}
            currentPage={currentPage}
            limit={limit}
          />
        </div>

        {/* 右侧边栏 */}
        <div className='fixed z-10 -left-full lg:static lg:w-64 shrink-0'>
          <StickySidebar className='sticky top-[107px]'>
            <TopicSidebar />
          </StickySidebar>
        </div>
      </main>
    </div>
  );
}
