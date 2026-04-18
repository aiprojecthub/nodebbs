import { TopicList } from '@/components/topic/TopicList';
import { TopicSortTabs } from '@/components/topic/TopicSortTabs';
import StickyHeader from './StickyHeader';
import TwitterTopicList from './TwitterTopicList';

/**
 * Twitter 模板 — 通用话题列表页
 * 统一 StickyHeader + TopicSortTabs + TopicList 的组合
 * 由 CategoryView / TagView 等页面委托使用
 *
 * @param {Object} props
 * @param {string} props.title - 页面标题
 * @param {string} [props.subtitle] - 副标题
 * @param {boolean} [props.showBack] - 是否显示返回按钮
 * @param {string} props.sort - 排序方式
 * @param {Object} props.data - { items, total }
 * @param {number} props.page - 当前页码
 * @param {number} props.totalPages - 总页数
 * @param {number} props.limit - 每页数量
 */
export default function TopicListView({
  title,
  subtitle,
  showBack = true,
  sort,
  data,
  page,
  totalPages,
  limit,
}) {
  return (
    <div>
      <StickyHeader title={title} subtitle={subtitle} showBack={showBack}>
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
      />
    </div>
  );
}
