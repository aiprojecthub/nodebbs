'use client';

import Link from '@/components/common/Link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/common/PageHeader';
import { Bell, CheckCheck, Trash2, Loader2, BellOff } from 'lucide-react';
import { getNotificationIcon, getNotificationMessage } from '@/lib/notification';
import UserAvatar from '@/components/user/UserAvatar';
import Time from '@/components/common/Time';
import { Loading } from '@/components/common/Loading';
import { Pager } from '@/components/common/Pagination';
import { ConfirmPopover } from '@/components/common/ConfirmPopover';

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

  // 初始加载状态标记
  const isInitialLoading = loading && notifications.length === 0;

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <PageHeader
        title="消息通知"
        description="查看你的所有通知消息"
      />

      {/* 筛选和操作按钮 - 始终显示 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge
            variant={filter === 'all' ? 'default' : 'outline'}
            className="cursor-pointer transition-colors"
            onClick={() => handleFilterChange('all')}
          >
            全部
          </Badge>
          <Badge
            variant={filter === 'unread' ? 'default' : 'outline'}
            className="cursor-pointer transition-colors"
            onClick={() => handleFilterChange('unread')}
          >
            未读
          </Badge>
          <Badge
            variant={filter === 'read' ? 'default' : 'outline'}
            className="cursor-pointer transition-colors"
            onClick={() => handleFilterChange('read')}
          >
            已读
          </Badge>
        </div>

        <div className="flex items-center gap-2 min-h-8">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              disabled={isActionLoading('read-all')}
              className="h-8 gap-1.5"
            >
              {isActionLoading('read-all') ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCheck className="h-3.5 w-3.5" />
              )}
              全部已读
            </Button>
          )}
          {readCount > 0 && (
            <ConfirmPopover
              title="清除已读通知"
              description="确定要清空所有已读通知吗？此操作无法撤销。"
              confirmText="清除"
              variant="destructive"
              onConfirm={deleteAllRead}
            >
              <Button
                variant="ghost"
                size="sm"
                disabled={isActionLoading('delete-all-read')}
                className="h-8 gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                {isActionLoading('delete-all-read') ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                清除已读
              </Button>
            </ConfirmPopover>
          )}
        </div>
      </div>

      {/* 初始加载状态 */}
      {isInitialLoading ? (
        <Loading text="加载中..." className="min-h-[200px]" />
      ) : error ? (
        /* 错误状态 */
        <Card className="border-destructive/20 shadow-none">
          <CardContent className="py-12 text-center">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <Bell className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="text-lg font-medium mb-2">加载失败</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchNotifications} variant="outline">
              重试
            </Button>
          </CardContent>
        </Card>
      ) : notifications.length > 0 ? (
        /* 通知列表 */
        <div className="space-y-3">
          {notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`group shadow-none transition-colors ${
                    !notification.isRead
                      ? 'border-primary/30 bg-primary/[0.02]'
                      : 'hover:border-border/80'
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* 未读指示器 + 头像 */}
                      <div className="relative shrink-0">
                        <UserAvatar
                          name={notification.triggeredByName || notification.triggeredByUsername}
                          url={notification.triggeredByAvatar}
                          size="md"
                        />
                        {!notification.isRead && (
                          <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full ring-2 ring-background" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* 通知内容 */}
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 flex-wrap text-sm">
                            <span className="inline-flex items-center gap-1">
                              {getNotificationIcon(notification.type)}
                            </span>
                            {notification.triggeredByUsername && (
                              <span className="font-medium text-foreground">
                                {notification.triggeredByName || notification.triggeredByUsername}
                              </span>
                            )}
                            <span className="text-muted-foreground">
                              {getNotificationMessage(notification)}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                            <Time date={notification.createdAt} fromNow />
                          </span>
                        </div>

                        {/* 话题链接 */}
                        {notification.topicTitle && (
                          <Link
                            href={`/topic/${notification.topicId}${
                              notification.postId ? `#post-${notification.postId}` : ''
                            }`}
                            className="text-sm text-primary hover:underline block mb-2 truncate"
                          >
                            {notification.topicTitle}
                          </Link>
                        )}

                        {/* 操作按钮 */}
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!notification.isRead && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead(notification.id)}
                              disabled={isActionLoading(`read-${notification.id}`)}
                              className="h-7 px-2 text-xs gap-1"
                            >
                              {isActionLoading(`read-${notification.id}`) ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <CheckCheck className="h-3 w-3" />
                              )}
                              标记已读
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteNotification(notification.id)}
                            disabled={isActionLoading(`delete-${notification.id}`)}
                            className="h-7 px-2 text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            {isActionLoading(`delete-${notification.id}`) ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                            删除
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
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
            <Card className="shadow-none border-dashed">
              <CardContent className="py-12 text-center">
                <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <BellOff className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-medium mb-2">
                  {filter === 'unread'
                    ? '没有未读通知'
                    : filter === 'read'
                    ? '没有已读通知'
                    : '暂无通知'}
                </h3>
                <p className="text-muted-foreground">
                  {filter === 'all'
                    ? '你的通知消息会显示在这里'
                    : '切换筛选查看其他通知'}
                </p>
          </CardContent>
            </Card>
          )}
    </div>
  );
}
