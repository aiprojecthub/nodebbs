import StickySidebar from '@/components/forum/StickySidebar';
import DashboardSidebar from '@/components/forum/DashboardSidebar';
import RequireAdmin from '@/components/auth/RequireAdmin';

export const metadata = {
  title: '管理后台',
};

export default function AdminLayout({ children }) {
  return (
    <div className='container mx-auto px-4 py-6'>
      <RequireAdmin>
        <div className='flex flex-col lg:flex-row gap-6'>
          {/* sidebar */}
          <div className='w-full lg:w-64 shrink-0'>
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
