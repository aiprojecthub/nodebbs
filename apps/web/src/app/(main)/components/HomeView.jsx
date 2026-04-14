import { TopicList } from '@/components/topic/TopicList';
import { TopicSortTabs } from '@/components/topic/TopicSortTabs';
import { AdSlot } from '@/extensions/ads/components';
import SidebarLayout from './SidebarLayout';

export default function HomeView({ title, description, sort, data, page, totalPages, limit }) {
  return (
    <SidebarLayout>
      <div className='flex flex-col gap-2 px-3 sm:px-0 lg:flex-row lg:items-end lg:justify-between lg:gap-4'>
        <div>
          <h1 className='text-2xl sm:text-3xl font-semibold tracking-tight'>{title}</h1>
          <p className='text-muted-foreground mt-1'>{description}</p>
        </div>

        <TopicSortTabs defaultValue={sort} className='w-auto' />
      </div>
      <TopicList
        initialData={data.items}
        total={data.total}
        currentPage={page}
        totalPages={totalPages}
        limit={limit}
        showPagination={true}
        useUrlPagination={true}
        itemInserts={{
          4: <AdSlot key='ad-topic-inline' slotCode='topic_list_inline' className='p-3 rounded-none' />
        }}
      />
    </SidebarLayout>
  );
}
