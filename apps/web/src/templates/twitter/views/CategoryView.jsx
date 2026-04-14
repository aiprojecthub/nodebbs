import { TopicSortTabs } from '@/components/topic/TopicSortTabs';
import { Pager } from '@/components/common/Pagination';
import StickyHeader from '../components/StickyHeader';
import TimelineItem from '../components/TimelineItem';
import EmptyTimeline from '../components/EmptyTimeline';

export default function CategoryView({ category, sort, data, page, totalPages, limit }) {
  return (
    <div>
      <StickyHeader
        title={category.name}
        subtitle={`${data.total} 个话题`}
      />

      <TopicSortTabs defaultValue={sort} className='w-full' />

      {data.items?.length > 0 ? (
        <>
          <div>
            {data.items.map((topic) => (
              <TimelineItem key={topic.id} topic={topic} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className='py-4'>
              <Pager total={data.total} page={page} pageSize={limit} />
            </div>
          )}
        </>
      ) : (
        <EmptyTimeline />
      )}
    </div>
  );
}
