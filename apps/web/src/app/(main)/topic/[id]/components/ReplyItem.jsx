'use client';

import ReplyHeader from '@/components/topic/TopicDetail/ReplyHeader';
import ReplyQuote from '@/components/topic/TopicDetail/ReplyQuote';
import ReplyBody from '@/components/topic/TopicDetail/ReplyBody';
import ReplyActionBar from '@/components/topic/TopicDetail/ReplyActionBar';
import ReplyInlineForm from '@/components/topic/TopicDetail/ReplyInlineForm';
import ReportDialog from '@/components/common/ReportDialog';
import { RewardDialog } from '@/extensions/rewards/components/RewardDialog';
import { RewardListDialog } from '@/extensions/rewards/components/RewardListDialog';
import { useReplyItem } from '@/hooks/topic/useReplyItem';

/**
 * 单条回复项 — 组合原子组件的默认实现
 * 模板可直接使用此组件，也可单独引用原子组件自由组合
 */
export default function ReplyItem({ reply, topicId, onDeleted, onReplyAdded, isRewardEnabled, rewardStats, onRewardSuccess }) {
  const {
    isAuthenticated, openLoginDialog,
    localReply, localRewardStats,
    likingPostIds, deletingPostId,
    replyingToPostId, setReplyingToPostId,
    replyToContent, setReplyToContent,
    submitting,
    reportDialogOpen, setReportDialogOpen, reportTarget, setReportTarget,
    rewardDialogOpen, setRewardDialogOpen,
    rewardListOpen, setRewardListOpen,
    isEditing, editContent, setEditContent, isSubmittingEdit,
    origin,
    quoteExpanded, quoteContent, quoteLoading,
    isPending, isRejected, isOwnReply, canEdit, canDelete, canInteract,
    handleTogglePostLike, handleDeletePost, handleSubmitReplyToPost,
    handleStartEdit, handleCancelEdit, handleSubmitEdit,
    handleRewardSuccess, handleQuoteToggle,
  } = useReplyItem({ reply, topicId, onDeleted, onReplyAdded, rewardStats, onRewardSuccess });

  return (
    <>
      <div
        id={`post-${localReply.id}`}
        className={`content-card hover:border-border/80 transition-colors duration-300 group ${isPending ? 'border-chart-5/30 bg-chart-5/5' : isRejected ? 'border-destructive/30 bg-destructive/5' : ''}`}
        data-post-number={localReply.postNumber}
      >
        <div className='p-3 sm:p-5'>
          {/* 头部 */}
          <div className='mb-4'>
            <ReplyHeader
              reply={localReply}
              topicId={topicId}
              origin={origin}
              isPending={isPending}
              isRejected={isRejected}
            />
          </div>

          <div className="pl-0 sm:pl-13">
            {/* 引用 */}
            <ReplyQuote
              reply={localReply}
              quoteExpanded={quoteExpanded}
              quoteContent={quoteContent}
              quoteLoading={quoteLoading}
              onToggle={handleQuoteToggle}
            />

            {/* 正文 */}
            <ReplyBody
              content={localReply.content}
              isEditing={isEditing}
              editContent={editContent}
              onEditChange={setEditContent}
              onSubmitEdit={handleSubmitEdit}
              onCancelEdit={handleCancelEdit}
              isSubmittingEdit={isSubmittingEdit}
            />

            {/* 操作栏 */}
            <div className='mt-4 pt-3 border-t border-dashed border-border/60'>
              <ReplyActionBar
              reply={localReply}
              isAuthenticated={isAuthenticated}
              openLoginDialog={openLoginDialog}
              isRewardEnabled={isRewardEnabled}
              isOwnReply={isOwnReply}
              canEdit={canEdit}
              canDelete={canDelete}
              canInteract={canInteract}
              isEditing={isEditing}
              rewardStats={localRewardStats}
              likingPostIds={likingPostIds}
              deletingPostId={deletingPostId}
              onReply={() => {
                setReplyingToPostId(localReply.id);
                setReplyToContent('');
              }}
              onToggleLike={handleTogglePostLike}
              onDelete={(e) => handleDeletePost(e, localReply.id, localReply.postNumber)}
              onStartEdit={handleStartEdit}
              onOpenReward={() => setRewardDialogOpen(true)}
              onOpenRewardList={() => setRewardListOpen(true)}
              onReport={() => {
                setReportTarget({ type: 'post', id: localReply.id, title: `回复 #${localReply.postNumber}` });
                setReportDialogOpen(true);
              }}
            />
            </div>
          </div>
        </div>

        {/* 楼中楼回复表单 */}
        {replyingToPostId === localReply.id && (
          <div className='px-4 sm:px-6 pb-5'>
            <ReplyInlineForm
            reply={localReply}
            replyContent={replyToContent}
            onReplyChange={setReplyToContent}
            onSubmit={() => handleSubmitReplyToPost(localReply.id)}
            onCancel={() => {
              setReplyingToPostId(null);
              setReplyToContent('');
            }}
            submitting={submitting}
          />
          </div>
        )}
      </div>

      {/* 弹窗 */}
      <ReportDialog open={reportDialogOpen} onOpenChange={setReportDialogOpen} reportType={reportTarget.type} targetId={reportTarget.id} targetTitle={reportTarget.title} />
      <RewardDialog open={rewardDialogOpen} onOpenChange={setRewardDialogOpen} postId={localReply.id} postAuthor={localReply.userName || localReply.userUsername} onSuccess={handleRewardSuccess} onViewHistory={() => { setRewardDialogOpen(false); setRewardListOpen(true); }} />
      <RewardListDialog open={rewardListOpen} onOpenChange={setRewardListOpen} postId={localReply.id} />
    </>
  );
}
