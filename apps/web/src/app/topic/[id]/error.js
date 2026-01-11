'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import Link from '@/components/common/Link';

export default function TopicErrorPage({ error, reset }) {
  useEffect(() => {
    // 记录错误到控制台（生产环境可发送到错误追踪服务）
    console.error('[话题详情页错误]', error);
  }, [error]);

  return (
    <div className='container mx-auto px-4 py-16 flex-1'>
      <div className='max-w-md mx-auto text-center'>
        <div className='flex justify-center mb-6'>
          <AlertCircle className='w-16 h-16 text-destructive' />
        </div>
        
        <h1 className='text-2xl font-bold mb-4'>加载失败</h1>
        
        <p className='text-muted-foreground mb-8'>
          抱歉，话题加载时出现问题。这可能是网络问题或服务器暂时不可用。
        </p>
        
        <div className='flex flex-col sm:flex-row gap-3 justify-center'>
          <Button onClick={() => reset()} variant='default'>
            <RefreshCw className='w-4 h-4 mr-2' />
            重试
          </Button>
          
          <Button asChild variant='outline'>
            <Link href='/'>
              <Home className='w-4 h-4 mr-2' />
              返回首页
            </Link>
          </Button>
        </div>
        
        {process.env.NODE_ENV === 'development' && error?.message && (
          <div className='mt-8 p-4 bg-muted rounded-lg text-left'>
            <p className='text-sm font-mono text-destructive break-all'>
              {error.message}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
