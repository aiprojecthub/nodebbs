import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, X, User, FileText, Hash } from 'lucide-react';
import Link from '@/components/common/Link';
import { SearchTopicsTab } from './SearchTopicsTab';
import { SearchPostsTab } from './SearchPostsTab';
import { SearchUsersTab } from './SearchUsersTab';

/**
 * 搜索页面主 UI 组件
 * 纯展示组件，组合各 Tab 组件
 */
export function SearchUI({
  searchQuery,
  searchType,
  onSearchTypeChange,
  loading,
  loadingTypes,
  searchResults,
  onLoadPage,
}) {
  return (
    <>
      {/* 搜索标题 */}
      <div className='mb-6'>
        <div className='flex items-center space-x-3 mb-2'>
          <Search className='h-6 w-6 text-foreground' />
          <h1 className='text-2xl font-bold text-foreground'>搜索结果</h1>
        </div>

        {searchQuery && (
          <div className='flex items-center space-x-2 mt-3'>
            <span className='text-muted-foreground'>搜索关键词:</span>
            <Badge variant='secondary' className='text-base px-3 py-1'>
              {searchQuery}
            </Badge>
            <Link href='/search'>
              <Button variant='ghost' size='sm' className='h-7'>
                <X className='h-4 w-4' />
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* 搜索类型标签页 */}
      {searchQuery && (
        <Tabs value={searchType} onValueChange={onSearchTypeChange} className='mb-6'>
          <TabsList>
            <TabsTrigger value='topics' className='flex items-center gap-1.5'>
              <FileText className='h-4 w-4' />
              <span>话题</span>
              {!loading && searchResults.topics.total > 0 && (
                <span className='text-xs opacity-70'>
                  ({searchResults.topics.total})
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value='posts' className='flex items-center gap-1.5'>
              <Hash className='h-4 w-4' />
              <span>回复</span>
              {!loading && searchResults.posts.total > 0 && (
                <span className='text-xs opacity-70'>
                  ({searchResults.posts.total})
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value='users' className='flex items-center gap-1.5'>
              <User className='h-4 w-4' />
              <span>用户</span>
              {!loading && searchResults.users.total > 0 && (
                <span className='text-xs opacity-70'>
                  ({searchResults.users.total})
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* 话题结果 */}
          {searchType === 'topics' && (
            <TabsContent value='topics'>
              <SearchTopicsTab
                loading={loading}
                typeLoading={loadingTypes.topics}
                results={searchResults.topics}
                onLoadPage={onLoadPage}
              />
            </TabsContent>
          )}

          {/* 回复结果 */}
          {searchType === 'posts' && (
            <TabsContent value='posts'>
              <SearchPostsTab
                loading={loading}
                typeLoading={loadingTypes.posts}
                results={searchResults.posts}
                onLoadPage={onLoadPage}
              />
            </TabsContent>
          )}

          {/* 用户结果 */}
          {searchType === 'users' && (
            <TabsContent value='users'>
              <SearchUsersTab
                loading={loading}
                typeLoading={loadingTypes.users}
                results={searchResults.users}
                onLoadPage={onLoadPage}
              />
            </TabsContent>
          )}
        </Tabs>
      )}

      {/* 空搜索状态 */}
      {!searchQuery && (
        <div className='text-center py-20 bg-card border border-border rounded-lg'>
          <Search className='h-16 w-16 text-muted-foreground/50 mx-auto mb-4' />
          <div className='text-xl font-medium text-foreground mb-2'>
            请输入搜索关键词
          </div>
          <p className='text-sm text-muted-foreground max-w-md mx-auto'>
            在顶部搜索框中输入关键词来搜索话题、回复和用户
          </p>
        </div>
      )}
    </>
  );
}
