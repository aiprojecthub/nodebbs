import { getTemplate } from '@/templates';
import { GLOBALS } from '@/templates/constants';
import EmailVerificationBanner from '@/components/auth/EmailVerificationBanner';
import { SidebarProvider } from '../components/SidebarContext';
import MediumLayout from '../components/MediumLayout';
import '../styles.css';

export default function AppLayout({ children, apiInfo }) {
  const Header = getTemplate(GLOBALS.Header);

  return (
    <SidebarProvider>
      <div className='min-h-screen bg-background flex flex-col' style={{ '--header-offset': '57px' }}>
        <Header />
        <EmailVerificationBanner />
        <MediumLayout version={apiInfo?.version}>{children}</MediumLayout>
      </div>
    </SidebarProvider>
  );
}
