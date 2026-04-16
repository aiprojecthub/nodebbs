'use client';

import { MessageSquare } from 'lucide-react';
import { Pager } from '@/components/common/Pagination';
import ReplyItem from './ReplyItem';

/**
 * 回复列表 — 纯展示组件
 * 数据和状态由父组件（ReplySection）通过 props 传入
 * 支持 renderItem 自定义回复项渲染
 */
export default function ReplyList({
  topicId,
  posts,
  totalPosts,
  totalPages,
  currentPage,
  limit,
  isRewardEnabled,
  rewardStatsMap = {},
  onRefreshRewards,
  onPostDeleted,
  onReplyAdded,
  repliesContainerRef,
  onPageChange,
  renderItem,
}) {
  return (
    <div className='space-y-4'>
      <div ref={repliesContainerRef} className='relative -top-16' />
      {totalPosts > 0 && (
        <div className='flex items-center space-x-2 text-sm text-muted-foreground/70 mb-4 px-3'>
          <MessageSquare className='h-4 w-4' />
          <span className='font-medium'>{totalPosts} 条回复</span>
        </div>
      )}

      {posts.map((reply) =>
        renderItem
          ? renderItem(reply, {
              topicId,
              onDeleted: onPostDeleted,
              onReplyAdded,
              isRewardEnabled,
              rewardStats: rewardStatsMap[reply.id] || { totalAmount: 0, totalCount: 0 },
              onRefreshRewards,
            })
          : (
            <ReplyItem
              key={reply.id}
              reply={reply}
              topicId={topicId}
              onDeleted={onPostDeleted}
              onReplyAdded={onReplyAdded}
              isRewardEnabled={isRewardEnabled}
              rewardStats={rewardStatsMap[reply.id] || { totalAmount: 0, totalCount: 0 }}
              onRefreshRewards={onRefreshRewards}
            />
          )
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className='mb-6'>
          <Pager
            total={totalPosts}
            page={currentPage}
            pageSize={limit}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </div>
  );
}
