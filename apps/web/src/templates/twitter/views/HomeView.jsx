import { TopicSortTabs } from '@/components/topic/TopicSortTabs';
import { Pager } from '@/components/common/Pagination';
import { getTemplate } from '@/templates';
import { LAYOUTS } from '@/templates/constants';
import TimelineItem from '../components/TimelineItem';
import EmptyTimeline from '../components/EmptyTimeline';

export default function HomeView({ title, description, sort, data, page, totalPages, limit }) {
  const SidebarLayout = getTemplate(LAYOUTS.SidebarLayout);
  return (
    <SidebarLayout>
      <div>
        <div className='sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border'>
          <div className='px-4 pt-3 pb-0'>
            <h1 className='text-xl font-bold'>{title}</h1>
          </div>
          <div className='mt-2'>
            <TopicSortTabs defaultValue={sort} className='w-full' />
          </div>
        </div>

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
    </SidebarLayout>
  );
}
