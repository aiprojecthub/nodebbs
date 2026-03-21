'use client';

import { useImperativeHandle, forwardRef } from 'react';
import { MessageSquare } from 'lucide-react';
import { Pager } from '@/components/common/Pagination';
import ReplyItem from './ReplyItem';
import { useReplyList } from '@/hooks/topic/useReplyList';

const ReplyList = forwardRef(function ReplyList(
  {
    topicId,
    initialPosts,
    totalPosts: initialTotalPosts,
    totalPages,
    currentPage,
    limit,
    isRewardEnabled,
    rewardStatsMap = {}, // 新增：打赏统计 Map
    onRefreshRewards, // 新增：刷新打赏统计回调
  },
  ref
) {
  const {
    posts,
    totalPosts,
    repliesContainerRef,
    handlePageChange,
    handlePostDeleted,
    handleReplyAdded,
    addPost,
  } = useReplyList({
    topicId,
    initialPosts,
    totalPosts: initialTotalPosts,
    currentPage,
  });

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    addPost,
  }));

  return (
    <div className='space-y-4' >
      <div ref={repliesContainerRef} className='relative -top-16'/>
      {totalPosts > 0 && (
        <div className='flex items-center space-x-2 text-sm text-muted-foreground/70 mb-4 px-3'>
          <MessageSquare className='h-4 w-4' />
          <span className='font-medium'>{totalPosts} 条回复</span>
        </div>
      )}

      {posts.map((reply) => (
        <ReplyItem
          key={reply.id}
          reply={reply}
          topicId={topicId}
          onDeleted={handlePostDeleted}
          onReplyAdded={handleReplyAdded}
          isRewardEnabled={isRewardEnabled}
          rewardStats={rewardStatsMap[reply.id] || { totalAmount: 0, totalCount: 0 }}
          onRefreshRewards={onRefreshRewards}
        />
      ))}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className='mb-6'>
          <Pager
            total={totalPosts}
            page={currentPage}
            pageSize={limit}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
});

export default ReplyList;
