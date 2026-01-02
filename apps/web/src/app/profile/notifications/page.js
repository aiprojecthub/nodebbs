'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, CheckCheck, Trash2, Loader2 } from 'lucide-react';
import { getNotificationIcon, getNotificationMessage } from '@/lib/notification';
import UserAvatar from '@/components/user/UserAvatar';
import Time from '@/components/common/Time';
import { Loading } from '@/components/common/Loading';
import { Pager } from '@/components/common/Pagination';

// 导入 Hook
import { useNotifications } from '@/hooks/profile/useNotifications';

/**
 * 通知页面
 * 纯 UI 组件，消费 useNotifications Hook
 */
export default function NotificationsPage() {
  const {
    // 列表数据
    notifications,
    loading,
    error,
    page,
    pageSize,
    total,
    unreadCount,
    readCount,
    filter,
    setPage,
    // 操作函数
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
    handleFilterChange,
    // 加载状态
    isActionLoading,
  } = useNotifications();

  // 加载状态
  if (loading && notifications.length === 0) {
    return <Loading text='加载中...' className='py-12' />;
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
              <Badge variant='destructive' className='flex items-center space-x-1'>
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
              onClick={() => handleFilterChange('all')}
            >
              全部 ({total})
            </Badge>
            <Badge
              variant={filter === 'unread' ? 'default' : 'outline'}
              className='cursor-pointer'
              onClick={() => handleFilterChange('unread')}
            >
              未读 ({unreadCount})
            </Badge>
            <Badge
              variant={filter === 'read' ? 'default' : 'outline'}
              className='cursor-pointer'
              onClick={() => handleFilterChange('read')}
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
                disabled={isActionLoading('read-all')}
              >
                {isActionLoading('read-all') ? (
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
                disabled={isActionLoading('delete-all-read')}
                className='text-red-500 hover:text-red-600'
              >
                {isActionLoading('delete-all-read') ? (
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
                    url={notification.triggeredByAvatar}
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
                          notification.postId ? `#post-${notification.postId}` : ''
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
                          disabled={isActionLoading(`read-${notification.id}`)}
                          className='h-7 text-xs'
                        >
                          {isActionLoading(`read-${notification.id}`) ? (
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
                        disabled={isActionLoading(`delete-${notification.id}`)}
                        className='h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-50'
                      >
                        {isActionLoading(`delete-${notification.id}`) ? (
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
