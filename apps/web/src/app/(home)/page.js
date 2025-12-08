import { getTopicsData } from '@/lib/server/topics';
import { TopicListClient } from '@/components/forum/TopicList';

// 生成页面元数据（SEO优化）
export async function generateMetadata({ searchParams }) {
  const description = `浏览社区中的最新话题，发现精彩讨论`;

  return {
    description,
    openGraph: {
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
  const categoryId = resolvedParams.category;
  const LIMIT = 20;

  // 服务端获取数据
  const data = await getTopicsData({
    page,
    sort,
    categoryId,
    limit: LIMIT,
  });

  const totalPages = Math.ceil(data.total / LIMIT);

  return (
    <>
      {/* 页面标题 */}
      <div className='mb-4'>
        <h1 className='text-2xl font-semibold mb-2'>全部话题</h1>
        <p className='text-sm text-muted-foreground'>发现社区中的精彩讨论</p>
      </div>

      {/* 话题列表（客户端组件） */}
      <TopicListClient
        initialTopics={data.items}
        totalTopics={data.total}
        currentPage={page}
        totalPages={totalPages}
        limit={LIMIT}
        showPagination={true}
        showHeader={true}
      />
    </>
  );
}
