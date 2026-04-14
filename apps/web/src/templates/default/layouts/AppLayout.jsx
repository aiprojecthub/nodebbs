import { getTemplate } from '@/templates';
import EmailVerificationBanner from '@/components/auth/EmailVerificationBanner';

export default function AppLayout({ children, apiInfo }) {
  const Header = getTemplate('Header');
  const Footer = getTemplate('Footer');

  return (
    <div className='min-h-screen bg-background flex flex-col' style={{ '--header-offset': '57px', '--content-padding-top': '1.5rem' }}>
      <Header />
      <EmailVerificationBanner />
      <main className='flex-1 flex flex-col'>{children}</main>
      <Footer version={apiInfo?.version} />
    </div>
  );
}
