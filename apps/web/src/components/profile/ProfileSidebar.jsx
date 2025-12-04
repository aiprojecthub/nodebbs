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
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { messageApi } from '@/lib/api';

export default function ProfileSidebar() {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchUnreadCount();
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

  const menuItems = [
    {
      href: '/profile/topics',
      icon: MessageSquare,
      label: '我的话题',
    },
    {
      href: '/profile/favorites',
      icon: Star,
      label: '我的收藏',
    },
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
      href: '/profile/replies',
      icon: MessageCircle,
      label: '我的回复',
    },
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
    {
      href: '/profile/settings',
      icon: Settings,
      label: '个人设置',
    },
  ];

  const isActive = (href) => {
    return pathname === href || pathname?.startsWith(href + '/');
  };

  return (
    <nav className='space-y-1'>
      {menuItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            className={`
                flex items-center justify-between gap-3 px-3 py-2 text-sm rounded-md transition-colors
                ${
                  active
                    ? 'bg-muted font-medium text-foreground'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }
              `}
          >
            <div className='flex items-center gap-3'>
              <Icon className='h-4 w-4' />
              <span>{item.label}</span>
            </div>
            {item.badge && (
              <Badge variant='destructive' className='text-xs'>
                {item.badge}
              </Badge>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
