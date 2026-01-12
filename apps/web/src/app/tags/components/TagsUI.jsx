'use client';

import { useState } from 'react';
import Link from '@/components/common/Link';
import { Badge } from '@/components/ui/badge';
import { Tag, Search, Hash } from 'lucide-react';
import { Input } from '@/components/ui/input';

/**
 * 标签列表 UI 组件
 * 支持即时搜索过滤
 */
export default function TagsUI({ tags = [] }) {
  const [searchQuery, setSearchQuery] = useState('');

  // 前端过滤标签
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
      {/* 头部区域：标题与搜索 */}
      <div className='flex flex-col md:flex-row md:items-end justify-between gap-6 mb-6 border-b border-border pb-4 px-3 sm:px-0'>
        <div>
          <h1 className='text-2xl font-semibold text-foreground mb-1'>
            标签广场
          </h1>
          <p className='text-sm text-muted-foreground'>
            探索 {tags.length} 个热门话题标签
          </p>
        </div>

        <div className='w-full md:w-72 relative'>
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none' />
          <Input
            placeholder='搜索标签 / Search tags...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='pl-9 bg-background focus-visible:ring-1'
          />
        </div>
      </div>

      {/* 标签列表 */}
      {filteredTags.length > 0 ? (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 sm:gap-4'>
          {filteredTags.map((tag) => (
            <TagCard key={tag.id} tag={tag} />
          ))}
        </div>
      ) : (
        <div className='text-center py-20 border-y sm:border border-border sm:rounded-lg bg-muted/20'>
          <Search className='h-12 w-12 text-muted-foreground/30 mx-auto mb-4' />
          <h3 className='text-lg font-medium text-foreground mb-1'>
            没有找到相关标签
          </h3>
          <p className='text-sm text-muted-foreground'>
            尝试更换搜索关键词
          </p>
        </div>
      )}
    </>
  );
}

function TagCard({ tag }) {
  return (
    <Link
      href={`/tags/${tag.slug}`}
      className='group flex flex-col h-full bg-card border-b border-x-0 sm:border border-border sm:rounded-lg px-3 py-4 sm:p-5 hover:bg-accent/50 sm:hover:border-primary/50 transition-all duration-200'
     
    >
      <div className='flex items-start justify-between mb-3'>
        <div className='flex items-center gap-2'>
          <div className='p-1.5 rounded-md bg-muted/50 text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors'>
            <Hash className='h-4 w-4' />
          </div>
          <h3 className='font-bold text-lg text-foreground group-hover:text-primary transition-colors'>
            {tag.name}
          </h3>
        </div>
        <Badge variant="secondary" className="font-normal text-xs bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
          {tag.topicCount} 话题
        </Badge>
      </div>
      
      {tag.description && (
        <p className='text-sm text-muted-foreground line-clamp-2 leading-relaxed'>
          {tag.description}
        </p>
      )}
      
      <div className='mt-auto pt-4 flex gap-2 overflow-hidden'>
         {/* 这里可以放一些相关的子标签或者补充信息，暂时留空保持简洁 */}
         <span className="text-xs text-muted-foreground/50 font-mono">
            #{tag.slug}
         </span>
      </div>
    </Link>
  );
}
