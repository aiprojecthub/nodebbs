'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { topicApi } from '@/lib/api';
import { toast } from 'sonner';
import { Loading } from '@/components/common/Loading';
import { TopicListUI } from './TopicListUI';

/**
 * 统一的话题列表组件 (TopicList)
 * 支持三种模式：
 * 1. 客户端自动获取 (Client Fetch): 不传 data/initialData，自动根据 URL 参数请求 API。
 * 2. 完全受控 (Controlled): 传入 data 和 onPageChange，由父组件管理数据和分页。
 * 3. 服务端渲染 (SSR/Hydration): 传入 initialData 和 useUrlPagination=true，数据由父组件(Page)传入，分页通过 URL 驱动。
 */
export default function TopicList({
  // 数据源 (统一使用 data)
  data,
  
  // 初始数据 (用于 SSR 模式，统一使用 initialData)
  initialData,
  
  // 状态控制
  loading: controlledLoading,
  error: controlledError,
  
  // 分页数据
  total: controlledTotal,
  page: controlledPage,
  totalPages: controlledTotalPages,
  
  // 配置
  defaultParams = {},
  limit = 20,
  showPagination = true,
  
  // 行为与回调
  useUrlPagination = false, // 是否使用 URL 分页 (SSR 模式设为 true)
  onDataLoaded,
  onPageChange: externalPageChange,
  
  // 皮肤配置
  uiComponent: UIComponent = TopicListUI, // 允许注入自定义 UI 组件，默认为标准列表
  itemInserts, // 插入内容映射 { index: ReactNode }
  ...restProps // 透传给 UI 组件的其他属性
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 1. 确定数据源模式
  // 优先使用 data，其次 initialData
  const inputTopics = data || initialData;
  
  // 是否有外部数据传入 (Controlled 或 SSR 模式)
  const hasExternalData = inputTopics !== undefined;
  
  // 如果指定了 initialData 且启用了 URL 分页，则视为 SSR 模式
  // 这种模式下，虽然有外部数据，但我们希望行为像"自动获取"一样响应 URL 变化（实际上是页面刷新）
  const isSSRMode = initialData !== undefined && useUrlPagination;

  // 2. 本地状态管理 (主要用于 Client Fetch 模式)
  const [fetchedTopics, setFetchedTopics] = useState([]);
  const [loading, setLoading] = useState(!hasExternalData);
  const [error, setError] = useState(null);
  const [fetchedTotalPages, setFetchedTotalPages] = useState(1);
  const [fetchedTotal, setFetchedTotal] = useState(0);

  // URL 当前页码
  const urlPage = parseInt(searchParams.get('p') || '1', 10);
  // 本地页码状态 (如果使用 URL 分页，则同步 URL；否则使用 props 或默认值)
  const [internalPage, setInternalPage] = useState(urlPage);

  // 3. 计算最终显示的数据
  const displayTopics = hasExternalData ? inputTopics : fetchedTopics;
  const displayLoading = controlledLoading !== undefined ? controlledLoading : loading;
  const displayError = controlledError !== undefined ? controlledError : error;
  
  const displayTotal = controlledTotal ?? (hasExternalData ? (isSSRMode ? controlledTotal : inputTopics.length) : fetchedTotal);
  
  // 页码逻辑：
  // - 如果是 URL 分页模式 (SSR 或 ClientFetch)，使用 urlPage
  // - 如果是受控模式且传了 page，使用 controlledPage
  // - 否则使用 internalPage
  const shouldUseUrlPage = useUrlPagination || (!hasExternalData);
  const displayPage = shouldUseUrlPage ? urlPage : (controlledPage ?? internalPage);

  // 总页数逻辑
  const displayTotalPages = controlledTotalPages ?? (
    hasExternalData 
      ? (isSSRMode ? Math.ceil(displayTotal / limit) : Math.max(1, Math.ceil(displayTotal / limit))) 
      : fetchedTotalPages
  );

  // 4. 数据获取逻辑 (仅 Client Fetch 模式)
  useEffect(() => {
    // 如果有外部数据，不需要自己 fetch
    if (hasExternalData) return;

    const fetchTopics = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = {
          page: displayPage,
          limit,
          ...defaultParams,
        };

        const res = await topicApi.getList(params);
        setFetchedTopics(res.items);
        setFetchedTotal(res.total);
        setFetchedTotalPages(Math.ceil(res.total / res.limit));

        if (onDataLoaded) {
          onDataLoaded(res);
        }
      } catch (err) {
        console.error('获取话题列表失败:', err);
        setError(err.message);
        toast.error(err.message || '获取话题列表失败');
      } finally {
        setLoading(false);
      }
    };

    fetchTopics();
  }, [displayPage, hasExternalData, limit, JSON.stringify(defaultParams)]);

  // 5. 分页处理逻辑
  const handlePageChange = (newPage) => {
    // 策略 A: URL 分页 (SSR 模式 或 Client Fetch 模式)
    if (shouldUseUrlPage) {
      const params = new URLSearchParams(searchParams.toString());
      if (newPage === 1) {
        params.delete('p');
      } else {
        params.set('p', newPage.toString());
      }
      
      const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      
      // 注意：SSR 模式下跳转会导致页面刷新/重载数据
      // Client Fetch 模式下会触发 useEffect 重新 fetch
      router.push(newUrl, { scroll: false });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // 策略 B: 纯回调 (完全受控模式)
    if (externalPageChange) {
      externalPageChange(newPage);
    }
    
    // 策略 C: 本地状态更新 (半受控模式，例如 Tab 内部自管理)
    setInternalPage(newPage);
  };

  // 6. 渲染
  if (displayLoading) {
    return <Loading text='加载中...' className='py-16' />;
  }

  if (displayError) {
    return (
      <div className='text-center py-16 border border-border rounded-lg bg-card'>
        <div className='text-destructive font-semibold mb-2'>加载失败</div>
        <p className='text-sm text-muted-foreground mb-4'>{displayError}</p>
        {!hasExternalData && (
          <Button size='sm' onClick={() => window.location.reload()}>
            重试
          </Button>
        )}
      </div>
    );
  }

  return (
    <UIComponent
      topics={displayTopics}
      totalTopics={displayTotal}
      currentPage={displayPage}
      totalPages={displayTotalPages}
      limit={limit}
      showPagination={showPagination}
      onPageChange={handlePageChange}
      itemInserts={itemInserts}
      {...restProps}
    />
  );
}
