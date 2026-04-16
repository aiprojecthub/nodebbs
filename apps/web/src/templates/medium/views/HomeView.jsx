import { TopicList } from '@/components/topic/TopicList';
import { TopicSortTabs } from '@/components/topic/TopicSortTabs';
import { getTemplate } from '@/templates';
import { LAYOUTS } from '@/templates/constants';
import MediumTopicList from '../components/MediumTopicList';

export default function HomeView({ title, description, sort, data, page, totalPages, limit }) {
  const SidebarLayout = getTemplate(LAYOUTS.SidebarLayout);

  return (
    <SidebarLayout>
      <div>
        <div className='mb-6 pb-6 border-b border-border'>
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
          component={MediumTopicList}
        />
      </div>
    </SidebarLayout>
  );
}
