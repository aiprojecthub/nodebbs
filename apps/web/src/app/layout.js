import './globals.css';
import { Toaster } from 'sonner';

import { AuthProvider } from '@/contexts/AuthContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import {
  THEMES,
  FONT_SIZES,
  DEFAULT_THEME,
  DEFAULT_FONT_SIZE,
  STORAGE_KEYS,
} from '@/config/theme.config';

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import EmailVerificationBanner from '@/components/auth/EmailVerificationBanner';
import AutoCheckIn from '@/extensions/rewards/components/AutoCheckIn';
import { request, getCurrentUser } from '@/lib/server/api';

// 强制动态渲染，因为需要读取 cookies
export const dynamic = 'force-dynamic';

const $title = 'NodeBBS';
const $description = '一个基于 Node.js 和 React 的现代化论坛系统';

export async function generateMetadata({ params }) {
  let name = $title;
  let description = $description;

  try {
    const settings = await request('/settings');
    if (settings?.site_name?.value) {
      name = settings.site_name.value;
    }
    if (settings?.site_description?.value) {
      description = settings.site_description.value;
    }
  } catch (error) {
    console.error('Error fetching settings for metadata:', error);
  }

  return {
    title: {
      template: `%s | ${name}`,
      default: name, // a default is required when creating a template
    },
    description,
    applicationName: name,
    appleWebApp: {
      title: name,
    },
    icons: {
      icon: [
        { url: '/logo.svg', type: 'image/svg+xml' },
        { url: '/favicon.ico', type: 'image/x-icon', sizes: 'any' },
      ],
      apple: '/apple-touch-icon.png',
    },
    openGraph: {
      title: {
        template: `%s | ${name}`,
        default: name,
      },
      description,
      siteName: name,
      type: 'website',
    },
  };
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

async function AppLayout({ children, settings, apiInfo }) {
  // 移除内部 fetch，改为接收 props
  return (
    <div className='min-h-screen bg-background flex flex-col'>
      <Header settings={settings} />
      <EmailVerificationBanner />
      <div className='flex-1'>{children}</div>
      <Footer settings={settings} version={apiInfo?.version} />
    </div>
  );
}

export default async function RootLayout({ children }) {
  // 获取配置和 API 信息
  let settings = null;
  let apiInfo = null;
  try {
    const [settingsData, apiData] = await Promise.all([
      request('/settings'),
      request('/'),
    ]);
    settings = settingsData;
    apiInfo = apiData;
  } catch (error) {
    console.error('Error fetching data for layout:', error);
  }

  // 从配置中提取需要的数据
  const themeClasses = THEMES.filter(t => t.class).map(t => t.class);
  const fontSizeClasses = FONT_SIZES.map(f => f.class);

  // 生成初始化脚本
  const initScript = `
    (function() {
      try {
        const themeStyle = localStorage.getItem('${STORAGE_KEYS.THEME_STYLE}') || '${DEFAULT_THEME}';
        const fontSize = localStorage.getItem('${STORAGE_KEYS.FONT_SIZE}') || '${DEFAULT_FONT_SIZE}';
        const root = document.documentElement;

        // 主题风格类列表（从配置自动生成）
        const themes = ${JSON.stringify(themeClasses)};
        // 字号设置类列表（从配置自动生成）
        const fontSizes = ${JSON.stringify(fontSizeClasses)};

        // 移除所有可能的主题类
        themes.forEach(theme => root.classList.remove(theme));

        // 应用主题风格
        if (themeStyle && themeStyle !== 'default') {
          root.classList.add(themeStyle);
        }

        // 移除所有可能的字号类
        fontSizes.forEach(fs => root.classList.remove(fs));

        // 应用字号设置
        const fontSizeClass = 'font-scale-' + fontSize;
        if (fontSizes.includes(fontSizeClass)) {
          root.classList.add(fontSizeClass);
        }
      } catch (e) {}
    })();
  `;

  // 获取当前用户 (SSR)
  const user = await getCurrentUser();

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
          <AuthProvider initialUser={user}>
            <SettingsProvider>
              <AppLayout settings={settings} apiInfo={apiInfo}>{children}</AppLayout>
              <AutoCheckIn />
              <Toaster position='top-right' richColors />
            </SettingsProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
