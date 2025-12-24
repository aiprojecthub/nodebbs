import { request, getCurrentUser } from './api';
import {
  THEMES,
  FONT_SIZES,
  DEFAULT_THEME,
  DEFAULT_FONT_SIZE,
  STORAGE_KEYS,
} from '@/config/theme.config';

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
    // 保持 settings 和 apiInfo 为 null，让组件优雅降级
    // activeCurrencies 默认为空数组
    activeCurrencies = [];
  }

  // 获取当前用户 (SSR)
  const user = await getCurrentUser();

  return { settings, apiInfo, user, activeCurrencies };
}

/**
 * 生成主题初始化脚本
 * 用于在页面加载时立即恢复主题配置，避免闪烁
 */
export function generateThemeScript() {
  const themeClasses = THEMES.filter(t => t.class).map(t => t.class);
  const fontSizeClasses = FONT_SIZES.map(f => f.class);

  return `
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
}

const $title = 'NodeBBS';
const $description = '一个基于 Node.js 和 React 的现代化论坛系统';

/**
 * 生成 RootLayout 的 Metadata
 */
export async function getLayoutMetadata() {
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
