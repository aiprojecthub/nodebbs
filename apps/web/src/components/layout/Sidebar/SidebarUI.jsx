import Link from '@/components/common/Link';
import { Tag, BarChart3, Users, MessageSquare } from 'lucide-react';

// 格式化数字显示
export function formatNumber(num) {
  if (!num) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString();
}

// 分类列表组件
export function CategoryList({ categories, currentPath }) {
  // categories 已经通过 isFeatured 参数从后端过滤，无需前端再次过滤
  const isActiveCategory = (categorySlug) => {
    return (
      currentPath === `/categories/${categorySlug}` ||
      currentPath?.startsWith(`/categories/${categorySlug}/`)
    );
  };

  return (
    <div className='border border-border rounded-lg bg-card'>
      <div className='px-4 py-3 border-b border-border'>
        <h3 className='text-sm font-semibold flex items-center gap-2'>
          <Tag className='h-4 w-4' />
          分类
        </h3>
      </div>
      <div className='p-2'>
        {categories.length === 0 ? (
          <div className='px-2 py-8 text-center text-sm text-muted-foreground'>
            暂无分类
          </div>
        ) : (
          <div className='space-y-1'>
            {categories.map((category) => {
              const isActive = isActiveCategory(category.slug);
              return (
                <Link
                  key={category.id}
                  href={`/categories/${category.slug}`}
                 
                  className={`flex items-center justify-between px-3 py-2 rounded-md transition-colors group ${
                    isActive
                      ? 'bg-muted font-medium text-foreground'
                      : 'hover:bg-muted/50 text-foreground'
                  }`}
                >
                  <div className='flex items-center gap-2 min-w-0'>
                    <div
                      className='w-3 h-3 rounded-sm shrink-0'
                      style={{ backgroundColor: category.color }}
                    ></div>
                    <span className='truncate'>{category.name}</span>
                  </div>
                  <span className='text-xs text-muted-foreground shrink-0 ml-2'>
                    {category.topicCount || 0}
                  </span>
                </Link>
              );
            })}

          </div>
        )}
      </div>
    </div>
  );
}

// 统计信息组件
export function StatsPanel({ stats }) {
  return (
    <div className='border border-border rounded-lg bg-card'>
      <div className='px-4 py-3 border-b border-border'>
        <h3 className='text-sm font-semibold flex items-center gap-2'>
          <BarChart3 className='h-4 w-4' />
          统计
        </h3>
      </div>
      <div className='p-4 space-y-3'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2 text-sm text-muted-foreground'>
            <MessageSquare className='h-4 w-4' />
            <span>话题</span>
          </div>
          <span className='text-sm font-semibold'>
            {formatNumber(stats.totalTopics)}
          </span>
        </div>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2 text-sm text-muted-foreground'>
            <MessageSquare className='h-4 w-4' />
            <span>回复</span>
          </div>
          <span className='text-sm font-semibold'>
            {formatNumber(stats.totalPosts)}
          </span>
        </div>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2 text-sm text-muted-foreground'>
            <Users className='h-4 w-4' />
            <span>用户</span>
          </div>
          <span className='text-sm font-semibold'>
            {formatNumber(stats.totalUsers)}
          </span>
        </div>
        <div className='flex items-center justify-between pt-2 border-t border-border'>
          <div className='flex items-center gap-2 text-sm text-muted-foreground'>
            <div className='h-2 w-2 bg-green-500 rounded-full animate-pulse'></div>
            <span>在线</span>
          </div>
          <span className='text-sm font-semibold text-green-600'>
            {formatNumber(stats.online?.total)}
          </span>
        </div>
      </div>
    </div>
  );
}

// 主 Sidebar UI 组件
export function SidebarUI({ categories, stats, currentPath }) {
  return (
    <div className='space-y-6'>
      <CategoryList categories={categories} currentPath={currentPath} />
      <StatsPanel stats={stats} />
    </div>
  );
}
