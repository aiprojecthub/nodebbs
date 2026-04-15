import { notFound } from 'next/navigation';
import { getCategoryBySlug, getTopicsData } from '@/lib/server/topics';
import { getTemplate } from '@/templates';
import { VIEWS } from '@/templates/constants';

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

  const category = await getCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  const data = await getTopicsData({
    page,
    sort,
    categoryId: category.id,
    limit: LIMIT,
  });

  const totalPages = Math.ceil(data.total / LIMIT);

  const CategoryView = getTemplate(VIEWS.CategoryView);

  return (
    <CategoryView
      category={category}
      sort={sort}
      data={data}
      page={page}
      totalPages={totalPages}
      limit={LIMIT}
    />
  );
}
