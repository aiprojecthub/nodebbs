'use client';

import Link from '@/components/common/Link';
import { Badge } from '@/components/ui/badge';
import { useTopicContext } from '@/contexts/TopicContext';

/**
 * 话题元信息组件
 * 展示标签
 */
export default function TopicMeta() {
  const { topic } = useTopicContext();

  if (!topic.tags || topic.tags.length === 0) {
    return null;
  }

  return (
    <div className='border border-border rounded-lg bg-card'>
      <div className='px-3 py-2 border-b border-border'>
        <h3 className='text-sm font-semibold'>标签</h3>
      </div>
      <div className='p-3 flex flex-wrap gap-2'>
        {topic.tags.map((tag) => (
          <Link key={tag.id} href={`/tags/${tag.slug}`}>
            <Badge variant="secondary" className="hover:bg-secondary/80 transition-colors cursor-pointer">
              {tag.name}
            </Badge>
          </Link>
        ))}
      </div>
    </div>
  );
}
