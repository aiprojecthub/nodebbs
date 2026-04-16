'use client';

import { useState } from 'react';
import Link from '@/components/common/Link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import UserAvatar from '@/components/user/UserAvatar';
import {
  Search,
  AlignJustify,
  Mail,
  Settings,
  LogOut,
  User,
  Shield,
  Wallet,
  MessageSquare,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import NotificationPopover from '@/components/common/NotificationPopover';
import ThemeSwitcher from '@/components/common/ThemeSwitcher';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useLedger } from '@/extensions/ledger/contexts/LedgerContext';
import { usePermission } from '@/hooks/usePermission';
import { useSidebar } from '../components/SidebarContext';

export default function Header() {
  const router = useRouter();
  const { user, isAuthenticated, loading, logout, openLoginDialog } = useAuth();
  const { settings } = useSettings();
  const { isWalletEnabled } = useLedger();
  const { hasDashboardAccess } = usePermission();
  const { toggle } = useSidebar();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?s=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  return (
    <header className='border-b border-border bg-background sticky top-0 z-50'>
      <div className='flex items-center h-[57px] px-4 sm:px-6 gap-3'>
        {/* 左侧: 折叠按钮 + Logo + 站名 */}
        <button
          onClick={toggle}
          className='p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors'
          title='切换菜单'
        >
          <AlignJustify className='h-5 w-5' />
        </button>
        <Link href='/' className='flex items-center gap-2 shrink-0'>
          <img
            src={settings?.site_logo?.value || '/logo.svg'}
            alt='logo'
            className='h-6 w-auto'
          />
          <span className='text-lg font-bold text-foreground hidden sm:inline' style={{ fontFamily: 'var(--font-serif)' }}>
            {settings?.site_name?.value || 'NodeBBS'}
          </span>
        </Link>

        {/* 搜索框 */}
        <div className='flex-1 max-w-xs ml-2'>
          <form onSubmit={handleSearch} className='relative'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 pointer-events-none' />
            <input
              type='text'
              placeholder='搜索'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='w-full h-9 pl-9 pr-3 rounded-full bg-muted/50 text-sm outline-none focus:bg-muted transition-colors placeholder:text-muted-foreground/50 border-none'
            />
          </form>
        </div>

        <div className='flex-1' />

        {/* 右侧操作区 */}
        <div className='flex items-center gap-2 shrink-0'>
          {!loading && (
            <>
              <ThemeSwitcher />

              {isAuthenticated ? (
                <>
                  <NotificationPopover />

                  {/* 用户菜单 */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className='rounded-full hover:opacity-80 transition-opacity'>
                        <UserAvatar
                          url={user?.avatar}
                          name={user?.name || user?.username}
                          size='sm'
                          frameMetadata={user?.avatarFrame?.itemMetadata}
                        />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end' className='w-56'>
                      <DropdownMenuLabel className='pb-2'>
                        <div className='flex flex-col'>
                          <span className='font-bold text-sm'>{user?.name || user?.username}</span>
                          <span className='text-xs text-muted-foreground font-normal'>@{user?.username}</span>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href={`/users/${user?.username}`} className='cursor-pointer'>
                          <User className='h-4 w-4' /> 个人主页
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href='/profile/topics' className='cursor-pointer'>
                          <MessageSquare className='h-4 w-4' /> 我的文章
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href='/profile/messages' className='cursor-pointer'>
                          <Mail className='h-4 w-4' /> 站内信
                        </Link>
                      </DropdownMenuItem>
                      {isWalletEnabled && (
                        <DropdownMenuItem asChild>
                          <Link href='/profile/wallet' className='cursor-pointer'>
                            <Wallet className='h-4 w-4' /> 我的钱包
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem asChild>
                        <Link href='/profile/settings' className='cursor-pointer'>
                          <Settings className='h-4 w-4' /> 个人设置
                        </Link>
                      </DropdownMenuItem>
                      {hasDashboardAccess() && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link href='/dashboard' className='cursor-pointer text-primary'>
                              <Shield className='h-4 w-4' /> 管理后台
                            </Link>
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={logout} className='cursor-pointer text-red-600 dark:text-red-500'>
                        <LogOut className='h-4 w-4' /> 退出登录
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  <Button variant='ghost' size='sm' onClick={openLoginDialog} className='text-sm text-muted-foreground hover:text-foreground'>
                    登录
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
