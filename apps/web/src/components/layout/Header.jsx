'use client';

import { useState } from 'react';
import Link from '@/components/common/Link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import UserAvatar from '@/components/user/UserAvatar';
import {
  Search,
  Plus,
  Settings,
  Menu,
  X,
  MessageSquare,
  TrendingUp,
  Sparkles,
  ChevronDown,
  LogOut,
  HelpCircle,
  User,
  Mail,
  Shield,
  Tag,
  Wallet,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import NotificationPopover from '@/components/common/NotificationPopover';
import ThemeSwitcher from '@/components/common/ThemeSwitcher';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useLedger } from '@/extensions/ledger/contexts/LedgerContext';
import { Loading } from '../common/Loading';
import { getImageUrl, IMAGE_PRESETS } from '@/lib/utils';

export default function Header() {
  const router = useRouter();
  const { user, isAuthenticated, loading, logout, openLoginDialog } = useAuth();
  const { settings } = useSettings();
  const { isWalletEnabled } = useLedger();
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // 登出函数
  const handleLogout = () => {
    logout();
  };

  const navigationItems = [
    { href: '/', label: '首页', icon: MessageSquare },
    { href: '/categories', label: '分类', icon: Sparkles },
    { href: '/tags', label: '标签', icon: Tag },
  ];

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?s=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setIsMobileMenuOpen(false);
    }
  };

  const handleQuickSearch = (keyword) => {
    router.push(`/search?s=${encodeURIComponent(keyword)}`);
  };

  return (
    <header className='border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50'>
      <div className='container mx-auto px-4'>
        <div className='flex items-center justify-between h-14'>
          {/* Logo 和导航 */}
          <div className='flex items-center space-x-8'>
            {/* Logo */}
            <Link href='/' className='flex items-center space-x-2.5 group'>
              <img
                src={getImageUrl(settings?.site_logo?.value, IMAGE_PRESETS.icon.logo) || '/logo.svg'}
                alt='logo'
                className='h-7 w-auto max-w-[120px] transition-transform group-hover:scale-105'
              />
              <span className='text-base font-semibold text-foreground hidden sm:inline'>
                {settings?.site_name?.value || 'NodeBBS'}
              </span>
            </Link>

            {/* 桌面端导航 */}
            <nav className='hidden lg:flex items-center space-x-1'>
              {navigationItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className='flex items-center space-x-1.5 px-3 py-1.5 rounded-md font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50'
                >
                  <item.icon className='h-4 w-4' />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>

          {/* 搜索框 */}
          <div className='flex-1 max-w-md mx-6 hidden lg:block'>
            <form onSubmit={handleSearch} className='relative'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none' />
              <Input
                type='text'
                placeholder='搜索话题、用户...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='pl-9 pr-3 h-9 bg-muted/50 shadow-none'
              />
            </form>
          </div>

          {/* 右侧操作 */}
          <div className='flex items-center space-x-2'>
            {loading ? (
              /* 加载状态 */
              <div className='flex items-center space-x-2'>
                <Loading size='sm' />
              </div>
            ) : (
              <>
                {/* 发布按钮 */}
                {isAuthenticated && (
                  <Link href='/create' className='hidden sm:block'>
                    <Button>
                      <Plus className='h-4 w-4' />
                      <span className='hidden lg:inline'>发布话题</span>
                      <span className='lg:hidden'>发布</span>
                    </Button>
                  </Link>
                )}

                {/* 通知按钮 */}
                {isAuthenticated && <NotificationPopover />}

                {/* 主题切换 */}
                <ThemeSwitcher />

                {isAuthenticated ? (
                  /* 用户菜单 */
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant='ghost'>
                        <UserAvatar
                          url={user?.avatar}
                          name={user?.username || user?.name}
                          size='xs'
                          frameMetadata={user?.avatarFrame?.itemMetadata}
                        />
                        <ChevronDown className='h-3.5 w-3.5 text-muted-foreground hidden md:block' />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end' className='w-56'>
                      <DropdownMenuLabel className='pb-2'>
                        <div className='flex items-center space-x-2'>
                          <UserAvatar
                            url={user?.avatar}
                            name={user?.username}
                            size='sm'
                            frameMetadata={user?.avatarFrame?.itemMetadata}
                          />
                          <div className='flex flex-col'>
                            <div className='font-medium'>
                              {user?.name || user?.username}
                            </div>
                            <div className='text-sm text-muted-foreground font-normal'>
                              @{user?.username}
                            </div>
                          </div>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />

                      <DropdownMenuItem asChild>
                        <Link href='/profile/topics' className='cursor-pointer'>
                          <MessageSquare className='h-4 w-4' />
                          我的话题
                        </Link>
                      </DropdownMenuItem>

                      <DropdownMenuItem asChild>
                        <Link
                          href='/profile/messages'
                          className='cursor-pointer'
                        >
                          <Mail className='h-4 w-4' />
                          站内信
                        </Link>
                      </DropdownMenuItem>

                      {isWalletEnabled && (
                        <DropdownMenuItem asChild>
                          <Link
                            href='/profile/wallet'
                            className='cursor-pointer'
                          >
                            <Wallet className='h-4 w-4' />
                            我的钱包
                          </Link>
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuItem asChild>
                        <Link
                          href='/profile/settings'
                          className='cursor-pointer'
                        >
                          <Settings className='h-4 w-4' />
                          个人设置
                        </Link>
                      </DropdownMenuItem>

                      {/* 管理员入口 */}
                      {user?.isAdmin && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link
                              href='/dashboard'
                              className='cursor-pointer text-primary'
                            >
                              <Shield className='h-4 w-4' />
                              管理后台
                            </Link>
                          </DropdownMenuItem>
                        </>
                      )}

                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        onClick={handleLogout}
                        className='cursor-pointer text-red-600 dark:text-red-500'
                      >
                        <LogOut className='h-4 w-4' />
                        退出登录
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  /* 登录按钮 */
                  <>
                    <Button
                      variant='default'
                      size='sm'
                      onClick={openLoginDialog}
                      className='hidden md:flex items-center gap-1.5 h-9 shadow-sm'
                    >
                      <User className='h-4 w-4' />
                      登录
                    </Button>

                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={openLoginDialog}
                      className='md:hidden h-9 w-9 p-0'
                    >
                      <User className='h-4 w-4' />
                    </Button>
                  </>
                )}
              </>
            )}

            {/* 移动端菜单 */}
            <Popover open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='lg:hidden hover:bg-accent/50'
                >
                  {isMobileMenuOpen ? <X /> : <Menu />}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" sideOffset={0} className="w-screen mt-[1px] rounded-none shadow-none border-x-0 border-b lg:hidden p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
                {/* 移动端搜索 */}
                <div className='p-4'>
                  <form onSubmit={handleSearch} className='relative'>
                    <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 pointer-events-none' />
                    <Input
                      type='text'
                      placeholder='搜索话题、用户...'
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className='pl-9 h-9 bg-muted/50'
                    />
                  </form>
                </div>

                {/* 移动端导航 */}
                <div className='flex flex-col space-y-1 p-4 pt-0'>
                  {navigationItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className='flex items-center space-x-3 px-3 py-2 rounded-md cursor-pointer hover:bg-accent hover:text-accent-foreground'
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <item.icon className='h-4 w-4' />
                      <span className='font-medium text-sm'>{item.label}</span>
                    </Link>
                  ))}
                </div>
                
                <div className="h-px bg-border mx-4" />

                {/* 移动端操作按钮 */}
                <div className="p-4 space-y-3">
                  {!loading && isAuthenticated && (
                    <Link 
                      href='/create' 
                      className="w-full cursor-pointer focus:bg-transparent p-0 block"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Button className='w-full h-10 bg-chart-2 hover:bg-chart-2/90 text-primary-foreground shadow-sm justify-center px-3'>
                        <Plus className='h-4 w-4' />
                        发布话题
                      </Button>
                    </Link>
                  )}

                  {!loading && !isAuthenticated && (
                    <Button
                      onClick={() => {
                        openLoginDialog();
                        setIsMobileMenuOpen(false);
                      }}
                      className='w-full h-10 justify-center px-3 cursor-pointer'
                      variant="default"
                    >
                      <User className='h-4 w-4' />
                      登录
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </header>
  );
}
