'use client';

import { useState } from 'react';
import Link from '@/components/common/Link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Loader2,
  LayoutDashboard,
  FolderTree,
  Users,
  Tag,
  Flag,
  Settings,
  Shield,
  MessageSquare,
  MessagesSquare,
  ShoppingCart,
  Coins,
  Store,
  ChevronDown,
  ChevronRight,
  FileText,
  UserCog,
  ShieldAlert,
  Gift,
  Medal,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DashboardSidebar() {
  const pathname = usePathname();
  const [openMenus, setOpenMenus] = useState({
    'content': true,
    'users': true,
    'security': true,
    'credits-shop': true,
  });

  const toggleMenu = (key) => {
    setOpenMenus((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const navItems = [
    // 概览 - 独立项
    { href: '/dashboard', icon: LayoutDashboard, label: '概览', exact: true },
    
    // 内容管理
    {
      key: 'content',
      label: '内容管理',
      icon: FileText,
      children: [
        { href: '/dashboard/topics', icon: MessageSquare, label: '话题管理' },
        { href: '/dashboard/posts', icon: MessagesSquare, label: '回复管理' },
        { href: '/dashboard/categories', icon: FolderTree, label: '分类管理' },
        { href: '/dashboard/tags', icon: Tag, label: '标签管理' },
      ],
    },
    
    // 用户管理
    {
      key: 'users',
      label: '用户管理',
      icon: UserCog,
      children: [
        { href: '/dashboard/users', icon: Users, label: '用户管理' },
        { href: '/dashboard/invitations', icon: Gift, label: '邀请码' },
        { href: '/dashboard/invitation-rules', icon: Settings, label: '邀请码规则' },
      ],
    },
    
    // 安全审核
    {
      key: 'security',
      label: '安全审核',
      icon: ShieldAlert,
      children: [
        { href: '/dashboard/reports', icon: Flag, label: '举报管理' },
        { href: '/dashboard/moderation', icon: Shield, label: '内容审核' },
      ],
    },
    
    // 积分系统
    {
      key: 'credits-shop',
      label: '社区互动',
      icon: Store,
      children: [
        { href: '/dashboard/ledger', icon: Coins, label: '货币管理' },

        { href: '/dashboard/shop', icon: ShoppingCart, label: '商城管理' },
        { href: '/dashboard/badges', icon: Medal, label: '勋章管理' },
      ],
    },
    
    // 系统配置 - 独立项
    { href: '/dashboard/settings', icon: Settings, label: '系统配置' },
  ];

  const isActive = (href, exact = false) => {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
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
    const active = isActive(item.href, item.exact);
    return (
      <Link
        key={item.href}
        href={item.href}
       
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
      </Link>
    );
  };

  return (
    <>
      <h1 className="text-lg text-center font-semibold p-4 bg-muted text-muted-foreground rounded-xl">
        管理后台
      </h1>
      <nav className="space-y-1">
        {navItems.map(item => renderMenuItem(item))}
      </nav>
    </>
  );
}
