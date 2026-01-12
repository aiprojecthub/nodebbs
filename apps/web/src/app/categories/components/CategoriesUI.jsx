import Link from '@/components/common/Link';
import { Badge } from '@/components/ui/badge';
import { Tag, MessageSquare, Eye } from 'lucide-react';
import Time from '@/components/common/Time';
import { Loading } from '@/components/common/Loading';

/**
 * 分类列表 UI 组件 - GitHub 风格
 * 强调清晰、技术感和信息密度
 */
export function CategoriesUI({ categories, loading, error }) {
  if (error) {
    return (
      <div className='flex-1 flex items-center justify-center text-red-500'>
        加载失败: {error.message}
      </div>
    );
  }

  return (
    <>
      <div className='flex flex-col sm:flex-row sm:items-end justify-between mb-4 sm:mb-6 gap-4 border-b border-border pb-4 px-3 sm:px-0'>
        <div>
          <h1 className='text-2xl font-semibold text-foreground mb-1'>
            版块导航
          </h1>

        </div>
      </div>

      {loading ? (
        <Loading text='加载中...' className='flex-row py-20' />
      ) : categories.length === 0 ? (
        <div className='text-center py-24 border-y sm:border border-border sm:rounded-md bg-muted/20'>
          <Tag className='h-12 w-12 text-muted-foreground/40 mx-auto mb-4' />
          <h3 className='text-base font-semibold text-foreground mb-1'>
            暂无分类
          </h3>
          <p className='text-sm text-muted-foreground'>还没有创建任何分类</p>
        </div>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 gap-0 sm:gap-4'>
          {categories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      )}
    </>
  );
}

function CategoryCard({ category }) {
  return (
    <div className='flex flex-col bg-card border-b border-x-0 sm:border border-border sm:rounded-md px-3 py-4 sm:p-4 hover:bg-accent/50 sm:hover:border-primary/50 transition-colors'>
      <div className='flex items-start gap-3 mb-3'>
        {/* 图标 */}
        <div
          className='w-8 h-8 rounded shrink-0 flex items-center justify-center text-white font-bold text-sm'
          style={{ backgroundColor: category.color }}
        >
          {category.name.charAt(0).toUpperCase()}
        </div>
        
        <div className='flex-1 min-w-0'>
           {/* 标题 */}
          <Link
            href={`/categories/${category.slug}`}
            className='text-base font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-2'
           
          >
            {category.name}
            {/* 统计 - 显示包含子分类的总话题数 */}
            {category.totalTopics > 0 && (
              <span className='inline-flex items-center gap-1 text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full' title='总话题数（包含子版块）'>
                {category.totalTopics}
              </span>
            )}
          </Link>
          
          {/* 描述 */}
          {category.description && (
            <p className='text-sm text-muted-foreground mt-1 line-clamp-2'>
              {category.description}
            </p>
          )}
        </div>
      </div>

      {/* 子分类 - 类似 GitHub Topics */}
      {category.subcategories && category.subcategories.length > 0 && (
        <div className='mb-4 flex flex-wrap gap-2 pl-11'>
            {category.subcategories.map((sub) => (
            <Link key={sub.id} href={`/categories/${sub.slug}`}>
                <Badge 
                    variant="secondary" 
                    className='text-xs font-normal border-0 rounded-full px-2.5 bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors'
                >
                {sub.name}
                </Badge>
            </Link>
            ))}
        </div>
      )}

      {/* 底部 - 最新动态 */}
      <div className='mt-auto pl-11 pt-3 border-t border-border/40'>
         {category.latestTopic ? (
            <div className='flex items-center justify-between gap-4 text-xs'>
                <Link
                    href={`/topic/${category.latestTopic.id}`}
                    className='truncate text-foreground/80 hover:text-primary'
                   
                >
                     {category.latestTopic.title}
                </Link>
                <Time date={category.latestTopic.updatedAt} fromNow className="text-muted-foreground shrink-0"/>
            </div>
         ) : (
             <span className="text-xs text-muted-foreground">暂无动态</span>
         )}
      </div>
    </div>
  );
}
