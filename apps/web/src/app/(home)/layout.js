import { getCategoriesData, getStatsData } from '@/lib/server/topics';
import { Sidebar } from '@/components/layout/Sidebar';
import StickySidebar from '@/components/common/StickySidebar';
import { AdSlot } from '@/extensions/ads/components';

export default async function HomeLayout({ children }) {
  // 并行获取分类和统计数据
  const [categories, stats] = await Promise.all([
    getCategoriesData({ isFeatured: true }),
    getStatsData(),
  ]);

  return (
    <div className='container mx-auto py-3 sm:p-2 lg:px-4 lg:py-6 space-y-3'>
      <AdSlot slotCode='home_header_banner' className='rounded-none lg:rounded-lg' />
      <div className='flex lg:gap-6'>
        <div className='fixed z-10 -left-full lg:static lg:w-64 shrink-0'>
          <StickySidebar className='sticky top-[81px] space-y-4'>
            <AdSlot slotCode='home_sidebar_top' />
            <Sidebar categories={categories} stats={stats} />
            <AdSlot slotCode='home_sidebar_bottom' />
          </StickySidebar>
        </div>
        <main className='flex-1 min-w-0 overflow-hidden space-y-3'>{children}</main>
      </div>
      <AdSlot slotCode='home_footer_banner' />
    </div>
  );
}
