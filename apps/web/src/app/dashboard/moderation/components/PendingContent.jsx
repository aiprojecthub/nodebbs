'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { moderationApi } from '@/lib/api';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import Link from '@/components/common/Link';
import { Loading } from '@/components/common/Loading';
import { Pager } from '@/components/common/Pagination';

export function PendingContent({ type = 'all', onModerationComplete }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadPendingContent();
  }, [type, page, pageSize]);

  const loadPendingContent = async () => {
    setLoading(true);
    try {
      const data = await moderationApi.getPending(type, page, pageSize);
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to load pending content:', error);
      toast.error('加载待审核内容失败');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (itemType, id) => {
    try {
      await moderationApi.approve(itemType, id);
      toast.success(`${itemType === 'topic' ? '话题' : '回复'}已批准`);
      loadPendingContent();
      // 通知父组件刷新统计数据
      if (onModerationComplete) {
        onModerationComplete();
      }
    } catch (error) {
      console.error('Failed to approve:', error);
      toast.error('批准失败');
    }
  };

  const handleReject = async (itemType, id) => {
    try {
      await moderationApi.reject(itemType, id);
      toast.success(`${itemType === 'topic' ? '话题' : '回复'}已拒绝`);
      loadPendingContent();
      // 通知父组件刷新统计数据
      if (onModerationComplete) {
        onModerationComplete();
      }
    } catch (error) {
      console.error('Failed to reject:', error);
      toast.error('拒绝失败');
    }
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize);
    setPage(1); // 重置到第一页
  };

  if (loading && items.length === 0) {
    return <Loading text='加载中...' />;
  }

  return (
    <div className='space-y-4'>
      {items.length === 0 ? (
        <div className='border border-border rounded-lg p-12 bg-card'>
          <div className='text-center text-muted-foreground'>
            <Clock className='h-12 w-12 mx-auto mb-4 opacity-50' />
            <p>暂无待审核内容</p>
          </div>
        </div>
      ) : (
        <>
          <div className='space-y-4'>
            {items.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                className='border border-border rounded-lg p-6 bg-card hover:border-muted-foreground/50 transition-colors'
              >
                <div className='space-y-4'>
                  <div className='flex items-start justify-between'>
                    <div className='flex-1'>
                      <div className='flex items-center gap-2 mb-2'>
                        <Badge
                          variant={
                            item.type === 'topic' ? 'default' : 'secondary'
                          }
                        >
                          {item.type === 'topic' ? '话题' : '回复'}
                        </Badge>
                        <span className='text-sm text-muted-foreground'>
                          由 {item.username} 发布于{' '}
                          {new Date(item.createdAt).toLocaleString('zh-CN')}
                        </span>
                      </div>

                      {item.type === 'topic' ? (
                        <div>
                          <h3 className='text-lg font-semibold mb-2'>
                            {item.title}
                          </h3>
                          {item.content && (
                            <p className='text-sm text-muted-foreground mb-2 line-clamp-3'>
                              {item.content}
                            </p>
                          )}
                          <Link
                            href={`/topic/${item.id}`}
                            className='text-sm text-primary hover:underline'
                           
                          >
                            查看详情 →
                          </Link>
                        </div>
                      ) : (
                        <div>
                          <p className='text-sm text-muted-foreground mb-2'>
                            回复话题:{' '}
                            <Link
                              href={`/topic/${item.topicId}`}
                              className='text-primary hover:underline'
                             
                            >
                              {item.topicTitle}
                            </Link>
                          </p>
                          <p className='text-sm line-clamp-3'>{item.content}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className='flex gap-2'>
                    <Button
                      size='sm'
                      onClick={() => handleApprove(item.type, item.id)}
                      className='gap-2'
                    >
                      <CheckCircle className='h-4 w-4' />
                      批准
                    </Button>
                    <Button
                      size='sm'
                      variant='destructive'
                      onClick={() => handleReject(item.type, item.id)}
                      className='gap-2'
                    >
                      <XCircle className='h-4 w-4' />
                      拒绝
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 分页 */}
          {total > 0 && (
            <Pager
              total={total}
              page={page}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              pageSizeOptions={[10, 20, 50]}
            />
          )}
        </>
      )}
    </div>
  );
}
