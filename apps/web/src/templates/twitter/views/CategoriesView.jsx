import Link from '@/components/common/Link';
import StickyHeader from '../components/StickyHeader';
import { formatNumber } from '@/components/layout/Sidebar/SidebarUI';

export default function CategoriesView({ categories }) {
  return (
    <div>
      <StickyHeader title='分类' showBack={false} />

      {categories.length === 0 ? (
        <div className='text-center py-20 text-muted-foreground'>
          <p className='text-lg font-bold'>暂无分类</p>
          <p className='text-sm mt-1'>还没有创建任何分类</p>
        </div>
      ) : (
        <div>
          {categories.map((category) => (
            <div key={category.id}>
              <Link
                href={`/categories/${category.slug}`}
                className='flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors border-b border-border'
              >
                <div
                  className='w-10 h-10 rounded-full shrink-0'
                  style={{ backgroundColor: category.color }}
                />
                <div className='flex-1 min-w-0'>
                  <div className='font-bold text-[15px]'>{category.name}</div>
                  {category.description && (
                    <p className='text-[13px] text-muted-foreground line-clamp-1 mt-0.5'>
                      {category.description}
                    </p>
                  )}
                </div>
                <span className='text-[13px] text-muted-foreground shrink-0'>
                  {formatNumber(category.totalTopics || category.topicCount || 0)}
                </span>
              </Link>

              {category.subcategories?.length > 0 && (
                <div className='border-b border-border'>
                  {category.subcategories.map((sub) => (
                    <Link
                      key={sub.id}
                      href={`/categories/${sub.slug}`}
                      className='flex items-center gap-3 pl-16 pr-4 py-2.5 hover:bg-accent/30 transition-colors'
                    >
                      <div
                        className='w-2 h-2 rounded-full shrink-0'
                        style={{ backgroundColor: sub.color }}
                      />
                      <span className='text-sm truncate'>{sub.name}</span>
                      <span className='text-xs text-muted-foreground ml-auto shrink-0'>
                        {formatNumber(sub.topicCount || 0)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
