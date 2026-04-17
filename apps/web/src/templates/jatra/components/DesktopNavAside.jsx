'use client';

import Link from 'next/link';
import { Home, ChartBarBig, MessageCircle, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

/**
 * Jatra 左侧导航
 * 优先显示 Home，然后动态渲染 categories
 * 当 categories 为空时回退到静态菜单
 */
export default function DesktopNavAside({ categories = [] }) {
  const pathname = usePathname();

  // 动态构建导航项：固定首页 + 分类列表
  const navItems = [
    { href: '/', label: '首页', icon: Home },
  ];

  // 固定底部入口
  navItems.push(
    { href: '/categories', label: '全部版块', icon: MessageCircle },
    { href: '/tags', label: '标签广场', icon: Hash },
    { href: '/rank', label: '排行榜', icon: ChartBarBig },
  );

  if (categories.length > 0) {
    // 使用真实分类数据
    categories.forEach((cat) => {
      navItems.push({
        href: `/categories/${cat.slug}`,
        label: cat.name,
        icon: Hash,
        color: cat.color,
      });
    });
  }

  return (
    <aside className='hidden md:flex flex-col w-44 shrink-0 sticky top-[var(--header-offset)] overflow-y-auto'>
      <nav className='flex flex-col gap-3'>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors border-l-2',
                isActive
                  ? 'border-primary text-foreground font-semibold'
                  : 'border-transparent text-foreground/60 hover:text-primary'
              )}
            >
              {/* 分类带颜色圆点 */}
              {item.color ? (
                <span
                  className='w-3 h-3 rounded-full shrink-0'
                  style={{ backgroundColor: item.color }}
                />
              ) : (
                <Icon className='w-5 h-5 shrink-0' />
              )}
              <span className='truncate'>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
