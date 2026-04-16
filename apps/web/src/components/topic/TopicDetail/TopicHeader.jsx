'use client';

import Link from '@/components/common/Link';
import { useTopicContext } from '@/contexts/TopicContext';

/**
 * 话题标题区域（分类链接 + 标题）
 * 原子组件，无外间距
 *
 * @param {Object} props
 * @param {string} [props.className] - 标题自定义样式（覆盖默认字号/字体）
 */
export default function TopicHeader({ className }) {
  const { topic } = useTopicContext();

  return (
    <div className='flex items-start'>
      <div className='flex-1 min-w-0'>
        {topic.categoryName && (
          <Link
            href={`/categories/${topic.categorySlug}`}
            className='inline-flex items-center gap-1.5 text-sm font-medium hover:opacity-80 transition-opacity'
            style={{ color: topic.categoryColor }}
          >
            <span
              className='w-2.5 h-2.5 rounded-sm shrink-0'
              style={{ backgroundColor: topic.categoryColor }}
            />
            {topic.categoryName}
          </Link>
        )}

        <h1 className={className || 'text-2xl sm:text-3xl font-semibold leading-tight text-foreground break-all'}>
          {topic.title}
        </h1>
      </div>
    </div>
  );
}
