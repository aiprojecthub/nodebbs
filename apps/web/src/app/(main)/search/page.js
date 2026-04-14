import { Suspense } from 'react';
import { getTemplate } from '@/templates';
import { Loading } from '@/components/common/Loading';

/**
 * 搜索页面入口
 * 使用 Suspense 包裹客户端组件以支持 useSearchParams
 */
export default function SearchPage() {
  const SearchView = getTemplate('SearchView');

  return (
    <div className='py-3 sm:py-6 lg:px-4'>
      <Suspense fallback={<Loading text='加载中...' />}>
        <SearchView />
      </Suspense>
    </div>
  );
}
