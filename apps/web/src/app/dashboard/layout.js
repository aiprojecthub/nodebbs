import StickySidebar from '@/components/common/StickySidebar';
import DashboardSidebar from '@/components/layout/DashboardSidebar';
import RequireAdmin from '@/components/auth/RequireAdmin';

export const metadata = {
  title: '管理后台',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({ children }) {
  return (
    <div className='container mx-auto p-2 lg:px-4' style={{ paddingTop: 'var(--content-padding-top, 1.5rem)' }}>
      <RequireAdmin>
        <div className='flex lg:gap-6'>
          <div className='fixed z-10 -left-full lg:static lg:w-64 shrink-0'>
            <StickySidebar className='sticky top-[var(--header-offset)] space-y-3'>
              <DashboardSidebar />
            </StickySidebar>
          </div>

          <main className='flex-1 min-w-0'>{children}</main>
        </div>
      </RequireAdmin>
    </div>
  );
}
