import Link from '@/components/common/Link';
import { formatCompactNumber } from '@/lib/utils';
import Time from '@/components/common/Time';
import { getTemplate } from '@/templates';
import { LAYOUTS } from '@/templates/constants';

export function CategoriesView({ categories }) {
  const SidebarLayout = getTemplate(LAYOUTS.SidebarLayout);

  return (
    <SidebarLayout>
      <div>
        <h1 className='text-2xl font-bold mb-6' style={{ fontFamily: 'var(--font-serif)' }}>
          所有分类
        </h1>

        {categories.length === 0 ? (
          <div className='text-center py-20 text-muted-foreground'>
            <p className='font-semibold'>暂无分类</p>
            <p className='text-sm mt-1'>还没有创建任何分类</p>
          </div>
        ) : (
          <div className='divide-y divide-border/60'>
            {categories.map((category) => (
              <div key={category.id}>
                <Link
                  href={`/categories/${category.slug}`}
                  className='flex items-center gap-4 py-5 hover:opacity-80 transition-opacity'
                >
                  <div className='w-10 h-10 rounded-full shrink-0' style={{ backgroundColor: category.color }} />
                  <div className='flex-1 min-w-0'>
                    <div className='font-semibold text-foreground'>{category.name}</div>
                    {category.description && (
                      <p className='text-sm text-muted-foreground line-clamp-1 mt-0.5'>{category.description}</p>
                    )}
                  </div>
                  <div className='text-right shrink-0 text-sm text-muted-foreground'>
                    <div>{formatCompactNumber(category.totalTopics || category.topicCount || 0)} 篇</div>
                    {category.latestTopic && (
                      <div className='mt-0.5 text-xs'>
                        <Time date={category.latestTopic.updatedAt} fromNow />
                      </div>
                    )}
                  </div>
                </Link>

                {category.subcategories?.length > 0 && (
                  <div className='ml-14 mb-3'>
                    {category.subcategories.map((sub) => (
                      <Link
                        key={sub.id}
                        href={`/categories/${sub.slug}`}
                        className='flex items-center gap-3 py-1.5 hover:opacity-80 transition-opacity'
                      >
                        <div className='w-2 h-2 rounded-full shrink-0' style={{ backgroundColor: sub.color }} />
                        <span className='text-sm'>{sub.name}</span>
                        <span className='text-xs text-muted-foreground ml-auto'>
                          {formatCompactNumber(sub.topicCount || 0)}
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
    </SidebarLayout>
  );
}
