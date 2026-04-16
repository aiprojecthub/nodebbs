'use client';

import { Archive, AlertCircle } from 'lucide-react';
import { useTopicContext } from '@/contexts/TopicContext';
import { useAuth } from '@/contexts/AuthContext';

/**
 * 话题提示信息（已删除/审核未通过）
 * 原子组件，无外层布局样式
 */
export default function TopicAlerts() {
  const { topic } = useTopicContext();
  const { user } = useAuth();

  return (
    <>
      {topic.isDeleted && (
        <div className='bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-start gap-3'>
          <Archive className='h-5 w-5 text-destructive shrink-0 mt-0.5' />
          <div className='flex-1'>
            <p className='text-sm font-medium text-destructive mb-1'>
              此话题已被删除
            </p>
            <p className='text-xs text-muted-foreground'>
              您有权限查看已删除的话题内容。普通用户无法访问此话题。
            </p>
          </div>
        </div>
      )}

      {topic.approvalStatus === 'rejected' && user?.id === topic.userId && (
        <div className='bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-start gap-3'>
          <AlertCircle className='h-5 w-5 text-destructive shrink-0 mt-0.5' />
          <div className='flex-1'>
            <p className='text-sm font-medium text-destructive mb-1'>
              此话题审核未通过
            </p>
            <p className='text-xs text-muted-foreground'>
              您可以编辑话题内容后重新提交审核。编辑后，话题将自动重新进入待审核状态。
            </p>
          </div>
        </div>
      )}
    </>
  );
}
