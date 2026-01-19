'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from '@/components/common/Link';
import {
  Settings,
  MessageSquare,
  Star,
  MessageCircle,
  Bell,
  Mail,
  ShieldOff,
  Gift,
  Coins,
  ShoppingCart,
  Package,
  ChevronDown,
  ChevronRight,
  Store,
  Medal,
  Wallet,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useLedger, useDefaultCurrencyName } from '@/extensions/ledger/contexts/LedgerContext';
import { messageApi } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function ProfileSidebar() {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();
  const { isWalletEnabled } = useLedger();
  const currencyName = useDefaultCurrencyName();
  const [unreadCount, setUnreadCount] = useState(0);
  const [openMenus, setOpenMenus] = useState({
    'content': true,
    'messages': true,
    'rewards-shop': true,
    'account': true,
  });

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchUnreadCount();
    }
  }, [isAuthenticated, user?.id]);

  const fetchUnreadCount = async () => {
    try {
      const response = await messageApi.getList('inbox', 1, 1);
      setUnreadCount(response.unreadCount || 0);
    } catch (err) {
      console.error('获取未读消息数失败:', err);
    }
  };



  const toggleMenu = (key) => {
    setOpenMenus((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const menuItems = [
    {
      key: 'content',
      label: '内容管理',
      icon: MessageSquare,
      children: [
        {
          href: '/profile/topics',
          icon: MessageSquare,
          label: '我的话题',
        },
        {
          href: '/profile/replies',
          icon: MessageCircle,
          label: '我的回复',
        },
      ],
    },
    {
      key: 'messages',
      label: '消息中心',
      icon: Mail,
      children: [
        {
          href: '/profile/messages',
          icon: Mail,
          label: '站内信',
          badge: unreadCount > 0 ? unreadCount : null,
        },
        {
          href: '/profile/notifications',
          icon: Bell,
          label: '消息通知',
        },
      ],
    },
    ...(isWalletEnabled ? [{
      key: 'rewards-shop',
      label: '社区互动',
      icon: Store,
      children: [
        {
          href: '/profile/wallet',
          icon: Wallet,
          label: '我的钱包',
        },

        {
          href: '/profile/shop',
          icon: ShoppingCart,
          label: `${currencyName}商城`,
        },
        {
          href: '/profile/items',
          icon: Package,
          label: '我的道具',
        },
        {
          href: '/profile/badges',
          icon: Medal,
          label: '我的勋章',
        },
      ],
    }] : []),
    {
      key: 'account',
      label: '账户管理',
      icon: Settings,
      children: [
        {
          href: '/profile/settings',
          icon: Settings,
          label: '个人设置',
        },
        {
          href: '/profile/blocked',
          icon: ShieldOff,
          label: '拉黑用户',
        },
        {
          href: '/profile/invitations',
          icon: Gift,
          label: '我的邀请码',
        },
      ],
    },
  ];

  const isActive = (href) => {
    return pathname === href || pathname?.startsWith(href + '/');
  };

  const renderMenuItem = (item) => {
    const Icon = item.icon;

    // 处理有子菜单的项
    if (item.children) {
      const isOpen = openMenus[item.key];
      // 检查子菜单是否有激活项
      const hasActiveChild = item.children.some(child => isActive(child.href));

      return (
        <div key={item.key} className="mb-4">
          <button
            onClick={() => toggleMenu(item.key)}
            className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-medium uppercase tracking-widest text-muted-foreground/50 hover:text-muted-foreground/70 transition-colors"
          >
            <span>{item.label}</span>
            {isOpen ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>

          {isOpen && (
            <div className="mt-1 space-y-0.5">
              {item.children.map(child => renderMenuItem(child))}
            </div>
          )}
        </div>
      );
    }

    // 处理普通菜单项
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "group flex items-center justify-between gap-3 mx-2 px-3 py-2 text-sm rounded-md transition-colors duration-200",
          active
            ? "text-primary font-medium bg-primary/10"
            : "text-foreground/80 hover:text-foreground hover:bg-muted/50"
        )}
      >
        <div className="flex items-center gap-2.5">
          <Icon className={cn(
            "h-4 w-4 transition-colors",
            active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
          )} />
          <span>{item.label}</span>
        </div>
        {item.badge && (
          <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-[10px] font-medium">
            {item.badge > 99 ? '99+' : item.badge}
          </Badge>
        )}
      </Link>
    );
  };

  return (
    <nav className="py-3">
      {menuItems.map(item => renderMenuItem(item))}
    </nav>
  );
}
