import { FormDialog } from '@/components/common/FormDialog';
import { Label } from '@/components/ui/label';
import Link from '@/components/common/Link';
import Time from '@/components/common/Time';
import { ReportTypeBadge, ReportStatusBadge, getReportTargetLink } from './ReportBadges';

export function ReportDetailDialog({
  open,
  onOpenChange,
  report,
}) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title='举报详情'
      cancelText='关闭'
      maxWidth='sm:max-w-150'
    >
      {report && (
        <div className='space-y-4 py-4'>
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <Label className='text-muted-foreground'>举报ID</Label>
              <p className='font-mono'>#{report.id}</p>
            </div>
            <div>
              <Label className='text-muted-foreground'>类型</Label>
              <div className='mt-1'><ReportTypeBadge type={report.reportType} /></div>
            </div>
            <div>
              <Label className='text-muted-foreground'>状态</Label>
              <div className='mt-1'><ReportStatusBadge status={report.status} /></div>
            </div>
            <div>
              <Label className='text-muted-foreground'>举报人</Label>
              <p>{report.reporterName || report.reporterUsername}</p>
            </div>
          </div>

          <div>
            <Label className='text-muted-foreground'>举报时间</Label>
            <p>
              <Time date={report.createdAt} />
            </p>
          </div>

          <div>
            <Label className='text-muted-foreground'>举报原因</Label>
            <p className='mt-1 p-3 bg-muted rounded text-sm'>
              {report.reason}
            </p>
          </div>

          {report.targetInfo && (
            <div>
              <Label className='text-muted-foreground'>目标内容</Label>
              <div className='mt-1 p-3 bg-muted rounded text-sm'>
                {report.reportType === 'topic' && (
                  <div>
                    <p className='font-medium'>{report.targetInfo.title}</p>
                    <p className='text-xs text-muted-foreground mt-1'>
                      作者: {report.targetInfo.username}
                    </p>
                  </div>
                )}
                {report.reportType === 'post' && (
                  <div>
                    <p>{report.targetInfo.content}</p>
                    <p className='text-xs text-muted-foreground mt-1'>
                      作者: {report.targetInfo.username}
                    </p>
                  </div>
                )}
                {report.reportType === 'user' && (
                  <div>
                    <p className='font-medium'>
                      {report.targetInfo.username}
                    </p>
                    {report.targetInfo.name && (
                      <p className='text-xs text-muted-foreground mt-1'>
                        {report.targetInfo.name}
                      </p>
                    )}
                  </div>
                )}
              </div>
              {getReportTargetLink(report) && (
                <Link
                  href={getReportTargetLink(report)}
                  target='_blank'
                  className='text-sm text-primary hover:underline mt-2 inline-block'
                >
                  查看原内容 →
                </Link>
              )}
            </div>
          )}

          {report.status !== 'pending' && (
            <>
              <div>
                <Label className='text-muted-foreground'>处理时间</Label>
                <p>
                  <Time date={report.resolvedAt} />
                </p>
              </div>
              {report.resolverNote && (
                <div>
                  <Label className='text-muted-foreground'>处理备注</Label>
                  <p className='mt-1 p-3 bg-muted rounded text-sm'>
                    {report.resolverNote}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </FormDialog>
  );
}
