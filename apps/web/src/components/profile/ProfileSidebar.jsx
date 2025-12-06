'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
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
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { messageApi, creditsApi } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function ProfileSidebar() {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [creditEnabled, setCreditEnabled] = useState(false);
  const [openMenus, setOpenMenus] = useState({
    'content': true,
    'messages': true,
    'credits-shop': true,
    'account': true,
  });

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchUnreadCount();
      fetchCreditStatus();
    }
  }, [isAuthenticated, user]);

  const fetchUnreadCount = async () => {
    try {
      const response = await messageApi.getList('inbox', 1, 1);
      setUnreadCount(response.unreadCount || 0);
    } catch (err) {
      console.error('获取未读消息数失败:', err);
    }
  };

  const fetchCreditStatus = async () => {
    try {
      const { enabled } = await creditsApi.getStatus();
      setCreditEnabled(enabled);
    } catch (err) {
      console.error('获取积分系统状态失败:', err);
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
        {
          href: '/profile/favorites',
          icon: Star,
          label: '我的收藏',
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
    ...(creditEnabled ? [{
      key: 'credits-shop',
      label: '社区互动',
      icon: Store,
      children: [
        {
          href: '/profile/credits',
          icon: Coins,
          label: '积分中心',
        },
        {
          href: '/profile/shop',
          icon: ShoppingCart,
          label: '积分商城',
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
        <div key={item.key} className="space-y-1">
          <button
            onClick={() => toggleMenu(item.key)}
            className={cn(
              "w-full flex items-center justify-between gap-3 px-3 py-2 text-sm rounded-md transition-colors",
              hasActiveChild
                ? "text-foreground font-medium"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            <div className="flex items-center gap-3">
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </div>
            {isOpen ? (
              <ChevronDown className="h-4 w-4 opacity-50" />
            ) : (
              <ChevronRight className="h-4 w-4 opacity-50" />
            )}
          </button>
          
          {isOpen && (
            <div className="pl-4 space-y-1 border-l ml-4 my-1">
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
        prefetch={false}
        className={cn(
          "flex items-center justify-between gap-3 px-3 py-2 text-sm rounded-md transition-colors",
          active
            ? "bg-muted font-medium text-foreground"
            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        )}
      >
        <div className="flex items-center gap-3">
          <Icon className="h-4 w-4" />
          <span>{item.label}</span>
        </div>
        {item.badge && (
          <Badge variant="destructive" className="text-xs">
            {item.badge}
          </Badge>
        )}
      </Link>
    );
  };

  return (
    <nav className="space-y-1">
      {menuItems.map(item => renderMenuItem(item))}
    </nav>
  );
}
