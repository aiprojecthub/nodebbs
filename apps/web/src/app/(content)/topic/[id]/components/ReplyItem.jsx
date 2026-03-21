'use client';

import { useReplyItem } from '@/hooks/topic/useReplyItem';

import ReplyHeader from './reply/ReplyHeader';
import ReplyQuote from './reply/ReplyQuote';
import ReplyContent from './reply/ReplyContent';
import ReplyEditor from './reply/ReplyEditor';
import ReplyActions from './reply/ReplyActions';
import ReplyInput from './reply/ReplyInput';
import ReplyDialogs from './reply/ReplyDialogs';

export default function ReplyItem({ reply, topicId, onDeleted, onReplyAdded, isRewardEnabled, rewardStats, onRewardSuccess }) {
  const hooks = useReplyItem({
    reply,
    topicId,
    onDeleted,
    onReplyAdded,
    rewardStats,
    onRewardSuccess
  });

  return (
    <>
      <div
        id={`post-${hooks.localReply.id}`}
        className={`bg-card border-b border-x-0 border-t-0 sm:border sm:rounded-lg hover:border-border/80 transition-colors duration-300 group ${
          hooks.isPending
            ? 'border-chart-5/30 bg-chart-5/5'
            : hooks.isRejected
            ? 'border-destructive/30 bg-destructive/5'
            : 'border-border'
        }`}
        data-post-number={hooks.localReply.postNumber}
      >
        <div className='p-3 sm:p-5'>
          {/* 头部信息区 */}
          <ReplyHeader
            reply={hooks.localReply}
            topicId={topicId}
            origin={hooks.origin}
            isPending={hooks.isPending}
            isRejected={hooks.isRejected}
          />

          <div className="pl-0 sm:pl-13">
            {/* 引用/回复目标 */}
            <ReplyQuote reply={hooks.localReply} />

            {/* Markdown 内容 / 编辑器 */}
            {hooks.isEditing ? (
              <ReplyEditor
                editContent={hooks.editContent}
                setEditContent={hooks.setEditContent}
                isSubmittingEdit={hooks.isSubmittingEdit}
                handleCancelEdit={hooks.handleCancelEdit}
                handleSubmitEdit={hooks.handleSubmitEdit}
              />
            ) : (
              <ReplyContent content={hooks.localReply.content} />
            )}

            {/* 底部操作栏 */}
            <ReplyActions
              reply={hooks.localReply}
              hooks={hooks}
              isRewardEnabled={isRewardEnabled}
            />
          </div>
        </div>

        {/* 楼中楼回复输入框 */}
        <ReplyInput
          reply={hooks.localReply}
          replyingToPostId={hooks.replyingToPostId}
          setReplyingToPostId={hooks.setReplyingToPostId}
          replyToContent={hooks.replyToContent}
          setReplyToContent={hooks.setReplyToContent}
          submitting={hooks.submitting}
          handleSubmitReplyToPost={hooks.handleSubmitReplyToPost}
        />
      </div>

      {/* 全局交互对话框 */}
      <ReplyDialogs
        reply={hooks.localReply}
        reportDialogOpen={hooks.reportDialogOpen}
        setReportDialogOpen={hooks.setReportDialogOpen}
        reportTarget={hooks.reportTarget}
        rewardDialogOpen={hooks.rewardDialogOpen}
        setRewardDialogOpen={hooks.setRewardDialogOpen}
        handleRewardSuccess={hooks.handleRewardSuccess}
        rewardListOpen={hooks.rewardListOpen}
        setRewardListOpen={hooks.setRewardListOpen}
      />
    </>
  );
}
