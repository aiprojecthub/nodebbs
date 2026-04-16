import { TopicList } from '@/components/topic/TopicList';
import { TopicSortTabs } from '@/components/topic/TopicSortTabs';
import { getTemplate } from '@/templates';
import { LAYOUTS } from '@/templates/constants';
import MediumTopicList from '../components/MediumTopicList';

export default function CategoryView({ category, sort, data, page, totalPages, limit }) {
  const SidebarLayout = getTemplate(LAYOUTS.SidebarLayout);

  return (
    <SidebarLayout>
      <div>
        <div className='mb-6 pb-6 border-b border-border'>
          <div className='flex items-center gap-3 mb-3'>
            <div className='w-3 h-3 rounded-sm' style={{ backgroundColor: category.color }} />
            <h1 className='text-2xl font-bold' style={{ fontFamily: 'var(--font-serif)' }}>
              {category.name}
            </h1>
          </div>
          {category.description && (
            <p className='text-muted-foreground text-[15px] mb-4'>{category.description}</p>
          )}
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
