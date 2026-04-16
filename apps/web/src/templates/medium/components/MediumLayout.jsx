'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSidebar } from './SidebarContext';
import LeftNav from './LeftNav';

/**
 * open === null: 用户未交互，纯 CSS 控制（lg:展开，<lg:隐藏），无动画，无抖动
 * open === true/false: 用户已交互，JS 控制 + transition 动画
 */
function SidebarDrawer({ version }) {
  const { open, close } = useSidebar();
  const interacted = open !== null;

  // 桌面端样式
  const desktopClass = interacted
    ? `hidden lg:flex flex-col shrink-0 border-r border-border sticky top-[57px] h-[calc(100vh-57px)] overflow-hidden transition-[width] duration-300 ease-in-out ${
        open ? 'w-[220px]' : 'w-0 border-r-0'
      }`
    : 'hidden lg:flex flex-col shrink-0 w-[220px] border-r border-border sticky top-[57px] h-[calc(100vh-57px)] overflow-hidden';

  // 移动端遮罩+抽屉样式
  const mobileOverlayClass = interacted
    ? `lg:hidden fixed inset-0 z-40 transition-opacity duration-300 ${
        open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`
    : 'hidden';

  const mobileDrawerClass = interacted
    ? `absolute top-[57px] left-0 bottom-0 w-[260px] bg-background border-r border-border shadow-xl transition-transform duration-300 ease-in-out ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`
    : '';

  return (
    <>
      {/* 桌面端 */}
      <aside className={desktopClass}>
        <div className='w-[220px] h-full'>
          <LeftNav version={version} />
        </div>
      </aside>

      {/* 移动端 */}
      <div className={mobileOverlayClass}>
        <div className='absolute inset-0 bg-black/30' onClick={close} />
        <aside className={mobileDrawerClass}>
          <LeftNav version={version} onNavigate={close} />
        </aside>
      </div>
    </>
  );
}

export default function MediumLayout({ children, version }) {
  const pathname = usePathname();

  // 路由变化时滚动到顶部
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className='flex flex-1'>
      <SidebarDrawer version={version} />
      <main className='flex-1 min-w-0 flex flex-col'>
        {children}
      </main>
    </div>
  );
}
