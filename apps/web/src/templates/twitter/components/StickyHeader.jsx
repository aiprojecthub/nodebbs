'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function StickyHeader({ title, subtitle, showBack = true, children }) {
  const router = useRouter();

  return (
    <div className='sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border'>
      <div className='flex items-center gap-4 px-4 h-[53px]'>
        {showBack && (
          <button
            onClick={() => router.back()}
            className='p-1.5 -ml-1.5 rounded-full hover:bg-accent/60 transition-colors'
            aria-label='返回'
          >
            <ArrowLeft className='h-5 w-5' />
          </button>
        )}
        <div className='min-w-0'>
          <h1 className='text-xl font-bold leading-tight truncate'>{title}</h1>
          {subtitle && (
            <p className='text-[13px] text-muted-foreground leading-tight'>{subtitle}</p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
