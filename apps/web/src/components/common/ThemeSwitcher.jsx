'use client';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Palette, Sun, Moon, Monitor, Check } from 'lucide-react';
import { useTheme as useCustomTheme } from '@/contexts/ThemeContext';
import { useTheme } from 'next-themes';

export default function ThemeSwitcher() {
  const { themeStyle, setThemeStyle, themes, fontSize, setFontSize, fontSizes, mounted: customMounted } = useCustomTheme();
  const { theme, setTheme } = useTheme();

  // 防止服务端渲染不匹配
  if (!customMounted) {
    return (
      <Button variant='ghost' size='icon' className='h-9 w-9'>
        <Palette className='h-4 w-4' />
      </Button>
    );
  }

  const modes = [
    { value: 'light', label: '浅色', icon: Sun },
    { value: 'dark', label: '深色', icon: Moon },
    { value: 'system', label: '系统', icon: Monitor },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant='ghost' size='icon' className='h-9 w-9' title='切换主题'>
          <Palette className='h-4 w-4' />
        </Button>
      </PopoverTrigger>
      <PopoverContent align='end' className='min-w-48 w-auto p-2'>
        {/* 主题风格 - 色块选择 */}
        <div className='px-2 py-1.5 text-xs font-medium text-muted-foreground'>
          主题风格
        </div>
        <div className='px-2 pb-2 flex gap-2'>
          {themes.map((t) => (
            <button
              key={t.value}
              onClick={() => setThemeStyle(t.value)}
              className='group relative flex flex-col items-center gap-1'
              title={t.label}
            >
              <div
                className={`w-10 h-10 rounded-lg transition flex items-center justify-center ${
                  themeStyle === t.value
                    ? 'scale-102 shadow-lg ring-2 ring-offset-0 ring-offset-background ring-foreground/20'
                    : 'hover:scale-105'
                }`}
                style={{ backgroundColor: t.color }}
              >
                {themeStyle === t.value && (
                  <Check className='h-5 w-5 text-white drop-shadow-md' />
                )}
              </div>
              <span className='text-xs text-muted-foreground'>{t.label}</span>
            </button>
          ))}
        </div>

        <div className="h-px bg-border my-1" />

        {/* 颜色模式 - Tab 形式 */}
        <div className='px-2 py-1.5 text-xs font-medium text-muted-foreground'>
          颜色模式
        </div>
        <div className='px-2 pb-2'>
          <Tabs value={theme} onValueChange={setTheme}>
            <TabsList className='w-full'>
              {modes.map((m) => {
                const Icon = m.icon;
                return (
                  <TabsTrigger key={m.value} value={m.value} className='flex-1' title={m.label}>
                    <Icon className='h-4 w-4' />
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>

        <div className="h-px bg-border my-1" />

        {/* 字号 */}
        <div className='px-2 py-1.5 text-xs font-medium text-muted-foreground'>
          字号
        </div>
        <div className='px-2 pb-2'>
          <Tabs value={fontSize} onValueChange={setFontSize}>
            <TabsList className='w-full'>
              {fontSizes.map((f) => (
                <TabsTrigger key={f.value} value={f.value} className='flex-1'>
                  {f.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </PopoverContent>
    </Popover>
  );
}
