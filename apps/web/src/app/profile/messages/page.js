'use client';

import { useState, useEffect } from 'react';
import Link from '@/components/common/Link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Mail,
  Loader2,
  MessageSquare,
  Trash2,
  MoreVertical,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { messageApi } from '@/lib/api';
import { toast } from 'sonner';
import UserAvatar from '@/components/user/UserAvatar';
import Time from '@/components/common/Time';
import { Loading } from '@/components/common/Loading';
import { Pager } from '@/components/common/Pagination';

export default function MessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalUnread, setTotalUnread] = useState(0);
  const [deletingUserId, setDeletingUserId] = useState(null);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user, page, pageSize]);

  const fetchConversations = async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await messageApi.getConversations(page, pageSize);
      setConversations(response.items || []);
      setTotal(response.total || 0);
      setTotalUnread(response.totalUnread || 0);
    } catch (err) {
      console.error('获取会话列表失败:', err);
      setError(err.message);
      toast.error('获取会话列表失败：' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConversation = async (userId, username) => {
    if (!confirm(`确定要删除与 ${username} 的所有站内信吗？此操作不可恢复。`)) {
      return;
    }

    setDeletingUserId(userId);

    try {
      await messageApi.deleteConversation(userId);
      toast.success('会话已删除');

      // Remove from local state
      setConversations((prev) =>
        prev.filter((conv) => conv.user.id !== userId)
      );
      setTotal((prev) => prev - 1);
    } catch (err) {
      console.error('删除会话失败:', err);
      toast.error('删除失败：' + err.message);
    } finally {
      setDeletingUserId(null);
    }
  };

  // 加载状态
  if (loading && conversations.length === 0) {
    return (
      <Loading text='加载中...' className='py-12' />
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className='bg-card border border-border rounded-lg p-12 text-center'>
        <Mail className='h-12 w-12 text-destructive mx-auto mb-4' />
        <h3 className='text-lg font-medium text-card-foreground mb-2'>
          加载失败
        </h3>
        <p className='text-muted-foreground mb-4'>{error}</p>
        <Button onClick={fetchConversations}>重试</Button>
      </div>
    );
  }

  return (
    <div>
      <div className='mb-6'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-2xl font-bold text-foreground mb-1'>站内信</h1>
            <p className='text-sm text-muted-foreground'>查看你的私信会话</p>
          </div>
          {totalUnread > 0 && (
            <Badge
              variant='default'
              className='flex items-center space-x-1.5 px-3 py-1'
            >
              <Mail className='h-3.5 w-3.5' />
              <span>{totalUnread} 条未读</span>
            </Badge>
          )}
        </div>
      </div>

      {/* 会话列表 */}
      {conversations.length > 0 ? (
        <div className='bg-card border border-border rounded-lg divide-y divide-border overflow-hidden'>
          {conversations.map((conversation) => {
            const {
              user: otherUser,
              latestMessage,
              unreadCount,
            } = conversation;
            const hasUnread = unreadCount > 0;

            return (
              <div
                key={otherUser.id}
                className={`group relative overflow-hidden transition-all duration-300 hover:shadow-md ${
                  hasUnread ? 'bg-primary/5 hover:bg-primary/10' : 'bg-card hover:bg-muted/50'
                }`}
              >
                {/* 左侧装饰条 (未读时显示) */}
                {hasUnread && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                )}

                <div className='p-4 pl-5'>
                  <div className='flex items-start space-x-4'>
                    {/* 用户头像 */}
                    <Link href={`/profile/messages/${otherUser.id}`} className="flex-shrink-0">
                      <UserAvatar
                        url={otherUser.avatar}
                        name={otherUser.username}
                        size='md'
                        className="border-2 border-background shadow-sm transition-transform group-hover:scale-105"
                      />
                    </Link>

                    <Link
                      href={`/profile/messages/${otherUser.id}`}
                      className='flex-1 min-w-0'
                    >
                      <div className='flex items-center justify-between mb-1'>
                        <div className='flex items-center gap-2 max-w-[70%]'>
                          <span className={`text-base font-semibold truncate ${
                               hasUnread ? 'text-primary' : 'text-foreground'
                          }`}>
                            {otherUser.name || otherUser.username}
                          </span>
                        </div>
                        <span className='text-xs text-muted-foreground flex-shrink-0'>
                           <Time date={latestMessage.createdAt} fromNow />
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                          <p className={`text-sm line-clamp-1 flex-1 ${
                             hasUnread ? 'text-foreground font-medium' : 'text-muted-foreground'
                          }`}>
                            {latestMessage.isSentByMe && (
                              <span className='text-muted-foreground mr-1'>
                                你:
                              </span>
                            )}
                            {latestMessage.content}
                          </p>
                          
                          {/* 未读气泡 */}
                          {hasUnread && (
                             <Badge variant="default" className="h-5 w-auto min-w-[1.25rem] px-1 flex items-center justify-center rounded-full text-[10px] shrink-0">
                                {unreadCount}
                             </Badge>
                          )}
                      </div>
                    </Link>

                    {/* 操作菜单 - 仅悬浮显示或在移动端显示 */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='h-8 w-8 text-muted-foreground hover:text-foreground'
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className='h-4 w-4' />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align='end'>
                            <DropdownMenuItem
                              className='text-destructive focus:text-destructive cursor-pointer'
                              disabled={deletingUserId === otherUser.id}
                              onClick={(e) => {
                                e.preventDefault();
                                handleDeleteConversation(
                                  otherUser.id,
                                  otherUser.name || otherUser.username
                                );
                              }}
                            >
                              {deletingUserId === otherUser.id ? (
                                <>
                                  <Loader2 className='h-4 w-4 animate-spin mr-2' />
                                  删除...
                                </>
                              ) : (
                                <>
                                  <Trash2 className='h-4 w-4 mr-2' />
                                  删除会话
                                </>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* 分页 */}
          {total > pageSize && (
            <div className='p-4'>
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
            </div>
          )}
        </div>
      ) : (
        <div className='bg-card border border-border rounded-lg p-16 text-center'>
          <MessageSquare className='h-16 w-16 text-muted-foreground/50 mx-auto mb-4' />
          <h3 className='text-lg font-semibold text-foreground mb-2'>
            暂无会话
          </h3>
          <p className='text-sm text-muted-foreground'>
            去用户详情页发送你的第一条私信吧
          </p>
        </div>
      )}
    </div>
  );
}
