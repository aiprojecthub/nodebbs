'use client';

import React, { useState, useEffect } from 'react';

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { ChevronRight, X } from 'lucide-react';

export default function StickySidebar({ children, className, enabled = true }) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    setMounted(true);

    // 客户端检查屏幕尺寸
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    checkDesktop();
    window.addEventListener('resize', checkDesktop);

    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // 在服务器端和客户端首次渲染时，始终渲染为桌面版本
  if (!mounted) {
    return <aside className={className}>{children}</aside>;
  }

  if (isDesktop || !enabled) {
    return <aside className={className}>{children}</aside>;
  }

  return (
    <Drawer direction='left' open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant='outline' size='icon' className='w-11 h-11 fixed z-10 top-1/2 -left-2 -translate-y-1/2 rounded-none rounded-tr-full rounded-br-full opacity-65'>
          <ChevronRight className='h-6 w-6' />
        </Button>
      </DrawerTrigger>
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
  );
}
