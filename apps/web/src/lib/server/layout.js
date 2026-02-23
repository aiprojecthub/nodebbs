import { request, getCurrentUser } from './api';
import {
  THEMES,
  FONT_SIZES,
  DEFAULT_THEME,
  DEFAULT_FONT_SIZE,
  STORAGE_KEYS,
} from '@/config/theme.config';

// ============ 常量 ============
const DEFAULT_SITE_NAME = 'NodeBBS';
const DEFAULT_SITE_DESCRIPTION = '一个基于 Node.js 和 React 的现代化论坛系统';
const DEFAULT_SITE_LOGO = '/logo.svg';
const DEFAULT_FAVICON = '/favicon.ico';
const DEFAULT_APPLE_TOUCH_ICON = '/apple-touch-icon.png';

// ============ 主函数 ============

/**
 * 获取 RootLayout 所需的数据
 * 包括：系统设置、API 信息、当前用户
 */
export async function getLayoutData() {
  let settings = null;
  let apiInfo = null;
  let activeCurrencies = [];

  try {
    const [settingsData, apiData, currenciesData] = await Promise.all([
      request('/settings'),
      request('/'),
      request('/ledger/active-currencies'),
    ]);
    settings = settingsData;
    apiInfo = apiData;
    if (currenciesData && Array.isArray(currenciesData)) {
      activeCurrencies = currenciesData;
    }
  } catch (error) {
    console.error('Error fetching data for layout:', error);
  }

  // 获取当前用户 (SSR)
  const user = await getCurrentUser();

  return { settings, apiInfo, user, activeCurrencies };
}

/**
 * 生成 RootLayout 的 Metadata
 * 包含完整的 SEO 优化：Open Graph、Twitter Cards 等
 */
export async function getLayoutMetadata() {
  let siteName = DEFAULT_SITE_NAME;
  let siteDescription = DEFAULT_SITE_DESCRIPTION;
  let siteLogo = DEFAULT_SITE_LOGO;
  let favicon = DEFAULT_FAVICON;
  let appleTouchIcon = DEFAULT_APPLE_TOUCH_ICON;
  let siteKeywords = '';
  let siteUrl = '';

  try {
    const settings = await request('/settings');
    if (settings?.site_name?.value) {
      siteName = settings.site_name.value;
    }
    if (settings?.site_description?.value) {
      siteDescription = settings.site_description.value;
    }
    if (settings?.site_logo?.value) {
      siteLogo = settings.site_logo.value;
    }
    if (settings?.site_favicon?.value) {
      favicon = settings.site_favicon.value;
    }
    if (settings?.site_apple_touch_icon?.value) {
      appleTouchIcon = settings.site_apple_touch_icon.value;
    }
    if (settings?.site_keywords?.value) {
      siteKeywords = settings.site_keywords.value;
    }
    if (settings?.site_url?.value) {
      siteUrl = settings.site_url.value.replace(/\/+$/, '');
    }
  } catch (error) {
    console.error('Error fetching settings for metadata:', error);
  }

  // 生成社交分享图片的绝对 URL
  const ogImageUrl =
    siteUrl && !siteLogo.startsWith('http') ? `${siteUrl}${siteLogo}` : siteLogo;

  // 基础 metadata
  const metadata = {
    title: {
      template: `%s | ${siteName}`,
      default: siteName,
    },
    description: siteDescription,
    applicationName: siteName,
    appleWebApp: {
      title: siteName,
    },
    icons: {
      icon: favicon,
      apple: appleTouchIcon,
    },
    openGraph: {
      title: {
        template: `%s | ${siteName}`,
        default: siteName,
      },
      description: siteDescription,
      siteName,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title: {
        template: `%s | ${siteName}`,
        default: siteName,
      },
      description: siteDescription,
    },
  };

  // 有 keywords 时才添加
  if (siteKeywords) {
    metadata.keywords = siteKeywords.split(',').map((k) => k.trim());
  }

  // 有 siteUrl 时才添加 URL 相关配置
  if (siteUrl) {
    metadata.metadataBase = new URL(siteUrl);
    metadata.alternates = { canonical: '/' };
    metadata.openGraph.url = siteUrl;
    metadata.openGraph.images = [{ url: ogImageUrl, alt: siteName }];
    metadata.twitter.card = 'summary_large_image';
    metadata.twitter.images = [ogImageUrl];
  }

  return metadata;
}

// ============ 辅助函数 ============

/**
 * 获取站点基本信息（用于子页面 metadata）
 */
export async function getSiteInfo() {
  let siteName = DEFAULT_SITE_NAME;
  let siteUrl = '';
  let siteLogo = DEFAULT_SITE_LOGO;

  try {
    const settings = await request('/settings');
    if (settings?.site_name?.value) {
      siteName = settings.site_name.value;
    }
    if (settings?.site_url?.value) {
      siteUrl = settings.site_url.value.replace(/\/+$/, '');
    }
    if (settings?.site_logo?.value) {
      siteLogo = settings.site_logo.value;
    }
  } catch (error) {
    console.error('Error fetching site info:', error);
  }

  return { siteName, siteUrl, siteLogo };
}

/**
 * 生成主题初始化脚本
 * 用于在页面加载时立即恢复主题配置，避免闪烁
 */
export function generateThemeScript() {
  const themeClasses = THEMES.filter((t) => t.class).map((t) => t.class);
  const fontSizeClasses = FONT_SIZES.map((f) => f.class);

  return `
    (function() {
      try {
        const themeStyle = localStorage.getItem('${STORAGE_KEYS.THEME_STYLE}') || '${DEFAULT_THEME}';
        const fontSize = localStorage.getItem('${STORAGE_KEYS.FONT_SIZE}') || '${DEFAULT_FONT_SIZE}';
        const root = document.documentElement;

        const themes = ${JSON.stringify(themeClasses)};
        const fontSizes = ${JSON.stringify(fontSizeClasses)};

        themes.forEach(theme => root.classList.remove(theme));
        if (themeStyle && themeStyle !== 'default') {
          root.classList.add(themeStyle);
        }

        fontSizes.forEach(fs => root.classList.remove(fs));
        const fontSizeClass = 'font-scale-' + fontSize;
        if (fontSizes.includes(fontSizeClass)) {
          root.classList.add(fontSizeClass);
        }
      } catch (e) {}
    })();
  `;
}
