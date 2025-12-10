'use client';

import { useState } from 'react';
import { FormDialog } from '@/components/common/FormDialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, AlertTriangle } from 'lucide-react';
import { moderationApi } from '@/lib/api';
import { toast } from 'sonner';

export default function ReportDialog({
  open,
  onOpenChange,
  reportType,
  targetId,
  targetTitle,
}) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim() || reason.trim().length < 10) {
      toast.error('请输入至少10个字符的举报原因');
      return;
    }

    setSubmitting(true);

    try {
      await moderationApi.createReport(reportType, targetId, reason.trim());
      toast.success('举报提交成功，我们会尽快处理');
      setReason('');
      onOpenChange(false);
    } catch (err) {
      console.error('举报失败:', err);
      toast.error(err.message || '举报失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const getTypeText = () => {
    switch (reportType) {
      case 'topic':
        return '话题';
      case 'post':
        return '回复';
      case 'user':
        return '用户';
      default:
        return '内容';
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        <div className='flex items-center space-x-2'>
          <AlertTriangle className='h-5 w-5 text-orange-500' />
          <span>举报{getTypeText()}</span>
        </div>
      }
      description={
        targetTitle && (
            <span className='block mt-2 p-2 bg-muted rounded text-sm'>
            {getTypeText()}：{targetTitle}
            </span>
        )
      }
      submitText="提交举报"
      onSubmit={handleSubmit}
      loading={submitting}
      submitClassName="bg-orange-500 hover:bg-orange-600"
      disabled={submitting || reason.trim().length < 10}
      maxWidth="sm:max-w-[500px]"
    >
        <div className='space-y-4 py-4'>
          <div className='space-y-2'>
            <Label htmlFor='reason'>举报原因 *</Label>
            <Textarea
              id='reason'
              placeholder='请详细说明举报原因（至少10个字符）'
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={submitting}
              className='min-h-[120px]'
              maxLength={500}
            />
            <div className='text-xs text-muted-foreground text-right'>
              {reason.length}/500
            </div>
          </div>

          <div className='text-sm text-muted-foreground bg-muted p-3 rounded'>
            <p className='font-medium mb-1'>举报须知：</p>
            <ul className='list-disc list-inside space-y-1 text-xs'>
              <li>请如实填写举报原因，虚假举报将受到处罚</li>
              <li>我们会在24小时内处理您的举报</li>
              <li>处理结果将通过站内通知告知您</li>
            </ul>
          </div>
        </div>
    </FormDialog>
  );
}
