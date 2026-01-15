'use client';

import React, { useState, useSyncExternalStore, useCallback } from 'react';

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { Menu, X } from 'lucide-react';
import FloatingBall from './FloatingBall';

/**
 * 自定义 useMediaQuery hook
 * 使用 useSyncExternalStore 确保 SSR 和客户端状态一致
 * @param {string} query - CSS 媒体查询字符串
 * @returns {boolean} - 是否匹配媒体查询
 */
function useMediaQuery(query) {
  const subscribe = useCallback(
    (callback) => {
      const mediaQuery = window.matchMedia(query);
      mediaQuery.addEventListener('change', callback);
      return () => mediaQuery.removeEventListener('change', callback);
    },
    [query]
  );

  const getSnapshot = () => {
    try {
      return window.matchMedia(query).matches;
    } catch {
      // 如果 matchMedia 不支持，默认返回 true（桌面端行为）
      return true;
    }
  };

  // SSR 时返回 true，确保服务端渲染桌面版本
  const getServerSnapshot = () => true;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export default function StickySidebar({ children, className, enabled = true }) {
  const [open, setOpen] = useState(false);
  // 使用改进的 useMediaQuery hook，SSR 时返回 true（桌面端）
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  // 桌面端或禁用时，直接渲染 aside
  if (isDesktop || !enabled) {
    return <aside className={className}>{children}</aside>;
  }

  return (
    <>
      {/* 悬浮球 - 始终挂载，保持位置状态 */}
      <FloatingBall onClick={() => setOpen(true)}>
        <Menu className='h-5 w-5' />
      </FloatingBall>

      <Drawer direction='left' open={open} onOpenChange={setOpen}>
        <DrawerContent className='right-2 top-2 bottom-2 outline-none w-[310px]'>
          <DrawerHeader>
            <DrawerTitle className='text-right'>
              <DrawerClose>
                <X className='h-6 w-6' />
              </DrawerClose>
            </DrawerTitle>
          </DrawerHeader>
          {/* 移动端覆盖样式 */}
          <div
            className={cn(className, 'p-4 static overflow-y-auto')}
            onClick={(e) => {
              const link = e.target.closest('a');
              if (link) {
                setOpen(false);
              }
            }}
          >
            {children}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

