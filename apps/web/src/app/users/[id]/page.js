import { notFound } from 'next/navigation';
import UserContentGuard from '@/components/user/UserContentGuard';
import { UserActivityTabsServer } from '@/components/user/UserActivityTabs';
import UserProfileSidebar from '@/components/user/UserProfileSidebar';
import { request } from '@/lib/server/api';

// 服务端获取用户数据
async function getUserData(username) {
  try {
    return await request(`/users/${username}`);
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

// 服务端获取用户话题列表
async function getUserTopics(userId, page = 1, limit = 20) {
  try {
    const params = new URLSearchParams({
      userId: userId.toString(),
      page: page.toString(),
      limit: limit.toString(),
    });
    return await request(`/topics?${params}`);
  } catch (error) {
    console.error('Error fetching topics:', error);
    return { items: [], total: 0 };
  }
}

// 服务端获取用户回复列表
async function getUserPosts(userId, page = 1, limit = 20) {
  try {
    const params = new URLSearchParams({
      userId: userId.toString(),
      page: page.toString(),
      limit: limit.toString(),
    });
    return await request(`/posts?${params}`);
  } catch (error) {
    console.error('Error fetching posts:', error);
    return { items: [], total: 0 };
  }
}

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

export default async function UserProfile({ params, searchParams }) {
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
    <div className='container mx-auto px-4 py-6 flex-1'>
      <div className='flex flex-col lg:flex-row gap-6'>
        {/* 左侧：用户信息侧边栏 */}
        <UserProfileSidebar user={user} />

        {/* 右侧：用户活动 */}
        <main className='flex-1 min-w-0'>
          <UserContentGuard user={user}>
            <UserActivityTabsServer
              user={user}
              initialTab={tab}
              initialTopics={topicsData.items}
              initialPosts={postsData.items}
              topicsTotal={topicsData.total}
              postsTotal={postsData.total}
              currentPage={currentPage}
              limit={LIMIT}
            />
          </UserContentGuard>
        </main>
      </div>
    </div>
  );
}
