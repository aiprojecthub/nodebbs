import { TopicList } from '@/components/topic/TopicList';
import { TopicSortTabs } from '@/components/topic/TopicSortTabs';
import { Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getTemplate } from '@/templates';
import { LAYOUTS } from '@/templates/constants';

export default function TagView({ tag, sort, data, page, totalPages, limit }) {
  const SidebarLayout = getTemplate(LAYOUTS.SidebarLayout);
  return (
    <SidebarLayout>
      <div className="mb-4 sm:mb-8 p-4 sm:p-6 content-card">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Tag className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              {tag.name}
              <Badge variant="secondary" className="text-sm font-normal">
                {data.total} 个话题
              </Badge>
            </h1>
            {tag.description && (
              <p className="mt-2 text-muted-foreground">{tag.description}</p>
            )}
          </div>
        </div>
      </div>
      <div className="flex justify-end mb-4 px-3 sm:px-0">
        <TopicSortTabs defaultValue={sort} className='w-full sm:w-auto' />
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
