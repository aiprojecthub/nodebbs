'use client';

import ReplyList from './ReplyList';
import ReplyForm from './ReplyForm';
import { useReplySection } from '@/hooks/topic/useReplySection';
import { useTopicContext } from '@/contexts/TopicContext';

export default function ReplySection({
  initialPosts,
  totalPosts,
  totalPages,
  currentPage,
  limit,
}) {
  const { replyListRef, handleReplyAdded } = useReplySection();
  const { 
    topic, 
    isRewardEnabled, 
    rewardStats, 
    handleRewardSuccess 
  } = useTopicContext();

  return (
    <>
      {/* 回复列表 */}
      <ReplyList
        ref={replyListRef}
        topicId={topic.id}
        initialPosts={initialPosts}
        totalPosts={totalPosts}
        totalPages={totalPages}
        currentPage={currentPage}
        limit={limit}
        isRewardEnabled={isRewardEnabled}
        rewardStatsMap={rewardStats}
        onRefreshRewards={handleRewardSuccess}
      />

      {/* 回复表单 */}
      <ReplyForm
        onReplyAdded={handleReplyAdded}
      />
    </>
  );
}
