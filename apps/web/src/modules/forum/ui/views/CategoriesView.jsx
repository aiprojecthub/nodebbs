import Link from '@/components/common/Link';
import { Badge } from '@/components/ui/badge';
import { FolderKanban } from 'lucide-react';
import Time from '@/components/common/Time';
import SidebarLayout from '../layouts/SidebarLayout';

/**
 * 分类列表页
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
            <h3 className='text-base font-semibold text-foreground mb-1'>暂无分类</h3>
            <p className='text-sm text-muted-foreground'>还没有创建任何分类</p>
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
  return (
    <div className='bg-card border border-border rounded-lg p-5 hover:shadow-md transition-shadow'>
      <div className='flex items-start gap-3 mb-3'>
        <div
          className='w-3 h-3 rounded-sm mt-1.5 shrink-0'
          style={{ backgroundColor: category.color }}
        />
        <div className='flex-1 min-w-0'>
          <Link
            href={`/categories/${category.slug}`}
            className='text-base font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-2'
          >
            {category.name}
            {category.totalTopics > 0 && (
              <Badge variant='secondary' className='font-normal text-muted-foreground'>
                {category.totalTopics}
              </Badge>
            )}
          </Link>
          {category.description && (
            <p className='text-sm text-muted-foreground mt-1 line-clamp-2'>{category.description}</p>
          )}
        </div>
      </div>

      {category.subcategories && category.subcategories.length > 0 && (
        <div className='mb-3 flex flex-wrap gap-2 pl-6'>
          {category.subcategories.map((sub) => (
            <Link key={sub.id} href={`/categories/${sub.slug}`}>
              <Badge
                variant='secondary'
                className='text-xs font-normal rounded-full px-2.5 bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors'
              >
                {sub.name}
              </Badge>
            </Link>
          ))}
        </div>
      )}

      <div className='pl-6 pt-3 border-t border-border/40'>
        {category.latestTopic ? (
          <div className='flex items-center justify-between gap-4 text-xs'>
            <Link href={`/topic/${category.latestTopic.id}`} className='truncate text-foreground/80 hover:text-primary'>
              {category.latestTopic.title}
            </Link>
            <Time date={category.latestTopic.updatedAt} fromNow className='text-muted-foreground shrink-0' />
          </div>
        ) : (
          <span className='text-xs text-muted-foreground'>暂无动态</span>
        )}
      </div>
    </div>
  );
}
