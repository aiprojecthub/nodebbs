'use client';

import { useSearch } from '@/hooks/useSearch';
import { SearchContent as SharedSearchContent } from '@/app/(main)/search/components/SearchContent';

export default function SearchContent() {
  const {
    searchQuery,
    searchType,
    setSearchType,
    loading,
    searchResults,
    loadTypePage,
  } = useSearch();

  return (
    <SharedSearchContent
      searchQuery={searchQuery}
      searchType={searchType}
      onSearchTypeChange={setSearchType}
      loading={loading}
      searchResults={searchResults}
      onLoadPage={loadTypePage}
    />
  );
}
