import { getTopicsData, getTagData } from '@/lib/server/topics';
import { getTemplate } from '@/templates';

// 生成页面元数据
export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const tag = await getTagData(resolvedParams.slug);

  if (!tag) {
    return {
      title: '标签不存在',
    };
  }

  return {
    title: `${tag.name} - 话题标签`,
    description: tag.description || `查看所有关于 ${tag.name} 的话题讨论`,
  };
}

export default async function TagTopicListPage({ params, searchParams }) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const page = parseInt(resolvedSearchParams.p) || 1;
  const sort = resolvedSearchParams.sort || 'latest';
  const LIMIT = 50;
  const slug = resolvedParams.slug;

  const [tag, data] = await Promise.all([
    getTagData(slug),
    getTopicsData({
      page,
      sort,
      limit: LIMIT,
      tag: slug,
    }),
  ]);

  if (!tag) {
    const TagNotFoundView = getTemplate('TagNotFoundView');
    return <TagNotFoundView />;
  }

  const totalPages = Math.ceil(data.total / LIMIT);
  const TagView = getTemplate('TagView');

  return (
    <TagView
      tag={tag}
      sort={sort}
      data={data}
      page={page}
      totalPages={totalPages}
      limit={LIMIT}
    />
  );
}
