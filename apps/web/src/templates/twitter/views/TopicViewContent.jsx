'use client';

import { TopicProvider } from '@/contexts/TopicContext';
import TopicContent from '@/app/(main)/topic/[id]/components/TopicContent';
import TopicSidebar from '@/app/(main)/topic/[id]/components/TopicSidebar';
import ReplySection from '@/app/(main)/topic/[id]/components/ReplySection';
import StickySidebar from '@/components/common/StickySidebar';
import StickyHeader from '../components/StickyHeader';

export default function TopicViewContent({
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
      <div className='flex'>
        {/* 帖子内容 */}
        <main className='flex-1 min-w-0 border-r border-border'>
          <StickyHeader title='帖子' />
          <TopicContent />
          <ReplySection
            initialPosts={initialPosts}
            totalPosts={totalPosts}
            totalPages={totalPages}
            currentPage={currentPage}
            limit={limit}
          />
        </main>

        {/* 右侧操作栏：桌面端固定显示，移动端通过悬浮球打开 */}
        <div className='fixed z-10 -left-full lg:static lg:w-[350px] shrink-0'>
          <StickySidebar className='sticky top-0 max-h-screen overflow-y-auto px-6 py-4 space-y-4'>
            <TopicSidebar />
          </StickySidebar>
        </div>
      </div>
    </TopicProvider>
  );
}
