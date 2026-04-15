import { TopicList } from '@/components/topic/TopicList';
import { TopicSortTabs } from '@/components/topic/TopicSortTabs';
import { getTemplate } from '@/templates';
import { LAYOUTS } from '@/templates/constants';

export default function CategoryView({ category, sort, data, page, totalPages, limit }) {
  const SidebarLayout = getTemplate(LAYOUTS.SidebarLayout);
  return (
    <SidebarLayout>
      <div className='flex flex-col gap-2 mb-3 px-3 sm:px-0 lg:flex-row lg:items-end lg:justify-between lg:gap-4 lg:mb-4'>
        <div className='pt-3 sm:pt-0'>
          <div className='flex items-center gap-2'>
            <div
              className='w-3 h-3 rounded-sm'
              style={{ backgroundColor: category.color }}
            ></div>
            <h1 className='text-2xl font-semibold'>{category.name}</h1>
          </div>
          {category.description && (
            <p className='text-sm text-muted-foreground mt-1'>
              {category.description}
            </p>
          )}
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
      />
    </SidebarLayout>
  );
}
