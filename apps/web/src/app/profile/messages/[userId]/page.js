'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from '@/components/common/Link';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Mail, ArrowLeft, Send, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { messageApi } from '@/lib/api';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import UserAvatar from '@/components/user/UserAvatar';
import Time from '@/components/common/Time';
import { Loading } from '@/components/common/Loading';

export default function MessageDetailPage() {
  const params = useParams();
  const otherUserId = parseInt(params.userId);
  const { user } = useAuth();

  const [conversation, setConversation] = useState([]);
  const [otherUser, setOtherUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [replying, setReplying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const previousScrollHeight = useRef(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (user) {
      fetchConversation();
    }
  }, [otherUserId, user]);

  useEffect(() => {
    if (conversation.length > 0) {
      scrollToBottom();
    }
  }, [conversation]);

  const fetchConversation = async (pageNum = 1, append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      // Fetch the full conversation with the specified user
      const conversationData = await messageApi.getConversation(
        otherUserId,
        pageNum,
        20
      );
      // Reverse the array so newest messages are at the bottom
      const reversedItems = [...(conversationData.items || [])].reverse();

      if (append) {
        // Prepend older messages to the beginning
        setConversation((prev) => [...reversedItems, ...prev]);
      } else {
        setConversation(reversedItems);
      }

      setOtherUser(conversationData.otherUser);
      setTotal(conversationData.total);
      setPage(pageNum);
      setHasMore(conversationData.total > pageNum * 20);
    } catch (err) {
      console.error('获取会话失败:', err);
      setError(err.message);
      toast.error('获取会话失败：' + err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;

    // Save current scroll position
    const container = messagesContainerRef.current;
    if (container) {
      previousScrollHeight.current = container.scrollHeight;
    }

    const nextPage = page + 1;
    await fetchConversation(nextPage, true);

    // Restore scroll position after new messages are loaded
    setTimeout(() => {
      if (container) {
        const newScrollHeight = container.scrollHeight;
        const scrollDiff = newScrollHeight - previousScrollHeight.current;
        container.scrollTop = scrollDiff;
      }
    }, 0);
  };

  const handleReply = async () => {
    if (!replyContent.trim()) {
      toast.error('请输入回复内容');
      return;
    }

    if (!otherUser) {
      toast.error('无法确定收件人');
      return;
    }

    setReplying(true);

    try {
      const newMessage = await messageApi.send({
        recipientId: otherUser.id,
        content: replyContent.trim(),
      });

      toast.success('消息发送成功');
      setReplyContent('');

      // Add the new message to the conversation locally
      const optimisticMessage = {
        id: newMessage.id,
        senderId: user.id,
        recipientId: otherUser.id,
        content: newMessage.content,
        subject: newMessage.subject,
        isRead: false,
        createdAt: newMessage.createdAt || new Date().toISOString(),
        senderUsername: user.username,
        senderName: user.name,
        senderAvatar: user.avatar,
      };

      setConversation((prev) => [...prev, optimisticMessage]);
      setTotal((prev) => prev + 1);

      // Scroll to bottom after adding message
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    } catch (err) {
      console.error('发送消息失败:', err);
      toast.error('发送失败：' + err.message);
    } finally {
      setReplying(false);
    }
  };

  const handleDelete = async (messageId) => {
    if (!confirm('确定要删除这条消息吗？')) {
      return;
    }

    setDeleting(true);

    try {
      await messageApi.delete(messageId);
      toast.success('消息已删除');

      // Remove the message from local state
      setConversation((prev) => prev.filter((msg) => msg.id !== messageId));
      setTotal((prev) => prev - 1);
    } catch (err) {
      console.error('删除消息失败:', err);
      toast.error('删除失败：' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  // 加载状态
  if (loading) {
    return (
      <Loading text='加载中...' className='py-12' />
    );
  }

  // 错误状态
  if (error || !otherUser) {
    return (
      <div className='bg-card border border-border rounded-lg p-12 text-center'>
        <Mail className='h-12 w-12 text-destructive mx-auto mb-4' />
        <h3 className='text-lg font-medium text-card-foreground mb-2'>
          加载失败
        </h3>
        <p className='text-muted-foreground mb-4'>{error || '用户不存在'}</p>
        <div className='space-x-2'>
          <Button onClick={fetchConversation}>重试</Button>
          <Link href='/profile/messages'>
            <Button variant='outline'>返回消息列表</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-col h-[calc(100vh-12rem)]'>
      {/* 聊天容器 */}
      <div className='bg-card border border-border rounded-lg overflow-hidden flex flex-col h-full shadow-sm'>
        {/* 会话对象信息头部 */}
        <div className='border-b border-border px-4 py-3 bg-muted/20 shrink-0'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-3'>
              <Link
                href='/profile/messages'
                className='text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-accent'
              >
                <ArrowLeft className='h-5 w-5' />
              </Link>
              <UserAvatar
                url={otherUser.avatar}
                name={otherUser.username}
                size='md'
              />
              <div>
                <Link
                  href={`/users/${otherUser.username}`}
                  className='text-sm font-semibold text-foreground hover:text-primary transition-colors'
                >
                  {otherUser.name || otherUser.username}
                </Link>
                <div className='text-xs text-muted-foreground'>
                  @{otherUser.username}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 会话记录 - 可滚动区域 */}
        <div ref={messagesContainerRef} className='flex-1 overflow-y-auto p-4'>
          {conversation.length === 0 ? (
            <div className='flex items-center justify-center h-full'>
              <div className='text-center'>
                <Mail className='h-12 w-12 text-muted-foreground mx-auto mb-2' />
                <p className='text-muted-foreground'>暂无会话记录</p>
              </div>
            </div>
          ) : (
            <div className='space-y-4 min-h-full flex flex-col justify-end'>
              {/* 加载更多按钮 */}
              {hasMore && (
                <div className='flex justify-center pb-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className='text-xs'
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className='h-3 w-3 mr-1 animate-spin' />
                        加载中...
                      </>
                    ) : (
                      `加载更多 (${total - conversation.length} 条)`
                    )}
                  </Button>
                </div>
              )}
              {conversation.map((msg) => {
                const isSentByMe = msg.senderId === user.id;

                return (
                  <div
                    key={msg.id}
                    className={`flex ${
                      isSentByMe ? 'justify-end' : 'justify-start'
                    } group`}
                  >
                    <div
                      className={`flex items-start gap-2 max-w-[75%] ${
                        isSentByMe ? 'flex-row' : 'flex-row'
                      }`}
                    >
                      {/* 左侧头像 - 对方消息 */}
                      {!isSentByMe && (
                        <UserAvatar
                          url={msg.senderAvatar}
                          name={msg.senderUsername}
                          size='sm'
                        />
                      )}

                      {/* 消息气泡 */}
                      <div
                        className={`flex flex-col ${
                          isSentByMe ? 'items-end' : 'items-start'
                        }`}
                      >
                        {/* 发送者名称和时间 */}
                        <div
                          className={`flex items-center gap-2 mb-1 ${
                            isSentByMe ? 'flex-row-reverse' : 'flex-row'
                          }`}
                        >
                          {!isSentByMe && (
                            <span className='text-xs font-semibold text-foreground'>
                              {msg.senderName || msg.senderUsername}
                            </span>
                          )}
                          <span className='text-xs text-muted-foreground'>
                            <Time date={msg.createdAt} fromNow />
                          </span>
                          {!msg.isRead && !isSentByMe && (
                            <Badge
                              variant='default'
                              className='h-4 px-1.5 text-xs font-medium'
                            >
                              新
                            </Badge>
                          )}
                        </div>

                        {/* 消息内容 */}
                        <div
                          className={`relative rounded-lg px-3 py-2 ${
                            isSentByMe
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-foreground border border-border'
                          }`}
                        >
                          {msg.subject && (
                            <div
                              className={`text-sm font-semibold mb-1 ${
                                isSentByMe
                                  ? 'text-primary-foreground/90'
                                  : 'text-card-foreground'
                              }`}
                            >
                              {msg.subject}
                            </div>
                          )}
                          <p className='text-sm break-all'>
                            {msg.content}
                          </p>

                          {/* 删除按钮 - 悬停显示 */}
                          <Button
                            onClick={() => handleDelete(msg.id)}
                            disabled={deleting}
                            variant='destructive'
                            className={`absolute -top-2 ${
                              isSentByMe ? '-left-8' : '-right-8'
                            } opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6`}
                            title='删除消息'
                            size='icon'
                          >
                            {deleting ? (
                              <Loader2 className='h-3.5 w-3.5 animate-spin' />
                            ) : (
                              <Trash2 className='h-3.5 w-3.5' />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* 右侧头像 - 我的消息 */}
                      {isSentByMe && (
                        <UserAvatar
                          url={user.avatar}
                          name={user.username}
                          size='sm'
                        />
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* 回复区域 - 固定底部 */}
        <div className='border-t border-border p-3 bg-muted/10 shrink-0'>
          <div className='flex items-end space-x-2'>
            <Textarea
              ref={textareaRef}
              className='flex-1 min-h-[40px] max-h-[120px] resize-none text-sm bg-background'
              placeholder={`发送消息给 ${
                otherUser.name || otherUser.username
              }...`}
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (replyContent.trim() && !replying) {
                    handleReply();
                  }
                }
              }}
              disabled={replying}
              rows={1}
            />
            <Button
              onClick={handleReply}
              disabled={replying || !replyContent.trim()}
              size='icon'
              className='h-[40px] w-[40px] shrink-0'
            >
              {replying ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                <Send className='h-4 w-4' />
              )}
            </Button>
          </div>
          <p className='text-xs text-muted-foreground mt-1.5'>
            按 Enter 发送，Shift + Enter 换行
          </p>
        </div>
      </div>
    </div>
  );
}
