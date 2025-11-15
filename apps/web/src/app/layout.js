import './globals.css';
import { Toaster } from 'sonner';

import { AuthProvider } from '@/contexts/AuthContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import ThemeScript from '@/components/theme/ThemeScript';

import Header from '@/components/forum/Header';
import Footer from '@/components/forum/Footer';
import EmailVerificationBanner from '@/components/auth/EmailVerificationBanner';
import { request } from '@/lib/server/api';

const $title = 'NodeBBS - GitHub Issue 风格的讨论社区';
const $description = '一个现代化的技术讨论论坛，采用 GitHub Issue 风格设计';

export async function generateMetadata({ params }) {
  const settings = await request('/api/settings');
  const name = settings.site_name?.value || $title;
  const description = settings.site_description?.value || $description;
  return {
    title: {
      template: `\%s | ${name}`,
      default: $title, // a default is required when creating a template
    },
    description,
  };
}

function AppLayout({ children }) {
  return (
    <div className='min-h-screen bg-background flex flex-col'>
      <Header />
      <EmailVerificationBanner />
      <div className='flex-1'>{children}</div>
      <Footer />
    </div>
  );
}

export default function RootLayout({ children }) {
  return (
    <html lang='en' suppressHydrationWarning className='overflow-y-scroll'>
      <body className={`antialiased`}>
        <ThemeScript />
        <ThemeProvider>
          <AuthProvider>
            <SettingsProvider>
              <AppLayout>{children}</AppLayout>
              <Toaster position='top-right' richColors />
            </SettingsProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
