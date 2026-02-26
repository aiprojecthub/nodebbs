import { TopicList } from '@/components/topic/TopicList';

/**
 * 话题搜索结果 Tab 组件
 */
export function SearchTopicsTab({ loading, results, onLoadPage }) {
  const { items, total, page, limit } = results;
  const totalPages = Math.ceil(total / limit);

  return (
    <TopicList
      data={items}
      loading={loading}
      error={null}
      total={total}
      page={page}
      totalPages={totalPages}
      limit={limit}
      showPagination={total > limit}
      onPageChange={(p) => onLoadPage('topics', p)}
    />
  );
}
