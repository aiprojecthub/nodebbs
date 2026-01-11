'use client';

import { useState, useEffect } from 'react';
import Link from '@/components/common/Link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldOff, UserX, Loader2, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { blockedUsersApi } from '@/lib/api';
import { toast } from 'sonner';
import UserAvatar from '@/components/user/UserAvatar';
import Time from '@/components/common/Time';
import { Loading } from '@/components/common/Loading';
import { Pager } from '@/components/common/Pagination';

export default function BlockedUsersPage() {
  const { user } = useAuth();
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [unblockingUserId, setUnblockingUserId] = useState(null);

  useEffect(() => {
    if (user) {
      fetchBlockedUsers();
    }
  }, [user, page, pageSize]);

  const fetchBlockedUsers = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await blockedUsersApi.getList(page, pageSize);
      setBlockedUsers(response.items || []);
      setTotal(response.total || 0);
    } catch (err) {
      console.error('获取拉黑列表失败:', err);
      setError(err.message);
      toast.error('获取拉黑列表失败：' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (userId, username) => {
    if (!confirm(`确定要取消拉黑 ${username} 吗？`)) {
      return;
    }

    setUnblockingUserId(userId);

    try {
      await blockedUsersApi.unblock(userId);
      toast.success(`已取消拉黑 ${username}`);

      // 从列表中移除
      setBlockedUsers((prev) => prev.filter((u) => u.blockedUserId !== userId));
    } catch (err) {
      console.error('取消拉黑失败:', err);
      toast.error('取消拉黑失败：' + err.message);
    } finally {
      setUnblockingUserId(null);
    }
  };

  // 加载状态
  if (loading) {
    return <Loading text='加载中...' className='py-12' />;
  }

  // 错误状态
  if (error) {
    return (
      <div className='bg-card border border-border rounded-lg p-12 text-center'>
        <ShieldOff className='h-12 w-12 text-destructive mx-auto mb-4' />
        <h3 className='text-lg font-medium text-card-foreground mb-2'>
          加载失败
        </h3>
        <p className='text-muted-foreground mb-4'>{error}</p>
        <Button onClick={fetchBlockedUsers}>重试</Button>
      </div>
    );
  }

  return (
    <div>
      <div className='mb-6'>
        <div className='flex items-center justify-between mb-4'>
          <div>
            <h1 className='text-2xl font-bold text-card-foreground mb-2'>
              拉黑用户
            </h1>
            <p className='text-muted-foreground'>
              管理你拉黑的用户，拉黑后将无法互相发送站内信
            </p>
          </div>
          {!loading && total > 0 && (
            <Badge variant='secondary' className='flex items-center space-x-1'>
              <ShieldOff className='h-3 w-3' />
              <span>{total} 个用户</span>
            </Badge>
          )}
        </div>
      </div>

      {/* 拉黑用户列表 */}
      {blockedUsers.length > 0 ? (
        <>
          <div className='bg-card border border-border rounded-lg divide-y divide-border'>
            {blockedUsers.map((blockedUser) => (
              <div
                key={blockedUser.id}
                className='p-4 hover:bg-accent/50 transition-colors'
              >
                <div className='flex items-center justify-between'>
                  <div className='flex items-center space-x-3 flex-1 min-w-0'>
                    {/* 用户头像 */}
                    <Link href={`/users/${blockedUser.blockedUsername}`}>
                      <UserAvatar
                        url={blockedUser.blockedAvatar}
                        name={blockedUser.blockedUsername}
                        size='lg'
                      />
                    </Link>

                    {/* 用户信息 */}
                    <div className='flex-1 min-w-0'>
                      <Link
                        href={`/users/${blockedUser.blockedUsername}`}
                        className='group'
                      >
                        <div className='flex items-center space-x-2 mb-1'>
                          <span className='text-sm font-semibold text-foreground group-hover:text-primary transition-colors'>
                            {blockedUser.blockedName ||
                              blockedUser.blockedUsername}
                          </span>
                          <span className='text-xs text-muted-foreground'>
                            @{blockedUser.blockedUsername}
                          </span>
                        </div>
                      </Link>

                      <div className='flex items-center space-x-3 text-xs text-muted-foreground'>
                        <span>拉黑于 <Time date={blockedUser.createdAt} fromNow /></span>
                        {blockedUser.reason && (
                          <>
                            <span>•</span>
                            <span className='truncate'>
                              原因: {blockedUser.reason}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 取消拉黑按钮 */}
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() =>
                      handleUnblock(
                        blockedUser.blockedUserId,
                        blockedUser.blockedName || blockedUser.blockedUsername
                      )
                    }
                    disabled={unblockingUserId === blockedUser.blockedUserId}
                    className='shrink-0 ml-4'
                  >
                    {unblockingUserId === blockedUser.blockedUserId ? (
                      <>
                        <Loader2 className='h-4 w-4 animate-spin' />
                        取消中...
                      </>
                    ) : (
                      <>
                        <Trash2 className='h-4 w-4' />
                        取消拉黑
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* 分页 */}
          {total > pageSize && (
            <Pager
              total={total}
              page={page}
              pageSize={pageSize}
              onPageChange={(newPage) => setPage(newPage)}
              // onPageSizeChange={(newSize) => {
              //   setPageSize(newSize);
              //   setPage(1);
              // }}
            />
          )}
        </>
      ) : (
        <div className='bg-card border border-border rounded-lg p-12 text-center'>
          <UserX className='h-12 w-12 text-muted-foreground/50 mx-auto mb-4' />
          <h3 className='text-lg font-medium text-card-foreground mb-2'>
            暂无拉黑用户
          </h3>
          <p className='text-muted-foreground'>你还没有拉黑任何用户</p>
        </div>
      )}
    </div>
  );
}
