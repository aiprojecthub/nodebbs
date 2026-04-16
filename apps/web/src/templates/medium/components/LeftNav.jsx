'use client';

import Link from '@/components/common/Link';
import { usePathname } from 'next/navigation';
import { Home, Compass, Tag, Trophy, PenSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { href: '/', label: '首页', icon: Home },
  { href: '/categories', label: '分类', icon: Compass },
  { href: '/tags', label: '标签', icon: Tag },
  { href: '/rank', label: '排行', icon: Trophy },
];

/**
 * Medium 模板 — 左侧导航栏
 * @param {Object} props
 * @param {Function} [props.onNavigate] - 点击导航项后的回调（移动端用于关闭抽屉）
 * @param {string} [props.version] - API 版本号
 */
export default function LeftNav({ onNavigate, version }) {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  return (
    <div className='flex flex-col h-full py-6 px-4'>
      {/* 导航 */}
      <nav className='flex flex-col gap-0.5'>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'font-semibold text-foreground bg-muted/50'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}
            >
              <item.icon className='h-[18px] w-[18px]' strokeWidth={isActive ? 2.5 : 2} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* 写作按钮 */}
      {isAuthenticated && (
        <Link
          href='/create'
          onClick={onNavigate}
          className='flex items-center gap-2 mt-6 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground bg-foreground/5 hover:bg-foreground/10 transition-colors'
        >
          <PenSquare className='h-[18px] w-[18px]' />
          <span>写文章</span>
        </Link>
      )}

      {/* 底部 */}
      <div className='mt-auto space-y-3'>
        <div className='flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground/50 px-2'>
          <Link href='/about' onClick={onNavigate} className='hover:text-muted-foreground transition-colors'>关于</Link>
          <Link href='/reference' onClick={onNavigate} className='hover:text-muted-foreground transition-colors'>API</Link>
        </div>
        <a
          href='https://github.com/aiprojecthub/nodebbs'
          target='_blank'
          rel='noopener noreferrer'
          className='block text-xs text-muted-foreground/40 hover:text-muted-foreground/60 transition-colors px-2'
        >
          Built with NodeBBS{version ? ` v${version}` : ''}
        </a>
      </div>
    </div>
  );
}
