'use client';

import ReplyList from '@/app/(main)/topic/[id]/components/ReplyList';
import FloatingReplyForm from './FloatingReplyForm';
import { useTopicContext } from '@/contexts/TopicContext';
import { useReplyList } from '@/hooks/topic/useReplyList';

/**
 * Medium 模板 — 回复区域
 * 回复列表 + 悬浮底部回复表单（替代内联表单）
 */
export default function MediumReplySection({
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
    handleRewardSuccess,
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

      {/* 固定底部回复表单 */}
      <FloatingReplyForm onReplyAdded={handleReplyAdded} />

      {/* 底部留白，防止 fixed 栏遮挡末尾内容 */}
      <div className='h-16' />
    </>
  );
}
