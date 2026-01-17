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
      <div className='bg-background/50 backdrop-blur-sm border border-border/50 rounded-2xl overflow-hidden flex flex-col h-full shadow-sm'>
        {/* 会话对象信息头部 */}
        <div className='border-b border-border/50 px-4 py-3 bg-muted/30 shrink-0 backdrop-blur-md sticky top-0 z-10'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-3'>
              <Link
                href='/profile/messages'
                className='text-muted-foreground hover:text-foreground transition-colors p-2 -ml-2 rounded-full hover:bg-background/80'
              >
                <ArrowLeft className='h-5 w-5' />
              </Link>
              <UserAvatar
                url={otherUser.avatar}
                name={otherUser.username}
                size='md'
                className="ring-2 ring-background"
              />
              <div>
                <Link
                  href={`/users/${otherUser.username}`}
                  className='text-sm font-bold text-foreground hover:text-primary transition-colors'
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
        <div ref={messagesContainerRef} className='flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-muted-foreground/20'>
          {conversation.length === 0 ? (
            <div className='flex items-center justify-center h-full'>
              <div className='text-center space-y-3 opacity-60'>
                <div className="bg-muted p-4 rounded-full inline-block">
                    <Mail className='h-8 w-8 text-muted-foreground' />
                </div>
                <p className='text-sm text-muted-foreground'>暂无记录，打个招呼吧</p>
              </div>
            </div>
          ) : (
            <div className='space-y-6 min-h-full flex flex-col justify-end pb-2'>
              {/* 加载更多按钮 */}
              {hasMore && (
                <div className='flex justify-center py-4'>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className='text-xs text-muted-foreground hover:text-foreground rounded-full bg-muted/30 hover:bg-muted/50'
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className='h-3 w-3 mr-1 animate-spin' />
                        加载历史消息...
                      </>
                    ) : (
                      `查看更多历史消息`
                    )}
                  </Button>
                </div>
              )}
              {conversation.map((msg, index) => {
                const isSentByMe = msg.senderId === user.id;
                // Check if previous message is from same user to group visually
                const isSequence = index > 0 && conversation[index-1].senderId === msg.senderId;

                return (
                  <div
                    key={msg.id}
                    className={`flex ${
                      isSentByMe ? 'justify-end' : 'justify-start'
                    } group animate-in slide-in-from-bottom-2 duration-500`}
                  >
                    <div
                      className={`flex items-end gap-2 max-w-[85%] sm:max-w-[70%] ${
                        isSentByMe ? 'flex-row' : 'flex-row'
                      }`}
                    >
                      {/* 左侧头像 - 对方消息 */}
                      {!isSentByMe && (
                         <div className={`flex-shrink-0 w-8 ${isSequence ? 'invisible' : ''}`}>
                            <UserAvatar
                              url={msg.senderAvatar}
                              name={msg.senderUsername}
                              size='sm'
                            />
                         </div>
                      )}

                      {/* 消息气泡 */}
                      <div
                        className={`flex flex-col ${
                          isSentByMe ? 'items-end' : 'items-start'
                        }`}
                      >
                         {!isSequence && !isSentByMe && (
                            <span className="text-[10px] text-muted-foreground ml-1 mb-1">
                                {msg.senderName || msg.senderUsername}
                            </span>
                         )}

                        <div
                          className={`relative px-4 py-2.5 shadow-sm text-sm break-all ${
                            isSentByMe
                              ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-2xl rounded-br-sm'
                              : 'bg-card border border-border/50 text-card-foreground rounded-2xl rounded-bl-sm'
                          }`}
                        >
                          {msg.subject && (
                            <div className="font-bold mb-1 border-b border-white/20 pb-1">
                              {msg.subject}
                            </div>
                          )}
                          <p className="leading-relaxed whitespace-pre-wrap">
                            {msg.content}
                          </p>

                          {/* 删除按钮 - 悬停优雅显示 */}
                          <div className={`absolute top-0 bottom-0 ${isSentByMe ? '-left-10' : '-right-10'} flex items-center opacity-0 group-hover:opacity-100 transition-opacity`}>
                              <Button
                                onClick={() => handleDelete(msg.id)}
                                disabled={deleting}
                                variant='ghost'
                                size='icon'
                                className='h-8 w-8 text-muted-foreground hover:text-destructive rounded-full bg-background/50 backdrop-blur-sm'
                                title='删除'
                              >
                                {deleting ? <Loader2 className='h-3.5 w-3.5 animate-spin' /> : <Trash2 className='h-4 w-4' />}
                              </Button>
                          </div>
                        </div>
                        
                        {/* 时间 & 状态 */}
                        <div className={`text-[10px] text-muted-foreground mt-1 flex items-center gap-1 ${isSentByMe ? 'mr-1' : 'ml-1'}`}>
                           <Time date={msg.createdAt} fromNow />
                           {isSentByMe && (
                               <span>
                                   {msg.isRead ? '· 已读' : ''}
                               </span>
                           )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* 回复区域 - 悬浮式 */}
        <div className='p-4 pt-2'>
            <div className="bg-muted/30 backdrop-blur-md rounded-xl p-1.5 border border-border/50 flex items-end gap-2 shadow-sm focus-within:ring-1 focus-within:ring-primary/30 transition-shadow">
                <Textarea
                  ref={textareaRef}
                  className='flex-1 min-h-[40px] max-h-[120px] resize-none text-sm bg-transparent border-0 shadow-none focus-visible:ring-0 p-3 placeholder:text-muted-foreground/50'
                  placeholder="输入消息..."
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
                  className={`h-10 w-10 shrink-0 rounded-lg transition-all ${
                      replyContent.trim() ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {replying ? (
                    <Loader2 className='h-4 w-4 animate-spin' />
                  ) : (
                    <Send className='h-4 w-4' />
                  )}
                </Button>
            </div>
            <p className='text-[10px] text-muted-foreground text-center mt-2 opacity-50 hidden sm:block'>
                Enter 发送，Shift + Enter 换行
            </p>
        </div>
      </div>
    </div>
  );
}
