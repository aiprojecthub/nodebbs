import { Skeleton } from "@/components/ui/skeleton"

export function TopicSkeleton() {
  return (
    <div className='container mx-auto p-2 lg:px-4 lg:py-6'>
      <main className='flex gap-6'>
        {/* 主要内容区域 */}
        <div className='flex-1 min-w-0'>
          {/* 话题标题骨架 */}
          <div className="mb-6">
             <div className="flex items-start gap-3">
               <Skeleton className="h-6 w-6 mt-1.5 rounded-full" />
               <div className="flex-1 space-y-3">
                 <Skeleton className="h-9 w-3/4" />
                 <div className="flex gap-2">
                   <Skeleton className="h-4 w-16" />
                   <Skeleton className="h-4 w-24" />
                   <Skeleton className="h-4 w-32" />
                 </div>
               </div>
             </div>
          </div>

          {/* 话题内容骨架 */}
          <div className='bg-card border border-border rounded-lg mb-6 p-6 space-y-4'>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="pt-6 space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
            {/* 底部按钮 */}
            <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-border/50">
               <Skeleton className="h-8 w-16" />
               <Skeleton className="h-8 w-16" />
            </div>
          </div>

          {/* 回复列表骨架 - 模拟3条回复 */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
             <div className="p-4 border-b border-border flex justify-between">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-8 w-32" />
             </div>
             {[1, 2, 3].map((i) => (
               <div key={i} className="p-4 border-b border-border last:border-0 flex gap-3">
                  <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                     <div className="flex justify-between">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-10" />
                     </div>
                     <Skeleton className="h-4 w-full" />
                     <Skeleton className="h-4 w-2/3" />
                  </div>
               </div>
             ))}
          </div>
        </div>

        {/* 右侧边栏骨架 - 只在桌面端显示 */}
        <div className='hidden lg:block w-64 shrink-0 space-y-4'>
          {/* 操作按钮 */}
          <div className="flex gap-2">
            <Skeleton className="h-8 flex-1" />
            <Skeleton className="h-8 flex-1" />
            <Skeleton className="h-8 flex-1" />
          </div>

          {/* 作者卡片 */}
          <div className="h-28 rounded-lg bg-card border border-border p-4 flex flex-col gap-3">
             <div className="flex items-center gap-3">
               <Skeleton className="h-12 w-12 rounded-full" />
               <div className="space-y-2">
                 <Skeleton className="h-4 w-24" />
                 <Skeleton className="h-3 w-16" />
               </div>
             </div>
          </div>

          {/*分类*/}
          <Skeleton className="h-24 w-full rounded-lg" />
          
          {/*标签*/}
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      </main>
    </div>
  )
}
