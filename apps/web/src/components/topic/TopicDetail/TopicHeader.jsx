'use client';

import Link from '@/components/common/Link';
import { Badge } from '@/components/ui/badge';
import { Lock } from 'lucide-react';
import { useTopicContext } from '@/contexts/TopicContext';

/**
 * 话题标题区域（分类链接 + 标题 + 状态标记）
 * 原子组件，无外层布局样式
 */
export default function TopicHeader() {
  const { topic } = useTopicContext();

  return (
    <div className='flex items-start'>
      <div className='flex-1 min-w-0'>
        {/* 分类 */}
        {topic.categoryName && (
          <Link
            href={`/categories/${topic.categorySlug}`}
            className='inline-flex items-center gap-1.5 text-sm font-medium mb-2 hover:opacity-80 transition-opacity'
            style={{ color: topic.categoryColor }}
          >
            <span
              className='w-2.5 h-2.5 rounded-sm shrink-0'
              style={{ backgroundColor: topic.categoryColor }}
            />
            {topic.categoryName}
          </Link>
        )}

        <h1 className='text-2xl sm:text-3xl font-semibold mb-3 leading-tight text-foreground break-all'>
          {topic.title}
        </h1>
      </div>
    </div>
  );
}
