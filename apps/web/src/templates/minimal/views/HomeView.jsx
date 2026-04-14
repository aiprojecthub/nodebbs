import { TopicList } from '@/components/topic/TopicList';

export default function HomeView({ title, description, sort, data, page, totalPages, limit }) {
  return (
    <div className='space-y-4'>
      <div className='px-3 sm:px-0'>
        <h1 className='text-xl font-medium'>{title}</h1>
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
    </div>
  );
}
