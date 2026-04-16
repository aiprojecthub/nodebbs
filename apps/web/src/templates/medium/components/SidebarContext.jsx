'use client';

import { createContext, useContext, useState, useCallback } from 'react';

const SidebarContext = createContext(null);

export const SIDEBAR_WIDTH = 220;

/**
 * open 状态仅在用户手动 toggle 后才有意义。
 * 初始值 null 表示"未交互" — 此时由 CSS 媒体查询决定显隐，避免水合抖动。
 */
export function SidebarProvider({ children }) {
  const [open, setOpen] = useState(null);

  const toggle = useCallback(() => {
    setOpen((v) => (v === null ? false : !v));
  }, []);

  const close = useCallback(() => setOpen(false), []);

  // open === null (未交互): 桌面端视为展开
  // open === true/false: 用户已交互，以实际值为准
  const isOpen = open === null ? true : open;

  return (
    <SidebarContext.Provider value={{ open, isOpen, toggle, close }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider');
  return ctx;
}
