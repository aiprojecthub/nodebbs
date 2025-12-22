'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  CheckCheck,
  Trash2,
  Loader2,
} from 'lucide-react';
import { getNotificationIcon, getNotificationMessage } from '@/lib/notification';
import { useAuth } from '@/contexts/AuthContext';
import { notificationApi } from '@/lib/api';
import { toast } from 'sonner';
import UserAvatar from '@/components/user/UserAvatar';
import Time from '@/components/common/Time';
import { Loading } from '@/components/common/Loading';
import { Pager } from '@/components/common/Pagination';

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'read'
  const [actionLoading, setActionLoading] = useState(null); // Track which action is loading

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user, page, pageSize, filter]);

  const fetchNotifications = async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const unreadOnly = filter === 'unread';
      const response = await notificationApi.getList(page, pageSize, unreadOnly);

      let items = response.items || [];

      // If filter is 'read', filter on client side
      if (filter === 'read') {
        items = items.filter((n) => n.isRead);
      }

      setNotifications(items);
      setTotal(response.total || 0);
      setUnreadCount(response.unreadCount || 0);
    } catch (err) {
      console.error('获取通知失败:', err);
      setError(err.message);
      toast.error('获取通知失败：' + err.message);
    } finally {
      setLoading(false);
    }
  };



  const markAsRead = async (id) => {
    setActionLoading(`read-${id}`);
    try {
      await notificationApi.markAsRead(id);
      // Update local state
      setNotifications(
        notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      toast.success('已标记为已读');
    } catch (err) {
      console.error('标记已读失败:', err);
      toast.error('操作失败：' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const markAllAsRead = async () => {
    setActionLoading('read-all');
    try {
      const result = await notificationApi.markAllAsRead();
      toast.success(`已标记 ${result.count} 条通知为已读`);
      // Refresh notifications
      await fetchNotifications();
    } catch (err) {
      console.error('批量标记已读失败:', err);
      toast.error('操作失败：' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const deleteNotification = async (id) => {
    setActionLoading(`delete-${id}`);
    try {
      await notificationApi.delete(id);
      // Update local state
      setNotifications(notifications.filter((n) => n.id !== id));
      setTotal((prev) => prev - 1);
      toast.success('通知已删除');
    } catch (err) {
      console.error('删除通知失败:', err);
      toast.error('删除失败：' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const deleteAllRead = async () => {
    setActionLoading('delete-all-read');
    try {
      const result = await notificationApi.deleteAllRead();
      toast.success(`已删除 ${result.count} 条已读通知`);
      // Refresh notifications
      await fetchNotifications();
    } catch (err) {
      console.error('批量删除失败:', err);
      toast.error('操作失败：' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // 加载状态
  if (loading && notifications.length === 0) {
    return (
      <Loading text='加载中...' className='py-12' />
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className='bg-card border border-border rounded-lg p-12 text-center'>
        <Bell className='h-12 w-12 text-destructive mx-auto mb-4' />
        <h3 className='text-lg font-medium text-card-foreground mb-2'>
          加载失败
        </h3>
        <p className='text-muted-foreground mb-4'>{error}</p>
        <Button onClick={fetchNotifications}>重试</Button>
      </div>
    );
  }

  const readCount = total - unreadCount;

  return (
    <div>
      <div className='mb-6'>
        <div className='flex items-center justify-between mb-4'>
          <div>
            <h1 className='text-2xl font-bold text-card-foreground mb-2'>
              消息通知
            </h1>
            <p className='text-muted-foreground'>查看你的所有通知消息</p>
          </div>
          <div className='flex items-center space-x-2'>
            {unreadCount > 0 && (
              <Badge
                variant='destructive'
                className='flex items-center space-x-1'
              >
                <Bell className='h-3 w-3' />
                <span>{unreadCount} 条未读</span>
              </Badge>
            )}
          </div>
        </div>

        {/* 筛选和操作按钮 */}
        <div className='flex items-center justify-between mb-4'>
          <div className='flex items-center space-x-2'>
            <Badge
              variant={filter === 'all' ? 'default' : 'outline'}
              className='cursor-pointer'
              onClick={() => {
                setFilter('all');
                setPage(1);
              }}
            >
              全部 ({total})
            </Badge>
            <Badge
              variant={filter === 'unread' ? 'default' : 'outline'}
              className='cursor-pointer'
              onClick={() => {
                setFilter('unread');
                setPage(1);
              }}
            >
              未读 ({unreadCount})
            </Badge>
            <Badge
              variant={filter === 'read' ? 'default' : 'outline'}
              className='cursor-pointer'
              onClick={() => {
                setFilter('read');
                setPage(1);
              }}
            >
              已读 ({readCount})
            </Badge>
          </div>

          <div className='flex items-center space-x-2'>
            {unreadCount > 0 && (
              <Button
                variant='ghost'
                size='sm'
                onClick={markAllAsRead}
                disabled={actionLoading === 'read-all'}
              >
                {actionLoading === 'read-all' ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <CheckCheck className='h-4 w-4' />
                )}
                全部标记为已读
              </Button>
            )}
            {readCount > 0 && (
              <Button
                variant='ghost'
                size='sm'
                onClick={deleteAllRead}
                disabled={actionLoading === 'delete-all-read'}
                className='text-red-500 hover:text-red-600'
              >
                {actionLoading === 'delete-all-read' ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <Trash2 className='h-4 w-4' />
                )}
                删除所有已读
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 通知列表 */}
      {notifications.length > 0 ? (
        <div className='space-y-2'>
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className='bg-card border border-border rounded-lg overflow-hidden hover:shadow-sm transition-all'
            >
              <div className='p-4'>
                <div className='flex items-start space-x-3'>
                  {/* 未读指示器 */}
                  <div className='shrink-0 pt-1'>
                    {!notification.isRead && (
                      <div className='w-2 h-2 bg-green-500 rounded-full ring-2 ring-green-500/20' />
                    )}
                  </div>

                  {/* 用户头像 */}
                  <UserAvatar
                    name={notification.triggeredByName || notification.triggeredByUsername}
                    size='md'
                  />

                  <div className='flex-1 min-w-0'>
                    <div className='flex items-start justify-between mb-2'>
                      <div className='flex items-center space-x-2 flex-wrap'>
                        {getNotificationIcon(notification.type)}
                        {notification.triggeredByUsername && (
                          <span className='text-sm font-medium text-card-foreground'>
                            {notification.triggeredByName || notification.triggeredByUsername}
                          </span>
                        )}
                        <span className='text-sm text-muted-foreground'>
                          {getNotificationMessage(notification)}
                        </span>
                      </div>
                      <span className='text-xs text-muted-foreground whitespace-nowrap ml-2'>
                        <Time date={notification.createdAt} fromNow />
                      </span>
                    </div>

                    {notification.topicTitle && (
                      <Link
                        href={`/topic/${notification.topicId}${
                          notification.postId
                            ? `#post-${notification.postId}`
                            : ''
                        }`}
                        className='text-sm text-primary hover:underline block mb-2'
                      >
                        {notification.topicTitle}
                      </Link>
                    )}

                    <div className='flex items-center space-x-2'>
                      {!notification.isRead && (
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={() => markAsRead(notification.id)}
                          disabled={actionLoading === `read-${notification.id}`}
                          className='h-7 text-xs'
                        >
                          {actionLoading === `read-${notification.id}` ? (
                            <Loader2 className='h-3 w-3 mr-1 animate-spin' />
                          ) : (
                            <CheckCheck className='h-3 w-3 mr-1' />
                          )}
                          标记已读
                        </Button>
                      )}
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => deleteNotification(notification.id)}
                        disabled={actionLoading === `delete-${notification.id}`}
                        className='h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-50'
                      >
                        {actionLoading === `delete-${notification.id}` ? (
                          <Loader2 className='h-3 w-3 mr-1 animate-spin' />
                        ) : (
                          <Trash2 className='h-3 w-3 mr-1' />
                        )}
                        删除
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

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
        </div>
      ) : (
        <div className='bg-card border border-border rounded-lg p-12 text-center'>
          <Bell className='h-12 w-12 text-muted-foreground mx-auto mb-4' />
          <h3 className='text-lg font-medium text-card-foreground mb-2'>
            {filter === 'unread'
              ? '没有未读通知'
              : filter === 'read'
              ? '没有已读通知'
              : '暂无通知'}
          </h3>
          <p className='text-muted-foreground'>
            {filter === 'all'
              ? '你的通知消息会显示在这里'
              : '切换筛选查看其他通知'}
          </p>
        </div>
      )}
    </div>
  );
}
