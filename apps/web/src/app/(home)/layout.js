import { getCategoriesData, getStatsData } from '@/lib/server/topics';
import { Sidebar } from '@/components/layout/Sidebar';
import StickySidebar from '@/components/common/StickySidebar';

export default async function HomeLayout({ children }) {
  // 并行获取分类和统计数据
  const [categories, stats] = await Promise.all([
    getCategoriesData({ isFeatured: true }),
    getStatsData(),
  ]);

  return (
    <div className='container mx-auto p-2 lg:px-4 lg:py-6'>
      <div className='flex lg:gap-6'>
        <div className='fixed z-10 -left-full lg:static lg:w-64 shrink-0'>
          <StickySidebar className='sticky top-[81px]'>
            <Sidebar categories={categories} stats={stats} />
          </StickySidebar>
        </div>
        <main className='flex-1 min-w-0 overflow-hidden'>{children}</main>
      </div>
    </div>
  );
}
