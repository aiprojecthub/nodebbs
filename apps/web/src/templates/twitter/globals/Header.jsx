'use client';

import { useState } from 'react';
import Link from '@/components/common/Link';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import UserAvatar from '@/components/user/UserAvatar';
import {
  Search,
  Plus,
  Menu,
  X,
  Home,
  Compass,
  Tag,
  Bell,
  Mail,
  Settings,
  ChevronDown,
  Trophy,
  ArrowLeft,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import ThemeSwitcher from '@/components/common/ThemeSwitcher';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useLedger } from '@/extensions/ledger/contexts/LedgerContext';
import { usePermission } from '@/hooks/usePermission';
import UserMenuItems from '../components/UserMenuItems';

const navItems = [
  { href: '/', label: '首页', icon: Home },
  { href: '/categories', label: '发现', icon: Compass },
  { href: '/tags', label: '标签', icon: Tag },
  { href: '/rank', label: '排行', icon: Trophy },
];

function NavItem({ href, label, icon: Icon, isActive }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-4 px-4 py-3 rounded-full transition-colors text-xl
        ${isActive
          ? 'font-bold text-foreground'
          : 'font-normal text-foreground/80 hover:bg-accent/60'
        }
      `}
    >
      <Icon className='h-6 w-6' strokeWidth={isActive ? 2.5 : 2} />
      <span className='hidden xl:inline'>{label}</span>
    </Link>
  );
}

// 桌面端左侧导航栏
export function DesktopNav() {
  const pathname = usePathname();
  const { user, isAuthenticated, loading, logout, openLoginDialog } = useAuth();
  const { settings } = useSettings();
  const { isWalletEnabled } = useLedger();
  const { hasDashboardAccess } = usePermission();

  // profile/dashboard 页面有自己的侧边栏，只显示精简导航
  const isMinimal = pathname?.startsWith('/profile') || pathname?.startsWith('/dashboard');

  if (isMinimal) {
    return (
      <div className='flex flex-col h-full py-2 px-2 overflow-y-auto'>
        <Link href='/' className='p-3 rounded-full hover:bg-accent/50 self-center' title='返回首页'>
          <ArrowLeft className='h-6 w-6' />
        </Link>
        <div className='mt-auto pb-2 self-center'>
          <ThemeSwitcher />
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-col h-full py-2 px-2 overflow-y-auto'>
      {/* Logo */}
      <Link href='/' className='flex items-center p-3 rounded-full hover:bg-accent/50 mb-1 w-fit'>
        <img
          src={settings?.site_logo?.value || '/logo.svg'}
          alt='logo'
          className='h-7 w-auto'
        />
      </Link>

      {/* 导航项 */}
      <nav className='flex flex-col gap-0.5 mt-1'>
        {navItems.map((item) => (
          <NavItem
            key={item.href}
            {...item}
            isActive={pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href))}
          />
        ))}

        {isAuthenticated && (
          <>
            <NavItem href='/profile/notifications' label='通知' icon={Bell} isActive={pathname?.startsWith('/profile/notifications')} />
            <NavItem href='/profile/messages' label='私信' icon={Mail} isActive={pathname?.startsWith('/profile/messages')} />
            <NavItem href='/profile/settings' label='设置' icon={Settings} isActive={pathname?.startsWith('/profile/settings')} />
          </>
        )}
      </nav>

      {/* 发布按钮 */}
      {isAuthenticated && (
        <Link href='/create' className='mt-4'>
          <Button className='w-full rounded-full h-12 text-base font-bold xl:px-8'>
            <Plus className='h-5 w-5 xl:hidden' />
            <span className='hidden xl:inline'>发布话题</span>
          </Button>
        </Link>
      )}

      {/* 底部用户信息 */}
      <div className='mt-auto pt-4'>
        <ThemeSwitcher />
        {!loading && isAuthenticated ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className='flex items-center gap-3 w-full p-3 rounded-full hover:bg-accent/50 transition-colors justify-center xl:justify-start'>
                <UserAvatar
                  url={user?.avatar}
                  name={user?.name || user?.username}
                  size='sm'
                  frameMetadata={user?.avatarFrame?.itemMetadata}
                />
                <div className='hidden xl:flex flex-col items-start flex-1 min-w-0'>
                  <span className='text-sm font-bold truncate w-full text-left'>{user?.name || user?.username}</span>
                  <span className='text-xs text-muted-foreground truncate w-full text-left'>@{user?.username}</span>
                </div>
                <ChevronDown className='h-4 w-4 text-muted-foreground hidden xl:block' />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-56'>
              <DropdownMenuLabel>
                <div className='flex flex-col'>
                  <span className='font-medium'>{user?.name || user?.username}</span>
                  <span className='text-sm text-muted-foreground font-normal'>@{user?.username}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <UserMenuItems
                user={user}
                isWalletEnabled={isWalletEnabled}
                hasDashboardAccess={hasDashboardAccess()}
                logout={logout}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        ) : !loading ? (
          <Button onClick={openLoginDialog} className='w-full rounded-full h-12 text-base font-bold'>
            登录
          </Button>
        ) : null}
      </div>

      {/* 底部版权信息 */}
      <div className='hidden xl:block px-4 pb-3 text-xs text-muted-foreground/60 space-y-1'>
        <div className='flex flex-wrap gap-x-2 gap-y-0.5'>
          <Link href='/about' className='hover:underline'>关于</Link>
          <Link href='/reference' className='hover:underline'>API</Link>
        </div>
        <a
          href='https://github.com/aiprojecthub/nodebbs'
          target='_blank'
          rel='noopener noreferrer'
          className='hover:underline'
        >
          Built with NodeBBS
        </a>
      </div>
    </div>
  );
}

// 移动端顶部 Header
export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, loading, logout, openLoginDialog } = useAuth();
  const { settings } = useSettings();
  const { isWalletEnabled } = useLedger();
  const { hasDashboardAccess } = usePermission();
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?s=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  return (
    <header className='lg:hidden border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50'>
      <div className='flex items-center gap-2 h-14 px-3'>
        {/* Logo */}
        <Link href='/' className='shrink-0'>
          <img
            src={settings?.site_logo?.value || '/logo.svg'}
            alt='logo'
            className='h-7 w-auto'
          />
        </Link>

        {/* 搜索框 */}
        <form onSubmit={handleSearch} className='flex-1 min-w-0'>
          <div className='relative'>
            <Search
              aria-hidden='true'
              className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none'
            />
            <input
              type='search'
              placeholder='搜索...'
              aria-label='搜索'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='w-full h-9 pl-9 pr-3 rounded-full bg-muted/50 border border-border text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors'
            />
          </div>
        </form>

        {/* 主题切换 */}
        <ThemeSwitcher />

        {/* 用户头像菜单 */}
        {!loading && isAuthenticated ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className='shrink-0'>
                <UserAvatar
                  url={user?.avatar}
                  name={user?.name || user?.username}
                  size='xs'
                  frameMetadata={user?.avatarFrame?.itemMetadata}
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-56'>
              <DropdownMenuLabel className='pb-2'>
                <div className='flex flex-col'>
                  <span className='font-bold'>{user?.name || user?.username}</span>
                  <span className='text-sm text-muted-foreground font-normal'>@{user?.username}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <UserMenuItems
                user={user}
                isWalletEnabled={isWalletEnabled}
                hasDashboardAccess={hasDashboardAccess()}
                logout={logout}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        ) : !loading ? (
          <Button variant='default' size='sm' onClick={openLoginDialog} className='rounded-full font-bold shrink-0'>
            登录
          </Button>
        ) : null}

        {/* 功能菜单（汉堡） */}
        {!loading && (
          <Popover open={menuOpen} onOpenChange={setMenuOpen}>
            <PopoverTrigger asChild>
              <Button variant='ghost' size='icon' className='shrink-0 h-9 w-9'>
                {menuOpen ? <X className='h-5 w-5' /> : <Menu className='h-5 w-5' />}
              </Button>
            </PopoverTrigger>
            <PopoverContent align='end' sideOffset={0} className='w-screen mt-px rounded-none shadow-none border-x-0 border-b p-0' onOpenAutoFocus={(e) => e.preventDefault()}>
              <div className='flex flex-col p-3 gap-0.5'>
                {navItems.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${isActive ? 'bg-accent font-bold' : 'hover:bg-accent/50'}`}
                      onClick={() => setMenuOpen(false)}
                    >
                      <item.icon className='h-5 w-5' />
                      <span className='text-sm'>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
              {isAuthenticated && (
                <div className='p-3 pt-0'>
                  <Link href='/create' onClick={() => setMenuOpen(false)}>
                    <Button className='w-full rounded-full h-10 font-bold'>
                      <Plus className='h-4 w-4' />
                      发布话题
                    </Button>
                  </Link>
                </div>
              )}
            </PopoverContent>
          </Popover>
        )}
      </div>
    </header>
  );
}
