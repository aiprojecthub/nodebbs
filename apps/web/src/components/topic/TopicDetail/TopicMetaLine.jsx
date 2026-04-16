'use client';

import Link from '@/components/common/Link';
import { Badge } from '@/components/ui/badge';
import { Lock } from 'lucide-react';
import Time from '@/components/common/Time';
import { useTopicContext } from '@/contexts/TopicContext';

/**
 * 话题元信息行（作者、时间、浏览数、状态）
 * 原子组件，无外间距
 *
 * @param {Object} props
 * @param {string} [props.className] - 容器自定义样式
 */
export default function TopicMetaLine({ className }) {
  const { topic } = useTopicContext();

  return (
    <div className={className || 'flex items-center gap-2 text-sm text-muted-foreground/70 flex-wrap'}>
      <Link
        href={`/users/${topic.username}`}
        className='hover:text-foreground transition-colors'
      >
        {topic.userName || topic.username}
      </Link>
      <span className='opacity-70'>
        发布于 <Time date={topic.createdAt} fromNow />
      </span>
      {topic.viewCount > 0 && (
        <>
          <span className='opacity-50'>•</span>
          <span className='opacity-70'>{topic.viewCount} 次浏览</span>
        </>
      )}
      {topic.isClosed && (
        <Lock className='inline-block h-4 w-4 text-muted-foreground -mt-0.5 mr-1' />
      )}
      {topic.approvalStatus === 'pending' && (
        <>
          <span className='opacity-50'>•</span>
          <Badge
            variant='outline'
            className='text-chart-5 border-chart-5 text-xs'
          >
            待审核
          </Badge>
        </>
      )}
      {topic.approvalStatus === 'rejected' && (
        <>
          <span className='opacity-50'>•</span>
          <Badge
            variant='outline'
            className='text-destructive border-destructive text-xs'
          >
            已拒绝
          </Badge>
        </>
      )}
    </div>
  );
}
