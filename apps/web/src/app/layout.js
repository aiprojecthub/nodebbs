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

const $title = 'NodeBBS';
const $description = '一个基于 Node.js 和 React 的现代化论坛系统';

export async function generateMetadata({ params }) {
  const settings = await request('/api/settings');
  const name = settings?.site_name?.value || $title;
  const description = settings.site_description?.value || $description;
  return {
    title: {
      template: `\%s | ${name}`,
      default: $title, // a default is required when creating a template
    },
    description,
  };
}

async function AppLayout({ children }) {
  const settings = await request('/api/settings');
  return (
    <div className='min-h-screen bg-background flex flex-col'>
      <Header settings={settings} />
      <EmailVerificationBanner />
      <div className='flex-1'>{children}</div>
      <Footer settings={settings} />
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
