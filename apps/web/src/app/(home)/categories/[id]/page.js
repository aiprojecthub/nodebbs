import { notFound } from 'next/navigation';
import { getCategoryBySlug, getTopicsData } from '@/lib/server/topics';
import { TopicList } from '@/components/topic/TopicList';
import { TopicSortTabs } from '@/components/topic/TopicSortTabs';

// 生成页面元数据
export async function generateMetadata({ params }) {
  const { id: slug } = await params;
  const category = await getCategoryBySlug(slug);

  if (!category) {
    return {
      title: '分类不存在',
    };
  }

  return {
    title: `${category.name}`,
    description: category.description || `浏览${category.name}分类下的所有话题`,
    openGraph: {
      title: category.name,
      description: category.description || `浏览${category.name}分类下的所有话题`,
      type: 'website',
    },
  };
}

export default async function CategoryPage({ params, searchParams }) {
  const { id: slug } = await params;
  const resolvedParams = await searchParams;
  const page = parseInt(resolvedParams.p) || 1;
  const sort = resolvedParams.sort || 'latest';
  const LIMIT = 20;

  // 服务端获取分类信息
  const category = await getCategoryBySlug(slug);

  // 分类不存在
  if (!category) {
    notFound();
  }

  // 服务端获取话题数据
  const data = await getTopicsData({
    page,
    sort,
    categoryId: category.id,
    limit: LIMIT,
  });

  const totalPages = Math.ceil(data.total / LIMIT);

  return (
    <>
      {/* 分类标题 & 排序切换 */}
      <div className='flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-4'>
        <div>
          <div className='flex items-center gap-2 mb-2'>
            <div
              className='w-3 h-3 rounded-sm'
              style={{ backgroundColor: category.color }}
            ></div>
            <h1 className='text-2xl font-semibold'>{category.name}</h1>
          </div>
          {category.description && (
            <p className='text-sm text-muted-foreground'>
              {category.description}
            </p>
          )}
        </div>

        <TopicSortTabs defaultValue={sort} className='w-full sm:w-auto' />
      </div>

      {/* 话题列表 */}
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
