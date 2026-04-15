import { getTopicsData } from '@/lib/server/topics';
import { getTemplate } from '@/templates';
import { VIEWS } from '@/templates/constants';

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
  const { title } = PAGE_OPTS[sort] || PAGE_OPTS.latest;

  return {
    openGraph: {
      title,
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

  const data = await getTopicsData({
    page,
    sort,
    limit: LIMIT,
  });

  const totalPages = Math.ceil(data.total / LIMIT);

  const HomeView = getTemplate(VIEWS.HomeView);

  return (
    <HomeView
      title={title}
      description={description}
      sort={sort}
      data={data}
      page={page}
      totalPages={totalPages}
      limit={LIMIT}
    />
  );
}
