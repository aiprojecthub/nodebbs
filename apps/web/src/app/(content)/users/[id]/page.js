import { notFound } from 'next/navigation';
import UserLayout from './components/UserLayout';
import { getUserData, getUserTopics, getUserPosts } from '@/lib/server/users';

// 生成页面元数据（SEO优化）
export async function generateMetadata({ params }) {
  const { id } = await params;
  const user = await getUserData(id);

  if (!user) {
    return {
      title: '用户不存在',
    };
  }

  return {
    title: `${user.name || user.username} - 用户主页`,
    description: `查看 ${user.name || user.username} 的个人主页，包括发布的话题和参与的回复。`,
    openGraph: {
      title: `${user.name || user.username} - 用户主页`,
      description: `查看 ${user.name || user.username} 的个人主页`,
      type: 'profile',
    },
  };
}

// 主页面组件（服务端组件）
export default async function UserProfilePage({ params, searchParams }) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const tab = resolvedSearchParams.tab || 'topics';
  const currentPage = parseInt(resolvedSearchParams.page) || 1;
  const LIMIT = 20;

  // 获取用户数据
  const user = await getUserData(id);

  if (!user) {
    notFound();
  }

  // 根据当前标签获取对应数据
  const [topicsData, postsData] = await Promise.all([
    tab === 'topics' ? getUserTopics(user.id, currentPage, LIMIT) : { items: [], total: 0 },
    tab === 'posts' ? getUserPosts(user.id, currentPage, LIMIT) : { items: [], total: 0 },
  ]);

  return (
    <UserLayout
      user={user}
      initialTab={tab}
      initialTopics={topicsData.items}
      initialPosts={postsData.items}
      topicsTotal={topicsData.total}
      postsTotal={postsData.total}
      currentPage={currentPage}
      limit={LIMIT}
    />
  );
}
