import { notFound } from 'next/navigation';
import Link from '@/components/common/Link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users } from 'lucide-react';
import UserAvatar from '@/components/user/UserAvatar';
import { getUserData, getUserFollowing } from '@/lib/server/users';

export async function generateMetadata({ params }) {
  const { id } = await params;
  const user = await getUserData(id);

  if (!user) {
    return { title: '用户不存在' };
  }

  return {
    title: `${user.name || user.username} 关注的用户`,
    description: `查看 ${user.name || user.username} 的关注列表。`,
  };
}

export default async function FollowingPage({ params, searchParams }) {
  const { id: username } = await params;
  const resolvedSearchParams = await searchParams;
  const page = parseInt(resolvedSearchParams.page) || 1;
  const limit = 20;

  const [user, followingData] = await Promise.all([
    getUserData(username),
    getUserFollowing(username, page, limit),
  ]);

  if (!user) {
    notFound();
  }

  const following = followingData.items || [];
  const total = followingData.total || 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className='px-4 py-8'>
      <div className='max-w-3xl mx-auto'>
        {/* 返回按钮 */}
        <Link
          href={`/users/${username}`}
          className='inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6'
        >
          <ArrowLeft className='h-4 w-4 mr-1' />
          返回个人主页
        </Link>

        {/* 标题 */}
        <div className='mb-6'>
          <h1 className='text-2xl font-bold mb-2'>
            {user.name || user.username} 关注的用户
          </h1>
          <p className='text-muted-foreground'>
            共关注 {total} 位用户
          </p>
        </div>

        {/* 关注列表 */}
        {following.length === 0 ? (
          <div className='text-center py-12 bg-card border border-border rounded-lg'>
            <Users className='h-12 w-12 text-muted-foreground/50 mx-auto mb-4' />
            <p className='text-muted-foreground'>还没有关注任何用户</p>
          </div>
        ) : (
          <>
            <div className='bg-card border border-border rounded-lg divide-y divide-border'>
              {following.map((user) => (
                <Link
                  key={user.id}
                  href={`/users/${user.username}`}
                  className='flex items-center gap-4 p-4 hover:bg-accent transition-colors'
                >
                  <UserAvatar
                    url={user.avatar}
                    name={user.name || user.username}
                    size='lg'
                  />
                  <div className='flex-1 min-w-0'>
                    <div className='font-semibold text-foreground'>
                      {user.name || user.username}
                    </div>
                    <div className='text-sm text-muted-foreground'>
                      @{user.username}
                    </div>
                    {user.bio && (
                      <div className='text-sm text-muted-foreground line-clamp-1 mt-1'>
                        {user.bio}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className='flex items-center justify-center gap-2 mt-6'>
                <Button
                  variant='outline'
                  size='sm'
                  asChild
                  disabled={page === 1}
                >
                  <Link href={`/users/${username}/following?page=${page - 1}`}>
                    上一页
                  </Link>
                </Button>
                <span className='text-sm text-muted-foreground'>
                  第 {page} / {totalPages} 页
                </span>
                <Button
                  variant='outline'
                  size='sm'
                  asChild
                  disabled={page === totalPages}
                >
                  <Link href={`/users/${username}/following?page=${page + 1}`}>
                    下一页
                  </Link>
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
