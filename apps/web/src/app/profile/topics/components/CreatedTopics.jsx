'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from '@/components/common/Link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TopicList } from '@/components/topic/TopicList';
import { topicApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { MessageSquare } from 'lucide-react';
import { Loading } from '@/components/common/Loading';
import { Pager } from '@/components/common/Pagination';

export function CreatedTopics() {
  const { user } = useAuth();
  
  const [topics, setTopics] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pinned, closed, pending
  const [sortBy, setSortBy] = useState('latest'); // latest, popular, trending
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 20;

  useEffect(() => {
    if (user?.id) {
      fetchTopics();
    }
  }, [user, filter, sortBy, page]);

  const fetchTopics = async () => {
    setIsLoading(true);
    try {
      const params = {
        userId: user.id,
        sort: sortBy,
        page,
        limit,
      };

      if (filter === 'pinned') {
        params.isPinned = true;
      } else if (filter === 'closed') {
        params.isClosed = true;
      } else if (filter === 'pending') {
        params.approvalStatus = 'pending';
      }

      const data = await topicApi.getList(params);
      setTopics(data.items || []);
      setTotalCount(data.total || 0);
      setTotalPages(Math.ceil((data.total || 0) / limit));
    } catch (error) {
      console.error('Error fetching topics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setPage(1);
  };

  const handleSortChange = (newSort) => {
    setSortBy(newSort);
    setPage(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className='space-y-4'>
      {/* 筛选和排序 */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
        {/* 快速筛选 */}
        <div className='flex items-center space-x-2 flex-wrap'>
          <Badge
            variant={filter === 'all' ? 'default' : 'outline'}
            className='cursor-pointer'
            onClick={() => handleFilterChange('all')}
          >
            全部
          </Badge>
          <Badge
            variant={filter === 'pinned' ? 'default' : 'outline'}
            className='cursor-pointer'
            onClick={() => handleFilterChange('pinned')}
          >
            置顶
          </Badge>
          <Badge
            variant={filter === 'closed' ? 'default' : 'outline'}
            className='cursor-pointer'
            onClick={() => handleFilterChange('closed')}
          >
            已关闭
          </Badge>
          <Badge
            variant={filter === 'pending' ? 'default' : 'outline'}
            className='cursor-pointer'
            onClick={() => handleFilterChange('pending')}
          >
            待审核
          </Badge>
        </div>

        {/* 排序选择 */}
        <div className='flex items-center gap-2'>
          <span className='text-sm text-muted-foreground'>排序:</span>
          <Select value={sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className='w-[140px]'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='latest'>最新发布</SelectItem>
              <SelectItem value='popular'>最多回复</SelectItem>
              <SelectItem value='trending'>最多浏览</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 加载状态 */}
      {isLoading ? (
        <Loading text='加载中...' className='py-12' />
      ) : topics.length > 0 ? (
        <>
          <Suspense fallback={<Loading text='加载中...' />}>
            <TopicList data={topics} />
          </Suspense>

          {totalPages > 1 && (
            <Pager
              total={totalCount}
              page={page}
              pageSize={limit}
              onPageChange={handlePageChange}
            />
          )}
        </>
      ) : (
        <div className='bg-card border border-border rounded-lg p-12 text-center'>
          <MessageSquare className='h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50' />
          <h3 className='text-lg font-medium text-card-foreground mb-2'>
            {filter === 'all'
              ? '还没有发布话题'
              : filter === 'pinned'
              ? '没有置顶的话题'
              : filter === 'closed'
              ? '没有已关闭的话题'
              : '没有待审核的话题'}
          </h3>
          <p className='text-muted-foreground mb-4'>
            {filter === 'all' && '开始你的第一个话题，与社区分享你的想法'}
          </p>
          {filter === 'all' && (
            <Link href='/create'>
              <Button>发布新话题</Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
