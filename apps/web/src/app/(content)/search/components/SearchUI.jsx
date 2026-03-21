import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search } from 'lucide-react';
import { SearchTopicsTab } from './SearchTopicsTab';
import { SearchPostsTab } from './SearchPostsTab';
import { SearchUsersTab } from './SearchUsersTab';

/**
 * 搜索页面主 UI 组件
 * 简洁设计：无标题头部、懒加载 Tab
 */
export function SearchUI({
  searchQuery,
  searchType,
  onSearchTypeChange,
  loading,
  searchResults,
  onLoadPage,
}) {
  // 空搜索状态
  if (!searchQuery) {
    return (
      <div className='text-center py-20 mx-3 sm:mx-0 bg-card border border-border rounded-lg'>
        <Search className='h-16 w-16 text-muted-foreground/50 mx-auto mb-4' />
        <div className='text-xl font-medium text-foreground mb-2'>
          请输入搜索关键词
        </div>
        <p className='text-sm text-muted-foreground max-w-md mx-auto'>
          在顶部搜索框中输入关键词来搜索话题、回复和用户
        </p>
      </div>
    );
  }

  return (
    <div className='space-y-3'>
      <Tabs value={searchType} onValueChange={onSearchTypeChange} className='gap-3'>
        <TabsList className='mx-3 sm:mx-0'>
          <TabsTrigger value='topics'>话题</TabsTrigger>
          <TabsTrigger value='posts'>回复</TabsTrigger>
          <TabsTrigger value='users'>用户</TabsTrigger>
        </TabsList>

        <TabsContent value='topics'>
          <SearchTopicsTab
            loading={loading}
            results={searchResults}
            onLoadPage={onLoadPage}
            searchQuery={searchQuery}
          />
        </TabsContent>

        <TabsContent value='posts'>
          <SearchPostsTab
            loading={loading}
            results={searchResults}
            onLoadPage={onLoadPage}
            searchQuery={searchQuery}
          />
        </TabsContent>

        <TabsContent value='users'>
          <SearchUsersTab
            loading={loading}
            results={searchResults}
            onLoadPage={onLoadPage}
            searchQuery={searchQuery}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
