'use client';

import Link from '@/components/common/Link';
import { Badge } from '@/components/ui/badge';
import { useTopicContext } from '@/contexts/TopicContext';

/**
 * 话题标签列表
 * 原子组件，可用于侧边栏或任意位置
 * 带卡片容器样式（标题 + 标签列表）
 */
export default function TopicTags() {
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
