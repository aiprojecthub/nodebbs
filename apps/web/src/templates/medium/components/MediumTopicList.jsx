'use client';

import { Fragment } from 'react';
import { Pager } from '@/components/common/Pagination';
import TopicCard from './TopicCard';
import { BookOpen } from 'lucide-react';
import Link from '@/components/common/Link';
import { Button } from '@/components/ui/button';

function EmptyState() {
  return (
    <div className='text-center py-20'>
      <BookOpen className='h-10 w-10 text-muted-foreground/30 mx-auto mb-4' />
      <div className='text-lg font-semibold mb-1' style={{ fontFamily: 'var(--font-serif)' }}>暂无文章</div>
      <p className='text-sm text-muted-foreground mb-6'>还没有人发布内容，成为第一个作者吧</p>
      <Link href='/create'>
        <Button variant='outline' className='rounded-full'>开始写作</Button>
      </Link>
    </div>
  );
}

/**
 * Medium 模板话题列表 — 作为 TopicList 的 component prop
 */
export default function MediumTopicList({
  topics,
  totalTopics,
  currentPage,
  totalPages,
  limit,
  showPagination,
  onPageChange,
  itemInserts,
}) {
  if (topics.length === 0) {
    return <EmptyState />;
  }

  return (
    <>
      <div>
        {topics.map((topic, index) => (
          <Fragment key={topic.id}>
            <TopicCard topic={topic} />
            {itemInserts?.[index]}
          </Fragment>
        ))}
      </div>

      {showPagination && totalPages > 1 && (
        <div className='py-6'>
          <Pager
            total={totalTopics}
            page={currentPage}
            pageSize={limit}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </>
  );
}
