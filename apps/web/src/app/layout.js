import './globals.css';

import { AuthProvider } from '@/contexts/AuthContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LedgerProvider } from '@/extensions/ledger/contexts/LedgerContext';
import { EmojiProvider } from '@/components/common/Emoji/EmojiProvider';

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import EmailVerificationBanner from '@/components/auth/EmailVerificationBanner';
import AutoCheckIn from '@/extensions/rewards/components/AutoCheckIn';
import ProgressBar from '@/components/common/ProgressBar';
import { getLayoutData, generateThemeScript, getLayoutMetadata } from '@/lib/server/layout';
import { Toaster } from '@/components/common/Toaster';
import { ConfirmPopoverPortal } from '@/components/common/ConfirmPopover';
import { AdsProvider } from '@/extensions/ads/components';
import { ChineseNewYear } from '@/components/effects/ChineseNewYear';


// 强制动态渲染，因为需要读取 cookies
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  return await getLayoutMetadata();
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

async function AppLayout({ children, settings, apiInfo }) {
  return (
    <div className='min-h-screen bg-background flex flex-col'>
      <Header />
      <EmailVerificationBanner />
      <div className='flex-1 flex flex-col'>{children}</div>
      <Footer version={apiInfo?.version} />
    </div>
  );
}

export default async function RootLayout({ children }) {
  // 获取所有 SSR 数据 (并行)
  const { settings, apiInfo, user, activeCurrencies } = await getLayoutData();

  // 生成初始化脚本
  const initScript = generateThemeScript();

  // 准备统计脚本
  const analyticsScript = settings?.site_analytics_scripts?.value || '';

  return (
    <html lang='en' suppressHydrationWarning className='overflow-y-scroll'>
      <head>
        <script dangerouslySetInnerHTML={{ __html: initScript }} />
      </head>
      <body className={`antialiased`}>
        {/* 自定义统计脚本注入 */}
        {analyticsScript && (
          <div 
             style={{ display: 'none' }} 
             dangerouslySetInnerHTML={{ __html: analyticsScript }} 
          />
        )}

        <ThemeProvider>
          <SettingsProvider initialSettings={settings}>
            <AuthProvider initialUser={user}>
              <LedgerProvider activeCurrencies={activeCurrencies}>
                <AdsProvider>
                <EmojiProvider>
                <ProgressBar>
                  <AppLayout apiInfo={apiInfo}>{children}</AppLayout>
                  <AutoCheckIn />
                  <Toaster />
                  <ConfirmPopoverPortal />
                  <ChineseNewYear />
                </ProgressBar>
                </EmojiProvider>
                </AdsProvider>
              </LedgerProvider>
            </AuthProvider>
          </SettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
