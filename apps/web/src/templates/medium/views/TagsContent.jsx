'use client';

import { useState } from 'react';
import Link from '@/components/common/Link';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';
import { formatCompactNumber } from '@/lib/utils';

export default function TagsContent({ tags = [] }) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTags = tags.filter((tag) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      tag.name.toLowerCase().includes(q) ||
      tag.slug.toLowerCase().includes(q) ||
      (tag.description && tag.description.toLowerCase().includes(q))
    );
  });

  return (
    <>
      {/* 搜索 */}
      <div className='relative mb-6'>
        <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 pointer-events-none' />
        <input
          type='text'
          placeholder='搜索标签...'
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className='w-full max-w-sm h-10 pl-9 pr-3 rounded-full bg-muted/50 text-sm outline-none focus:bg-muted transition-colors border-none placeholder:text-muted-foreground/50'
        />
      </div>

      {filteredTags.length > 0 ? (
        <div className='flex flex-wrap gap-3'>
          {filteredTags.map((tag) => (
            <Link key={tag.id} href={`/tags/${tag.slug}`}>
              <Badge
                variant='secondary'
                className='rounded-full px-4 py-2 text-sm font-normal bg-muted/60 hover:bg-muted transition-colors cursor-pointer'
              >
                {tag.name}
                <span className='ml-2 text-muted-foreground/60'>
                  {formatCompactNumber(tag.topicCount || 0)}
                </span>
              </Badge>
            </Link>
          ))}
        </div>
      ) : (
        <div className='text-center py-16'>
          <p className='text-muted-foreground'>没有找到相关标签</p>
        </div>
      )}
    </>
  );
}
