import { Skeleton } from '@/components/ui/skeleton';

export function TopicSkeleton() {
  return (
    <div className='flex justify-center'>
      <div className='w-full max-w-[1100px] px-6 lg:px-10 py-8'>
        {/* 标题区 */}
        <div className='pt-8 sm:pt-12 mb-6'>
          <Skeleton className='h-4 w-20 mb-4' />
          <Skeleton className='h-10 sm:h-12 w-full mb-2' />
          <Skeleton className='h-10 sm:h-12 w-3/4 mb-4' />

          {/* 作者栏 + 操作栏：桌面端水平两端对齐，移动端垂直 */}
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-4'>
            <div className='flex items-center gap-3'>
              <Skeleton className='h-10 w-10 rounded-full shrink-0' />
              <div className='space-y-2'>
                <Skeleton className='h-4 w-28' />
                <Skeleton className='h-3 w-36' />
              </div>
            </div>
            <div className='flex gap-2'>
              <Skeleton className='h-8 w-16 rounded-full' />
              <Skeleton className='h-8 w-16 rounded-full' />
              <Skeleton className='h-8 w-8 rounded-full' />
            </div>
          </div>
        </div>

        {/* 分隔线 */}
        <div className='border-b border-border/60 mb-8' />

        {/* 正文 */}
        <div className='space-y-4 mb-8'>
          <Skeleton className='h-4 w-full' />
          <Skeleton className='h-4 w-full' />
          <Skeleton className='h-4 w-5/6' />
          <div className='pt-4 space-y-4'>
            <Skeleton className='h-4 w-full' />
            <Skeleton className='h-4 w-full' />
            <Skeleton className='h-4 w-2/3' />
          </div>
          <div className='pt-4 space-y-4'>
            <Skeleton className='h-4 w-full' />
            <Skeleton className='h-4 w-4/5' />
          </div>
        </div>

        {/* 底部操作 */}
        <div className='border-t border-border/60 pt-4 mb-8 flex gap-2'>
          <Skeleton className='h-8 w-16' />
          <Skeleton className='h-8 w-16' />
        </div>

        {/* 回复区 */}
        <div className='border-t border-border/60 pt-8 space-y-6'>
          <Skeleton className='h-5 w-20' />
          {[1, 2, 3].map((i) => (
            <div key={i} className='flex gap-3'>
              <Skeleton className='h-9 w-9 rounded-full shrink-0' />
              <div className='flex-1 space-y-2'>
                <Skeleton className='h-4 w-28' />
                <Skeleton className='h-3 w-16' />
                <Skeleton className='h-4 w-full mt-2' />
                <Skeleton className='h-4 w-2/3' />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
