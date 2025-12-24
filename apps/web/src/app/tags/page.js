import { request } from '@/lib/server/api';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Tag } from 'lucide-react';

export const metadata = {
  title: '所有标签',
  description: '浏览社区中的所有话题标签',
};

async function getTags() {
  try {
    const data = await request('/tags?limit=100');
    return data.items || [];
  } catch (error) {
    console.error('Error fetching tags:', error);
    return [];
  }
}

export default async function TagsPage() {
  const tags = await getTags();

  return (
    <div className='container mx-auto px-4 py-8 max-w-5xl'>
        <div className="mb-8 p-6 bg-card rounded-lg border border-border">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Tag className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">标签广场</h1>
              <p className="mt-2 text-muted-foreground">探索社区中的热门话题标签</p>
            </div>
          </div>
        </div>

      {tags.length > 0 ? (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {tags.map((tag) => (
            <Link
              key={tag.id}
              href={`/tags/${tag.slug}`}
              className='group block h-full'
            >
              <div className='h-full p-4 rounded-lg border border-border bg-card hover:border-primary/50 transition-colors'>
                <div className='flex items-center justify-between mb-2'>
                  <Badge variant='outline' style={{ borderColor: tag.color, color: tag.color }}>
                     # {tag.slug}
                  </Badge>
                  <span className='text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full'>
                    {tag.topicCount} 话题
                  </span>
                </div>
                <h3 className='font-semibold text-lg group-hover:text-primary transition-colors'>
                  {tag.name}
                </h3>
                  {tag.description && (
                    <p className='text-sm text-muted-foreground mt-2 line-clamp-2'>
                      {tag.description}
                    </p>
                  )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className='text-center py-12 text-muted-foreground'>
          暂无标签
        </div>
      )}
    </div>
  );
}
