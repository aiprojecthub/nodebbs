import { notFound } from 'next/navigation';
import TopicLayout from './components/TopicLayout';
import { getTopicData, getPostsData, getRewardEnabledStatus, getRewardStats } from '@/lib/server/topics';
import { getSiteInfo } from '@/lib/server/layout';

// 生成页面元数据（SEO优化）
export async function generateMetadata({ params }) {
  const { id } = await params;
  const [topic, { siteName, siteUrl, siteLogo }] = await Promise.all([
    getTopicData(id),
    getSiteInfo(),
  ]);

  if (!topic) {
    return {
      title: '话题不存在',
    };
  }

  // 提取纯文本内容作为描述（去除Markdown标记）
  const description =
    topic.content?.replace(/[#*`\[\]]/g, '').substring(0, 160) || '';

  const metadata = {
    title: `${topic.title} - 话题详情`,
    description,
    openGraph: {
      title: topic.title,
      description,
      type: 'article',
      siteName,
      publishedTime: topic.createdAt,
      modifiedTime: topic.updatedAt,
      authors: [topic.userName || topic.username],
    },
    twitter: {
      card: 'summary',
      title: topic.title,
      description,
    },
  };

  // 有 siteUrl 时添加 URL 和图片
  if (siteUrl) {
    const ogImageUrl = siteLogo.startsWith('http') ? siteLogo : `${siteUrl}${siteLogo}`;
    metadata.openGraph.url = `${siteUrl}/topic/${id}`;
    metadata.openGraph.images = [{ url: ogImageUrl, alt: siteName }];
    metadata.twitter.images = [ogImageUrl];
  }

  return metadata;
}

// 主页面组件（服务端组件）
export default async function TopicDetailPage({ params, searchParams }) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const currentPage = parseInt(resolvedSearchParams.p) || 1;
  const LIMIT = 20;

  // 优化：先获取话题数据（利用 Next.js 自动去重与 generateMetadata 的请求）
  const topic = await getTopicData(id);

  // 话题不存在，立即返回 404，避免浪费 posts 请求
  if (!topic) {
    notFound();
  }

  // 优化：并行获取回复数据和积分系统状态
  const [postsData, isRewardEnabled] = await Promise.all([
    getPostsData(id, currentPage, LIMIT),
    getRewardEnabledStatus()
  ]);

  const posts = postsData.items || [];
  const totalPosts = postsData.total || 0;
  const totalPages = Math.ceil(totalPosts / LIMIT);

  // 获取打赏统计（需要 posts 数据，无法并行）
  const initialRewardStats = isRewardEnabled 
    ? await getRewardStats(topic, posts) 
    : {};

  return (
    <TopicLayout
      topic={topic}
      initialPosts={posts}
      totalPosts={totalPosts}
      totalPages={totalPages}
      currentPage={currentPage}
      limit={LIMIT}
      initialRewardStats={initialRewardStats}
      initialIsRewardEnabled={isRewardEnabled}
    />
  );
}

