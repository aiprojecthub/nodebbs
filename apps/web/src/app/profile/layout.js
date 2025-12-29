import ProfileSidebar from '@/components/layout/ProfileSidebar';
import RequireAuth from '@/components/auth/RequireAuth';
import StickySidebar from '@/components/common/StickySidebar';

export const metadata = {
  title: '个人中心',
  description: '管理你的话题和个人设置',
};

export default function ProfileLayout({ children }) {
  return (
    <RequireAuth>
      <div className='container mx-auto p-2 lg:px-4 lg:py-6'>
        <div className='flex lg:gap-6'>
          {/* 左侧栏 */}
          <div className='fixed z-10 -left-full lg:static lg:w-64 shrink-0'>
            <StickySidebar className='sticky top-[81px]'>
              <ProfileSidebar />
            </StickySidebar>
          </div>

          {/* 主内容区 */}
          <main className='flex-1 min-w-0'>{children}</main>
        </div>
      </div>
    </RequireAuth>
  );
}
