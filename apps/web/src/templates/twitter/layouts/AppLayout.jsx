import { getTemplate } from '@/templates';
import { DesktopNav } from '../globals/Header';
import EmailVerificationBanner from '@/components/auth/EmailVerificationBanner';
import '../styles.css';

export default function AppLayout({ children }) {
  const Header = getTemplate('Header');

  return (
    <div className='min-h-screen bg-background' style={{ '--header-offset': '0px', '--content-padding-top': '0px' }}>
      <Header />
      <EmailVerificationBanner />
      <div className='container mx-auto flex min-h-screen'>
        {/* 桌面端：左侧导航栏 */}
        <aside className='hidden lg:flex flex-col w-[68px] xl:w-[275px] shrink-0 sticky top-0 h-screen border-r border-border'>
          <DesktopNav />
        </aside>

        {/* 内容区 */}
        <main className='flex-1 min-w-0 flex flex-col'>
          {children}
        </main>
      </div>
    </div>
  );
}
