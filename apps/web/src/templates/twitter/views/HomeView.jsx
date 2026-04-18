import { TopicList } from '@/components/topic/TopicList';
import { TopicSortTabs } from '@/components/topic/TopicSortTabs';
import { AdSlot } from '@/extensions/ads/components';
import { getTemplate } from '@/templates';
import { LAYOUTS } from '@/templates/constants';
import StickyHeader from '../components/StickyHeader';
import TwitterTopicList from '../components/TwitterTopicList';

export default function HomeView({ title, description, sort, data, page, totalPages, limit }) {
  const SidebarLayout = getTemplate(LAYOUTS.SidebarLayout);

  return (
    <SidebarLayout>
      <div>
        <StickyHeader title={title} showBack={false}>
          <TopicSortTabs defaultValue={sort} className='w-full' />
        </StickyHeader>
        <TopicList
          initialData={data.items}
          total={data.total}
          currentPage={page}
          totalPages={totalPages}
          limit={limit}
          showPagination={true}
          useUrlPagination={true}
          component={TwitterTopicList}
          itemInserts={{
            4: <AdSlot key='ad-topic-inline' slotCode='topic_list_inline' />
          }}
        />
      </div>
    </SidebarLayout>
  );
}
