'use client';

import { useSearch } from '@/hooks/useSearch';
import { SearchUI } from './SearchUI';

/**
 * 搜索页面布局组件
 * 消费 useSearch Hook，将数据传递给 SearchUI
 */
export default function SearchLayout() {
  const {
    searchQuery,
    searchType,
    setSearchType,
    loading,
    searchResults,
    loadTypePage,
  } = useSearch();

  return (
    <SearchUI
      searchQuery={searchQuery}
      searchType={searchType}
      onSearchTypeChange={setSearchType}
      loading={loading}
      searchResults={searchResults}
      onLoadPage={loadTypePage}
    />
  );
}
