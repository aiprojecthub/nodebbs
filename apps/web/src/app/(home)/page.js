import { getTopicsData } from '@/lib/server/topics';
import { TopicList } from '@/components/topic/TopicList';
import { TopicSortTabs } from '@/components/topic/TopicSortTabs';

// 页面标题映射
const PAGE_OPTS = {
  latest: {
    title: '全部话题',
    description: '发现社区中的精彩讨论',
  },
  newest: {
    title: '最新话题',
    description: '浏览最新的社区讨论',
  },
  popular: {
    title: '精华话题',
    description: '高质量的讨论和置顶话题',
  },
  trending: {
    title: '热门话题',
    description: '最受关注的讨论话题',
  },
};

// 生成页面元数据（SEO优化）
export async function generateMetadata({ searchParams }) {
  const resolvedParams = await searchParams;
  const sort = resolvedParams.sort || 'latest';
  const { description, title } = PAGE_OPTS[sort] || PAGE_OPTS.latest;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
  };
}

// 主页面组件（服务端组件）
export default async function HomePage({ searchParams }) {
  const resolvedParams = await searchParams;
  const page = parseInt(resolvedParams.p) || 1;
  const sort = resolvedParams.sort || 'latest';
  const LIMIT = 50;

  const { title, description } = PAGE_OPTS[sort] || PAGE_OPTS.latest;

  // 服务端获取数据
  const data = await getTopicsData({
    page,
    sort,
    limit: LIMIT,
  });

  const totalPages = Math.ceil(data.total / LIMIT);

  return (
    <>
      {/* 页面标题 & 排序切换 */}
      <div className='flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-4'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>{title}</h1>
          <p className='text-muted-foreground mt-1'>{description}</p>
        </div>

        <TopicSortTabs defaultValue={sort} className='w-full sm:w-auto' />
      </div>

      {/* 话题列表（客户端组件） */}
      <TopicList
        initialData={data.items}
        total={data.total}
        currentPage={page}
        totalPages={totalPages}
        limit={LIMIT}
        showPagination={true}

        useUrlPagination={true}
      />
    </>
  );
}
