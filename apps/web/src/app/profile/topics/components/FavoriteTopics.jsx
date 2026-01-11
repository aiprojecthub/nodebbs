'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from '@/components/common/Link';
import { useDebounce } from '@uidotdev/usehooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TopicList } from '@/components/topic/TopicList';
import { userApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Star, Search } from 'lucide-react';
import { Loading } from '@/components/common/Loading';
import { Pager } from '@/components/common/Pagination';

// 定义默认排序值，仅用于前端 UI 状态，不传给后端
const UI_DEFAULT_SORT = 'latest';

export function FavoriteTopics() {
  const { user } = useAuth();
  
  const [topics, setTopics] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [sort, setSort] = useState(UI_DEFAULT_SORT);
  
  const limit = 20;

  useEffect(() => {
    if (user?.id) {
      fetchFavorites();
    }
  }, [user, page, debouncedSearch, sort]);

  const fetchFavorites = async () => {
    setIsLoading(true);
    try {
      const params = {
        page,
        limit,
      };
      
      // 只有当排序不是默认值时才传给后端
      if (sort && sort !== UI_DEFAULT_SORT) {
        params.sort = sort;
      }
      
      if (debouncedSearch) {
        params.search = debouncedSearch;
      }

      const data = await userApi.getBookmarks(user.username, params);
      setTopics(data.items || []);
      setTotalCount(data.total || 0);
      setTotalPages(Math.ceil((data.total || 0) / limit));
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleSortChange = (value) => {
    setSort(value);
    setPage(1);
  };

  return (
    <div className='space-y-4'>
      {/* 筛选工具栏 */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索收藏..."
            value={search}
            onChange={handleSearchChange}
            className="pl-8"
          />
        </div>

        <div className='flex items-center gap-2'>
          <span className='text-sm text-muted-foreground'>排序:</span>
          <Select value={sort} onValueChange={handleSortChange}>
            <SelectTrigger className='w-[140px]'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UI_DEFAULT_SORT}>最近收藏</SelectItem>
              <SelectItem value='latest_topic'>最新发布</SelectItem>
              <SelectItem value='popular'>最热话题</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

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
          <Star className='h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50' />
          <h3 className='text-lg font-medium text-card-foreground mb-2'>
            {search ? '没有找到相关收藏' : '还没有收藏'}
          </h3>
          <p className='text-muted-foreground mb-4'>
            {search ? '换个关键词试试？' : '收藏你感兴趣的话题，方便以后查看'}
          </p>
          {!search && (
            <Link href='/'>
              <Button variant='outline'>去发现话题</Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
