import { TopicList } from '@/components/topic/TopicList';
import { TopicSortTabs } from '@/components/topic/TopicSortTabs';
import { Badge } from '@/components/ui/badge';
import { getTemplate } from '@/templates';
import { LAYOUTS } from '@/templates/constants';
import MediumTopicList from '../components/MediumTopicList';

export default function TagView({ tag, sort, data, page, totalPages, limit }) {
  const SidebarLayout = getTemplate(LAYOUTS.SidebarLayout);

  return (
    <SidebarLayout>
      <div>
        <div className='mb-6 pb-6 border-b border-border'>
          <div className='flex items-center gap-3 mb-3'>
            <h1 className='text-2xl font-bold' style={{ fontFamily: 'var(--font-serif)' }}>
              #{tag.name}
            </h1>
            <Badge variant='secondary' className='text-xs font-normal rounded-full'>
              {data.total} 篇文章
            </Badge>
          </div>
          {tag.description && (
            <p className='text-muted-foreground text-[15px] mb-4'>{tag.description}</p>
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
