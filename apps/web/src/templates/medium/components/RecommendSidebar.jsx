import Link from '@/components/common/Link';
import { Badge } from '@/components/ui/badge';
import { formatCompactNumber } from '@/lib/utils';

/**
 * Medium 模板右侧推荐栏
 * 推荐标签 + 社区统计
 */
export default function RecommendSidebar({ stats, tags }) {
  return (
    <div className='space-y-8'>
      {/* 推荐话题标签 */}
      {tags?.length > 0 && (
        <div>
          <h3 className='text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4'>
            推荐标签
          </h3>
          <div className='flex flex-wrap gap-2'>
            {tags.map((tag) => (
              <Link key={tag.id || tag.slug} href={`/tags/${tag.slug}`}>
                <Badge
                  variant='secondary'
                  className='rounded-full px-3 py-1.5 text-[13px] font-normal bg-muted/60 hover:bg-muted transition-colors cursor-pointer'
                >
                  {tag.name}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 分隔线 */}
      <div className='border-t border-border/60' />

      {/* 统计 */}
      {stats && (
        <div className='text-xs text-muted-foreground/60 space-y-1'>
          <div>{formatCompactNumber(stats.totalUsers)} 位创作者</div>
          <div>{formatCompactNumber(stats.totalTopics)} 篇文章</div>
          {stats.online?.total > 0 && (
            <div className='flex items-center gap-1'>
              <span className='inline-block h-1.5 w-1.5 bg-green-500 rounded-full' />
              {formatCompactNumber(stats.online.total)} 在线
            </div>
          )}
        </div>
      )}
    </div>
  );
}
