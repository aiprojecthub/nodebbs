'use client';

import { useState, useEffect } from 'react';
import Link from '@/components/common/Link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { postApi } from '@/lib/api';
import { toast } from 'sonner';
import UserAvatar from '@/components/user/UserAvatar';
import { Loading } from '@/components/common/Loading';
import { Pager } from '@/components/common/Pagination';
import Time from '@/components/common/Time';

export default function RepliesPage() {
  const { user } = useAuth();
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    if (user) {
      fetchReplies();
    }
  }, [user, page]);

  const fetchReplies = async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await postApi.getByUser(user.id, page, limit);
      setReplies(response.items || []);
      setTotal(response.total || 0);
    } catch (err) {
      console.error('获取回复列表失败:', err);
      setError(err.message);
      toast.error('获取回复列表失败：' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 加载状态
  if (loading) {
    return (
      <Loading text='加载中...' className='py-12' />
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className='bg-card border border-border rounded-lg p-12 text-center'>
        <MessageCircle className='h-12 w-12 text-destructive mx-auto mb-4' />
        <h3 className='text-lg font-medium text-card-foreground mb-2'>
          加载失败
        </h3>
        <p className='text-muted-foreground mb-4'>{error}</p>
        <Button onClick={fetchReplies}>重试</Button>
      </div>
    );
  }

  return (
    <div>
      <div className='mb-6'>
        <div className='flex items-center justify-between mb-4'>
          <div>
            <h1 className='text-2xl font-bold text-card-foreground mb-2'>
              我的回复
            </h1>
            <p className='text-muted-foreground'>你参与讨论的所有回复</p>
          </div>
          <Badge variant='secondary' className='flex items-center space-x-1'>
            <MessageCircle className='h-3 w-3' />
            <span>{total} 条回复</span>
          </Badge>
        </div>
      </div>

      {/* 回复列表 */}
      {replies.length > 0 ? (
        <div className='space-y-4'>
          {replies.map((reply) => {
            return (
              <div
                key={reply.id}
                className='bg-card border border-border rounded-lg overflow-hidden hover:shadow-sm transition-shadow'
              >
                {/* 话题信息 */}
                <div className='px-4 py-2 bg-muted border-b border-border'>
                  <Link
                    href={`/topic/${reply.topicId}`}
                    className='text-sm text-muted-foreground hover:text-primary transition-colors flex items-center space-x-2'
                  >
                    <span>回复于话题：</span>
                    <span className='font-medium text-card-foreground'>
                      {reply.topicTitle}
                    </span>
                    <ArrowRight className='h-3 w-3' />
                  </Link>
                </div>

                {/* 回复内容 */}
                <div className='p-4'>
                  <div className='flex items-start space-x-3'>
                    <UserAvatar
                      url={reply.userAvatar}
                      name={reply.username}
                      size='sm'
                    />

                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center space-x-2 mb-2'>
                        <span className='text-sm font-medium text-card-foreground'>
                          {reply.userName || reply.username}
                        </span>
                        <span className='text-xs text-muted-foreground'>
                          <Time date={reply.createdAt} fromNow />
                        </span>
                        {reply.likeCount > 0 && (
                          <Badge variant='outline' className='text-xs'>
                            {reply.likeCount} 点赞
                          </Badge>
                        )}
                      </div>

                      <div className='text-sm text-card-foreground leading-relaxed break-all'>
                        {reply.content}
                      </div>

                      {reply.editCount > 0 && (
                        <div className='mt-2 text-xs text-muted-foreground'>
                          已编辑 {reply.editCount} 次
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* 分页 */}
          {total > limit && (
            <Pager
              total={total}
              page={page}
              pageSize={limit}
              onPageChange={(page) => setPage(page)}
            />
          )}
        </div>
      ) : (
        <div className='bg-card border border-border rounded-lg p-12 text-center'>
          <MessageCircle className='h-12 w-12 text-muted-foreground mx-auto mb-4' />
          <h3 className='text-lg font-medium text-card-foreground mb-2'>
            还没有回复
          </h3>
          <p className='text-muted-foreground mb-4'>
            参与讨论，分享你的观点和见解
          </p>
          <Link href='/'>
            <Button variant='outline'>去参与讨论</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
