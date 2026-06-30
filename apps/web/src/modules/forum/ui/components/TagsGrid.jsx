'use client';

import { useState } from 'react';
import Link from '@/components/common/Link';
import { Badge } from '@/components/ui/badge';
import { Search, Hash } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function TagsGrid({ tags = [] }) {
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
      <div className='flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4'>
        <div>
          <h1 className='text-2xl font-bold text-foreground mb-1'>标签广场</h1>
          <p className='text-sm text-muted-foreground'>
            探索 {tags.length} 个热门话题标签
          </p>
        </div>
        <div className='w-full md:w-64 relative'>
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none' />
          <Input
            placeholder='搜索标签'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='pl-9'
          />
        </div>
      </div>

      {filteredTags.length > 0 ? (
        <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
          {filteredTags.map((tag) => (
            <Link
              key={tag.id}
              href={`/tags/${tag.slug}`}
              className='group flex flex-col h-full bg-card border border-border rounded-lg p-5 hover:shadow-md transition-shadow'
            >
              <div className='flex items-start justify-between'>
                <div className='flex items-center gap-2'>
                  <div className='p-1.5 rounded-md bg-muted/50 text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors'>
                    <Hash className='h-4 w-4' />
                  </div>
                  <h3 className='font-bold text-lg text-foreground group-hover:text-primary transition-colors'>
                    {tag.name}
                  </h3>
                </div>
                <Badge
                  variant='secondary'
                  className='font-normal text-xs bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors'
                >
                  {tag.topicCount} 话题
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className='bg-card border border-border rounded-lg text-center py-16'>
          <Search className='h-12 w-12 text-muted-foreground/30 mx-auto mb-4' />
          <h3 className='text-lg font-medium text-foreground mb-1'>没有找到相关标签</h3>
          <p className='text-sm text-muted-foreground'>尝试更换搜索关键词</p>
        </div>
      )}
    </>
  );
}
