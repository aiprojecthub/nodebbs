'use client';

import { useState, useEffect } from 'react';
import Link from '@/components/common/Link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/common/PageHeader';
import { MessageCircle, ExternalLink, ThumbsUp, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { postApi } from '@/lib/api';
import { toast } from 'sonner';
import UserAvatar from '@/components/user/UserAvatar';
import { Loading } from '@/components/common/Loading';
import { Pager } from '@/components/common/Pagination';
import Time from '@/components/common/Time';

// 单个回复卡片组件
function ReplyCard({ reply }) {
  const [expanded, setExpanded] = useState(false);
  const contentLength = reply.content?.length || 0;
  const shouldTruncate = contentLength > 200;

  const displayContent = shouldTruncate && !expanded
    ? reply.content.slice(0, 200) + '...'
    : reply.content;

  return (
    <div className='bg-card border border-border rounded-lg overflow-hidden transition duration-200 hover:border-primary/30 hover:shadow-sm'>
      {/* 话题信息头部 */}
      <Link
        href={`/topic/${reply.topicId}#post-${reply.id}`}
        className='block px-3 py-2 md:px-4 md:py-2.5 bg-muted/50 border-b border-border hover:bg-muted transition-colors group'
      >
        <div className='flex items-center justify-between gap-2'>
          <div className='flex items-center gap-2 min-w-0 flex-1'>
            <span className='text-xs text-muted-foreground shrink-0'>回复于</span>
            <span className='text-sm font-medium text-card-foreground truncate group-hover:text-primary transition-colors'>
              {reply.topicTitle}
            </span>
          </div>
          <ExternalLink className='h-3.5 w-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity' />
        </div>
      </Link>

      {/* 回复内容 */}
      <div className='p-3 md:p-4'>
        <div className='flex gap-3'>
          <UserAvatar
            url={reply.userAvatar}
            name={reply.username}
            size='sm'
            className='shrink-0'
          />

          <div className='flex-1 min-w-0'>
            {/* 用户信息和元数据 */}
            <div className='flex flex-wrap items-center gap-x-2 gap-y-1 mb-2'>
              <span className='text-sm font-medium text-card-foreground'>
                {reply.userName || reply.username}
              </span>
              <span className='text-xs text-muted-foreground'>
                <Time date={reply.createdAt} fromNow />
              </span>
              {reply.likeCount > 0 && (
                <Badge variant='secondary' className='text-xs h-5 px-1.5 gap-0.5'>
                  <ThumbsUp className='h-3 w-3' />
                  {reply.likeCount}
                </Badge>
              )}
              {reply.editCount > 0 && (
                <span className='text-xs text-muted-foreground'>
                  · 编辑 {reply.editCount} 次
                </span>
              )}
            </div>

            {/* 回复正文 */}
            <div className='text-sm text-card-foreground leading-relaxed break-words whitespace-pre-wrap'>
              {displayContent}
            </div>

            {/* 展开/收起按钮 */}
            {shouldTruncate && (
              <Button
                variant='ghost'
                size='sm'
                className='h-7 px-2 mt-2 text-xs text-muted-foreground hover:text-primary'
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? (
                  <>
                    <ChevronUp className='h-3.5 w-3.5 mr-1' />
                    收起
                  </>
                ) : (
                  <>
                    <ChevronDown className='h-3.5 w-3.5 mr-1' />
                    展开全部
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

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
      toast.error(err.message || '获取回复列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 错误状态
  if (error && !loading) {
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
    <div className='space-y-4'>
      <PageHeader
        title='我的回复'
        description='你参与讨论的所有回复'
      />

      {/* 回复列表 */}
      {loading ? (
        <Loading text='加载中...' className='py-12' />
      ) : replies.length > 0 ? (
        <div className='space-y-3'>
          {replies.map((reply) => (
            <ReplyCard key={reply.id} reply={reply} />
          ))}

          {/* 分页 */}
          {total > limit && (
            <Pager
              total={total}
              page={page}
              pageSize={limit}
              onPageChange={handlePageChange}
            />
          )}
        </div>
      ) : (
        <div className='bg-card border border-border rounded-lg p-12 text-center'>
          <MessageCircle className='h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50' />
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
