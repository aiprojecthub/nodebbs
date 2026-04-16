'use client';

import ReplyList from './ReplyList';
import ReplyForm from './ReplyForm';
import { useTopicContext } from '@/contexts/TopicContext';
import { useReplyList } from '@/hooks/topic/useReplyList';

export default function ReplySection({
  initialPosts,
  totalPosts: initialTotalPosts,
  totalPages,
  currentPage,
  limit,
}) {
  const {
    topic,
    isRewardEnabled,
    rewardStats,
    handleRewardSuccess
  } = useTopicContext();

  const {
    posts,
    totalPosts,
    repliesContainerRef,
    handlePageChange,
    handlePostDeleted,
    handleReplyAdded,
  } = useReplyList({
    topicId: topic.id,
    initialPosts,
    totalPosts: initialTotalPosts,
    currentPage,
  });

  return (
    <>
      {/* 回复列表 */}
      <ReplyList
        topicId={topic.id}
        posts={posts}
        totalPosts={totalPosts}
        totalPages={totalPages}
        currentPage={currentPage}
        limit={limit}
        isRewardEnabled={isRewardEnabled}
        rewardStatsMap={rewardStats}
        onRefreshRewards={handleRewardSuccess}
        onPostDeleted={handlePostDeleted}
        onReplyAdded={handleReplyAdded}
        repliesContainerRef={repliesContainerRef}
        onPageChange={handlePageChange}
      />

      {/* 回复表单 */}
      <ReplyForm
        onReplyAdded={handleReplyAdded}
      />
    </>
  );
}
