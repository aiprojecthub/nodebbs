'use client';

import Link from 'next/link';
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
} from 'lucide-react';

export default function DashboardSidebar() {
  const pathname = usePathname();
  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: '概览', exact: true },
    { href: '/dashboard/topics', icon: MessageSquare, label: '话题管理' },
    { href: '/dashboard/posts', icon: MessagesSquare, label: '回复管理' },
    { href: '/dashboard/categories', icon: FolderTree, label: '分类管理' },
    { href: '/dashboard/users', icon: Users, label: '用户管理' },
    { href: '/dashboard/tags', icon: Tag, label: '标签管理' },
    { href: '/dashboard/reports', icon: Flag, label: '举报管理' },
    { href: '/dashboard/moderation', icon: Shield, label: '内容审核' },
    { href: '/dashboard/invitations', icon: Shield, label: '邀请码' },
    { href: '/dashboard/invitation-rules', icon: Shield, label: '邀请码规则' },
    { href: '/dashboard/settings', icon: Settings, label: '系统配置' },
  ];

  const isActive = (href, exact = false) => {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      <h1 className='text-lg text-center font-semibold p-4 bg-muted text-muted-foreground rounded-xl'>
        管理后台
      </h1>
      <nav className='space-y-1'>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href, item.exact);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                      flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors
                      ${
                        active
                          ? 'bg-muted font-medium text-foreground'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      }
                    `}
            >
              <Icon className='h-4 w-4' />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
