import { getTopicsData } from '@/lib/server/topics';
import { TopicList } from '@/components/topic/TopicList';
import { request } from '@/lib/server/api';
import { Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { TopicSortTabs } from '@/components/topic/TopicSortTabs';

// 服务端获取标签信息
async function getTagData(slug) {
  try {
    const data = await request(`/tags/${slug}`);
    return data;
  } catch (error) {
    console.error('Error fetching tag:', error);
    return null;
  }
}

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

  // 并行获取标签信息和话题列表
  const [tag, topicsData] = await Promise.all([
    getTagData(slug),
    getTopicsData({
      page,
      sort,
      limit: LIMIT,
      tag: slug, // 传递标签 slug 给 API
    }),
  ]);

  if (!tag) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
        <Tag className="h-12 w-12 mb-4 opacity-20" />
        <h2 className="text-xl font-semibold mb-2">标签不存在</h2>
        <p>该标签可能已被删除或从未存在</p>
      </div>
    );
  }

  const totalPages = Math.ceil(topicsData.total / LIMIT);

  return (
    <div className='container mx-auto px-4 py-6 flex-1'>
      <div className="mb-8 p-6 bg-card rounded-lg border border-border">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Tag className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              {tag.name}
              <Badge variant="secondary" className="text-sm font-normal">
                {topicsData.total} 个话题
              </Badge>
            </h1>
            {tag.description && (
              <p className="mt-2 text-muted-foreground">{tag.description}</p>
            )}
            <div className="mt-4 flex gap-2">
                 <Badge 
                    style={{backgroundColor: tag.color, color: '#fff'}}
                    className="hover:opacity-90"
                 >
                    #{tag.slug}
                 </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end mb-4">
        <TopicSortTabs defaultValue={sort} className='w-full sm:w-auto' />
      </div>

      <TopicList
        initialData={topicsData.items}
        total={topicsData.total}
        currentPage={page}
        totalPages={totalPages}
        limit={LIMIT}
        showPagination={true}
        useUrlPagination={true}
      />
    </div>
  );
}
