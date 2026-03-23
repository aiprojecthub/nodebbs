import { useState } from 'react';
import { FormDialog } from '@/components/common/FormDialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ReportTypeBadge } from './ReportBadges';

export function ReportResolveDialog({
  open,
  onOpenChange,
  report,
  action,
  onResolve,
  resolving,
}) {
  const [resolveNote, setResolveNote] = useState('');

  return (
    <FormDialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setResolveNote('');
        onOpenChange(v);
      }}
      title={action === 'resolve' ? '处理举报' : '驳回举报'}
      description={
        report && (
          <div className='mt-2 space-y-2'>
            <div className='flex items-center space-x-2'>
              <span className='text-sm font-medium'>类型：</span>
              <ReportTypeBadge type={report.reportType} />
            </div>
            <div className='text-sm'>
              <span className='font-medium'>举报原因：</span>
              <p className='mt-1 text-muted-foreground'>{report.reason}</p>
            </div>
          </div>
        )
      }
      submitText={action === 'resolve' ? '确认处理' : '确认驳回'}
      onSubmit={() => onResolve(resolveNote)}
      loading={resolving}
      submitClassName={
        action === 'resolve' ? 'bg-green-600 hover:bg-green-700' : ''
      }
      maxWidth='sm:max-w-125'
    >
      <div className='space-y-4 py-4'>
        <div className='space-y-2'>
          <Label htmlFor='resolve-note'>处理备注（可选）</Label>
          <Textarea
            id='resolve-note'
            placeholder='输入处理备注...'
            value={resolveNote}
            onChange={(e) => setResolveNote(e.target.value)}
            disabled={resolving}
            className='min-h-25'
            maxLength={500}
          />
        </div>
      </div>
    </FormDialog>
  );
}
