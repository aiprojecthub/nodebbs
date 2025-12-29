import StickySidebar from '@/components/common/StickySidebar';
import DashboardSidebar from '@/components/layout/DashboardSidebar';
import RequireAdmin from '@/components/auth/RequireAdmin';

export const metadata = {
  title: '管理后台',
};

export default function AdminLayout({ children }) {
  return (
    <div className='container mx-auto p-2 lg:px-4 lg:py-6'>
      <RequireAdmin>
        <div className='flex lg:gap-6'>
          {/* sidebar */}
          <div className='fixed z-10 -left-full lg:static lg:w-64 shrink-0'>
            <StickySidebar className='sticky top-[81px] space-y-3'>
              <DashboardSidebar />
            </StickySidebar>
          </div>

          {/* Main content */}
          <main className='flex-1 min-w-0'>{children}</main>
        </div>
      </RequireAdmin>
    </div>
  );
}
