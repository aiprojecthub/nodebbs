'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from '@/components/common/Link';
import { Button } from '@/components/ui/button';
import { userApi } from '@/lib/api';
import { Loader2, ArrowLeft, Users } from 'lucide-react';
import UserAvatar from '@/components/user/UserAvatar';

export default function FollowersPage() {
  const params = useParams();
  const username = params.id;

  const [user, setUser] = useState(null);
  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetchData();
  }, [username, page]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [userData, followersData] = await Promise.all([
        userApi.getProfile(username),
        userApi.getFollowers(username, page, limit),
      ]);

      setUser(userData);
      setFollowers(followersData.items || []);
      setTotal(followersData.total || 0);
    } catch (error) {
      console.error('获取粉丝列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  if (loading && !user) {
    return (
      <div className='container mx-auto px-4 py-8 flex items-center justify-center'>
        <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
      </div>
    );
  }

  return (
    <div className='container mx-auto px-4 py-8'>
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
            {user?.name || user?.username} 的粉丝
          </h1>
          <p className='text-muted-foreground'>
            共 {total} 位粉丝
          </p>
        </div>

        {/* 粉丝列表 */}
        {loading ? (
          <div className='flex items-center justify-center py-12'>
            <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
          </div>
        ) : followers.length === 0 ? (
          <div className='text-center py-12 bg-card border border-border rounded-lg'>
            <Users className='h-12 w-12 text-muted-foreground/50 mx-auto mb-4' />
            <p className='text-muted-foreground'>还没有粉丝</p>
          </div>
        ) : (
          <>
            <div className='bg-card border border-border rounded-lg divide-y divide-border'>
              {followers.map((follower) => (
                <Link
                  key={follower.id}
                  href={`/users/${follower.username}`}
                  className='flex items-center gap-4 p-4 hover:bg-accent transition-colors'
                >
                  <UserAvatar
                    url={follower.avatar}
                    name={follower.username}
                    size='lg'
                  />
                  <div className='flex-1 min-w-0'>
                    <div className='font-semibold text-foreground'>
                      {follower.name || follower.username}
                    </div>
                    <div className='text-sm text-muted-foreground'>
                      @{follower.username}
                    </div>
                    {follower.bio && (
                      <div className='text-sm text-muted-foreground line-clamp-1 mt-1'>
                        {follower.bio}
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
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  上一页
                </Button>
                <span className='text-sm text-muted-foreground'>
                  第 {page} / {totalPages} 页
                </span>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  下一页
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
