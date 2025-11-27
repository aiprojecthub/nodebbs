'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import {
  THEMES,
  FONT_SIZES,
  DEFAULT_THEME,
  DEFAULT_FONT_SIZE,
  STORAGE_KEYS,
} from '@/config/theme.config';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themeStyle, setThemeStyle] = useState(DEFAULT_THEME);
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
  const [mounted, setMounted] = useState(false);

  // 从 localStorage 加载主题风格和字号
  useEffect(() => {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME_STYLE) || DEFAULT_THEME;
    const savedFontSize = localStorage.getItem(STORAGE_KEYS.FONT_SIZE) || DEFAULT_FONT_SIZE;
    setThemeStyle(savedTheme);
    setFontSize(savedFontSize);
    setMounted(true);
  }, []);

  // 应用主题风格和字号到 HTML 元素
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    const themeConfig = THEMES.find((t) => t.value === themeStyle);
    const fontConfig = FONT_SIZES.find((f) => f.value === fontSize);

    // 移除所有主题类
    THEMES.forEach((t) => {
      if (t.class) root.classList.remove(t.class);
    });

    // 应用新主题
    if (themeConfig?.class) {
      root.classList.add(themeConfig.class);
    }

    // 移除所有字号类
    FONT_SIZES.forEach((f) => {
      if (f.class) root.classList.remove(f.class);
    });

    // 应用新字号
    if (fontConfig?.class) {
      root.classList.add(fontConfig.class);
    }

    // 保存到 localStorage
    localStorage.setItem(STORAGE_KEYS.THEME_STYLE, themeStyle);
    localStorage.setItem(STORAGE_KEYS.FONT_SIZE, fontSize);
  }, [themeStyle, fontSize, mounted]);

  const value = {
    themeStyle,
    setThemeStyle,
    themes: THEMES,
    fontSize,
    setFontSize,
    fontSizes: FONT_SIZES,
    mounted,
  };

  return (
    <NextThemesProvider
      attribute='class'
      defaultTheme='system'
      enableSystem
      disableTransitionOnChange
    >
      <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
    </NextThemesProvider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
