'use client';

import Link from '@/components/common/Link';
import { Badge } from '@/components/ui/badge';
import { useTopicContext } from '@/contexts/TopicContext';

/**
 * 话题标签列表
 * 原子组件，无容器包装，无外间距
 *
 * @param {Object} props
 * @param {string} [props.variant] - 'card'(带卡片壳，默认) | 'inline'(纯标签列表)
 */
export default function TopicTags({ variant = 'card' }) {
  const { topic } = useTopicContext();

  if (!topic.tags || topic.tags.length === 0) {
    return null;
  }

  const tagList = (
    <div className='flex flex-wrap gap-2'>
      {topic.tags.map((tag) => (
        <Link key={tag.id} href={`/tags/${tag.slug}`}>
          <Badge variant="secondary" className="hover:bg-secondary/80 transition-colors cursor-pointer">
            {tag.name}
          </Badge>
        </Link>
      ))}
    </div>
  );

  if (variant === 'inline') {
    return tagList;
  }

  return (
    <div className='card-base'>
      <div className='px-3 py-2 border-b border-border'>
        <h3 className='text-sm font-semibold'>标签</h3>
      </div>
      <div className='p-3'>
        {tagList}
      </div>
    </div>
  );
}
