import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

const TYPE_TEXT = { topic: '话题', post: '回复', user: '用户' };
const TYPE_VARIANTS = { topic: 'default', post: 'secondary', user: 'outline' };

export function getReportTypeText(type) {
  return TYPE_TEXT[type] || type;
}

export function ReportTypeBadge({ type }) {
  return (
    <Badge variant={TYPE_VARIANTS[type] || 'secondary'} className='text-xs'>
      {getReportTypeText(type)}
    </Badge>
  );
}

export function ReportStatusBadge({ status }) {
  switch (status) {
    case 'pending':
      return (
        <Badge className='bg-yellow-100 text-yellow-800 text-xs'>
          <AlertTriangle className='h-3 w-3 mr-1' />
          待处理
        </Badge>
      );
    case 'resolved':
      return (
        <Badge className='bg-green-100 text-green-800 text-xs'>
          <CheckCircle className='h-3 w-3 mr-1' />
          已处理
        </Badge>
      );
    case 'dismissed':
      return (
        <Badge className='bg-gray-100 text-gray-800 text-xs'>
          <XCircle className='h-3 w-3 mr-1' />
          已驳回
        </Badge>
      );
    default:
      return <Badge variant='secondary' className='text-xs'>{status}</Badge>;
  }
}

export function getReportTargetLink(report) {
  if (!report.targetInfo) return null;
  if (report.reportType === 'topic') {
    return `/topic/${report.targetId}`;
  } else if (report.reportType === 'post' && report.targetInfo.topicId) {
    return `/topic/${report.targetInfo.topicId}#post-${report.targetId}`;
  } else if (report.reportType === 'user') {
    return `/users/${report.targetInfo.username}`;
  }
  return null;
}
