'use client';

import ReportDialog from '@/components/common/ReportDialog';
import { RewardDialog } from '@/extensions/rewards/components/RewardDialog';
import { RewardListDialog } from '@/extensions/rewards/components/RewardListDialog';

export default function ReplyDialogs({
  reply,
  reportDialogOpen, setReportDialogOpen, reportTarget,
  rewardDialogOpen, setRewardDialogOpen, handleRewardSuccess,
  rewardListOpen, setRewardListOpen
}) {
  return (
    <>
      <ReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        reportType={reportTarget.type}
        targetId={reportTarget.id}
        targetTitle={reportTarget.title}
      />
      <RewardDialog
        open={rewardDialogOpen}
        onOpenChange={setRewardDialogOpen}
        postId={reply.id}
        postAuthor={reply.userName || reply.userUsername}
        onSuccess={handleRewardSuccess}
        onViewHistory={() => {
          setRewardDialogOpen(false);
          setRewardListOpen(true);
        }}
      />
      <RewardListDialog
        open={rewardListOpen}
        onOpenChange={setRewardListOpen}
        postId={reply.id}
      />
    </>
  );
}
