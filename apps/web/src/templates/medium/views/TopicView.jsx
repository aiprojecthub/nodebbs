import { TopicProvider } from '@/contexts/TopicContext';
import TopicViewInner from './TopicViewInner';

export default function TopicView({
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
    <div className='flex justify-center'>
      <div className='w-full max-w-[1100px] px-6 lg:px-10 py-8'>
        <TopicProvider
          initialTopic={initialTopic}
          initialRewardStats={initialRewardStats}
          initialIsRewardEnabled={initialIsRewardEnabled}
          currentPage={currentPage}
          limit={limit}
        >
          <TopicViewInner
            initialPosts={initialPosts}
            totalPosts={totalPosts}
            totalPages={totalPages}
            currentPage={currentPage}
            limit={limit}
          />
        </TopicProvider>
      </div>
    </div>
  );
}
