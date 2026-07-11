import Link from '@/components/common/Link';
import Time from '@/components/common/Time';
import { FolderKanban, MessageSquare, CornerDownRight } from 'lucide-react';
import SidebarLayout from '../layouts/SidebarLayout';

/**
 * 分类列表页（版块导航）
 */
export function CategoriesView({ categories }) {

  return (
    <SidebarLayout>
      <div>
        <div className='flex items-end justify-between mb-4'>
          <h1 className='text-2xl font-bold text-foreground'>版块导航</h1>
        </div>

        {categories.length === 0 ? (
          <div className='bg-card border border-border rounded-lg text-center py-16'>
            <FolderKanban className='h-12 w-12 text-muted-foreground/40 mx-auto mb-4' />
            <h3 className='text-base font-semibold text-foreground mb-1'>暂无版块</h3>
            <p className='text-sm text-muted-foreground'>还没有创建任何版块</p>
          </div>
        ) : (
          <div className='flex flex-col gap-3'>
            {categories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}

function CategoryCard({ category }) {
  const subcategories = category.subcategories || [];

  return (
    <div className='relative bg-card border border-border rounded-lg p-4 sm:p-5 pl-5 sm:pl-6 hover:border-primary/30 hover:shadow-sm transition-all'>
      {/* 左侧色条：版块识别锚点 */}
      <span
        aria-hidden
        className='absolute inset-y-0 left-0 w-1 rounded-l-lg'
        style={{ backgroundColor: category.color || 'var(--color-primary)' }}
      />

      {/* 主体：版块名 + 描述（左） / 统计（右），整块跳转版块 */}
      <Link href={`/categories/${category.slug}`} className='group block'>
        <div className='flex items-start justify-between gap-4'>
          <div className='min-w-0'>
            <h2 className='text-base font-semibold text-foreground group-hover:text-primary transition-colors truncate'>
              {category.name}
            </h2>
            {category.description && (
              <p className='text-sm text-muted-foreground mt-1 line-clamp-2'>{category.description}</p>
            )}
          </div>

          <div className='flex items-start gap-4 sm:gap-6 shrink-0'>
            <CategoryStat value={category.totalTopics} label='主题' />
            <CategoryStat value={category.totalPosts} label='帖子' />
          </div>
        </div>
      </Link>

      {/* 子版块：作为可导航的子版面（带各自主题数），而非标签 */}
      {subcategories.length > 0 && (
        <div className='mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs'>
          <span className='inline-flex items-center gap-1 text-muted-foreground/70'>
            <CornerDownRight className='w-3 h-3' />
            子版块
          </span>
          {subcategories.map((sub) => (
            <Link
              key={sub.id}
              href={`/categories/${sub.slug}`}
              className='text-muted-foreground hover:text-primary transition-colors'
            >
              {sub.name}
              {sub.totalTopics > 0 && (
                <span className='ml-1 text-muted-foreground/50 tabular-nums'>{sub.totalTopics}</span>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* 最新动态：独立成行、可点击跳转 */}
      <div className='mt-3 pt-3 border-t border-border/40'>
        {category.latestTopic ? (
          <Link
            href={`/topic/${category.latestTopic.id}`}
            className='group/last flex items-center gap-2 text-xs'
          >
            <MessageSquare className='w-3.5 h-3.5 text-muted-foreground/70 shrink-0' />
            <span className='truncate text-foreground/75 group-hover/last:text-primary transition-colors'>
              {category.latestTopic.title}
            </span>
            <Time date={category.latestTopic.updatedAt} fromNow className='ml-auto shrink-0 text-muted-foreground' />
          </Link>
        ) : (
          <span className='inline-flex items-center gap-2 text-xs text-muted-foreground/70'>
            <MessageSquare className='w-3.5 h-3.5' />
            暂无动态
          </span>
        )}
      </div>
    </div>
  );
}

function CategoryStat({ value, label }) {
  return (
    <div className='text-center min-w-[2.25rem]'>
      <div className='text-sm font-semibold text-foreground tabular-nums leading-tight'>{value ?? 0}</div>
      <div className='text-[11px] text-muted-foreground mt-0.5'>{label}</div>
    </div>
  );
}
