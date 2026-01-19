'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

/**
 * 悬浮球组件
 * 支持拖动、吸附左右两侧、阻力效果
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - 悬浮球内容
 * @param {function} props.onClick - 点击事件
 * @param {string} props.className - 自定义样式
 */
export default function FloatingBall({ children, onClick, className }) {
  const ballRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isLeft, setIsLeft] = useState(true); // 吸附在左侧还是右侧
  const [isInitialized, setIsInitialized] = useState(false);
  const [mounted, setMounted] = useState(false); // 用于 Portal 挂载检测
  
  // 拖动相关的 ref（使用 ref 存储，避免闭包问题）
  const dragStateRef = useRef({
    startX: 0,
    startY: 0,
    positionStartX: 0,
    positionStartY: 0,
    hasMoved: false,
    isDragging: false,
  });
  
  // 悬浮球尺寸
  const BALL_SIZE = 44;
  // 吸附时距离边缘的距离
  const EDGE_MARGIN = 12;
  // 阻力系数 (0-1, 越小阻力越大)
  const DRAG_RESISTANCE = 0.85;
  
  // 挂载检测，确保只在客户端渲染 Portal
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // 获取安全区域边界
  const getSafeArea = useCallback(() => {
    const safeAreaTop = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sat') || '0');
    const safeAreaBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sab') || '0');
    const safeAreaLeft = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sal') || '0');
    const safeAreaRight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sar') || '0');
    
    return {
      top: Math.max(safeAreaTop, 56 + 16), // Header 高度 + 间距
      bottom: Math.max(safeAreaBottom, 16),
      left: Math.max(safeAreaLeft, EDGE_MARGIN),
      right: Math.max(safeAreaRight, EDGE_MARGIN),
    };
  }, []);
  
  // 初始化位置（左下角）
  useEffect(() => {
    const safeArea = getSafeArea();
    const initialY = window.innerHeight - BALL_SIZE - safeArea.bottom - 80;
    
    setPosition({ x: safeArea.left, y: initialY });
    setIsInitialized(true);
  }, [getSafeArea]);
  
  // 限制位置在安全区域内
  const clampPosition = useCallback((x, y) => {
    const safeArea = getSafeArea();
    const maxX = window.innerWidth - BALL_SIZE - safeArea.right;
    const maxY = window.innerHeight - BALL_SIZE - safeArea.bottom;
    
    return {
      x: Math.max(safeArea.left, Math.min(x, maxX)),
      y: Math.max(safeArea.top, Math.min(y, maxY)),
    };
  }, [getSafeArea]);

  // 使用 ref 绑定 touch 事件（设置 passive: false 以允许 preventDefault）
  useEffect(() => {
    const ball = ballRef.current;
    if (!ball) return;

    const handleTouchStart = (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      
      dragStateRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        positionStartX: position.x,
        positionStartY: position.y,
        hasMoved: false,
        isDragging: true,
      };
      setIsDragging(true);
    };

    const handleTouchMove = (e) => {
      e.preventDefault();
      const state = dragStateRef.current;
      if (!state.isDragging) return;
      
      const touch = e.touches[0];
      const deltaX = (touch.clientX - state.startX) * DRAG_RESISTANCE;
      const deltaY = (touch.clientY - state.startY) * DRAG_RESISTANCE;
      
      // 判断是否有移动
      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        dragStateRef.current.hasMoved = true;
      }
      
      const newPos = clampPosition(
        state.positionStartX + deltaX,
        state.positionStartY + deltaY
      );
      
      setPosition(newPos);
    };

    const handleTouchEnd = (e) => {
      e.preventDefault();
      const state = dragStateRef.current;
      if (!state.isDragging) return;
      
      dragStateRef.current.isDragging = false;
      setIsDragging(false);
      
      // 如果没有移动，触发点击
      if (!state.hasMoved) {
        onClick?.();
        return;
      }
      
      // 根据当前位置决定吸附到左侧还是右侧
      setPosition(prev => {
        const safeArea = getSafeArea();
        const centerX = window.innerWidth / 2;
        const shouldBeLeft = prev.x + BALL_SIZE / 2 < centerX;
        
        setIsLeft(shouldBeLeft);
        
        const targetX = shouldBeLeft 
          ? safeArea.left 
          : window.innerWidth - BALL_SIZE - safeArea.right;
        
        return clampPosition(targetX, prev.y);
      });
    };

    // 添加 passive: false 的事件监听器
    ball.addEventListener('touchstart', handleTouchStart, { passive: false });
    ball.addEventListener('touchmove', handleTouchMove, { passive: false });
    ball.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      ball.removeEventListener('touchstart', handleTouchStart);
      ball.removeEventListener('touchmove', handleTouchMove);
      ball.removeEventListener('touchend', handleTouchEnd);
    };
  }, [position.x, position.y, clampPosition, getSafeArea, onClick]);
  
  // Mouse 事件处理（用于桌面端调试）
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    
    dragStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      positionStartX: position.x,
      positionStartY: position.y,
      hasMoved: false,
      isDragging: true,
    };
    setIsDragging(true);
  }, [position.x, position.y]);
  
  useEffect(() => {
    const state = dragStateRef.current;
    if (!isDragging) return;
    
    const handleMouseMove = (e) => {
      if (!state.isDragging) return;
      
      const deltaX = (e.clientX - state.startX) * DRAG_RESISTANCE;
      const deltaY = (e.clientY - state.startY) * DRAG_RESISTANCE;
      
      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        dragStateRef.current.hasMoved = true;
      }
      
      const newPos = clampPosition(
        state.positionStartX + deltaX,
        state.positionStartY + deltaY
      );
      
      setPosition(newPos);
    };
    
    const handleMouseUp = () => {
      if (!state.isDragging) return;
      
      dragStateRef.current.isDragging = false;
      setIsDragging(false);
      
      if (!state.hasMoved) {
        onClick?.();
        return;
      }
      
      setPosition(prev => {
        const safeArea = getSafeArea();
        const centerX = window.innerWidth / 2;
        const shouldBeLeft = prev.x + BALL_SIZE / 2 < centerX;
        
        setIsLeft(shouldBeLeft);
        
        const targetX = shouldBeLeft 
          ? safeArea.left 
          : window.innerWidth - BALL_SIZE - safeArea.right;
        
        return clampPosition(targetX, prev.y);
      });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, clampPosition, getSafeArea, onClick]);
  
  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => clampPosition(prev.x, prev.y));
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [clampPosition]);
  
  // 未初始化或未挂载时不渲染
  if (!isInitialized || !mounted) return null;
  
  const ballElement = (
    <div
      ref={ballRef}
      className={cn(
        'fixed z-50 flex items-center justify-center',
        'w-12 h-12 rounded-full',
        'bg-primary text-primary-foreground',
        'shadow-[0_4px_14px_rgba(0,0,0,0.25),0_0_0_3px_rgba(var(--primary)/0.15)]',
        'touch-none select-none cursor-grab',
        'active:scale-95',
        isDragging 
          ? 'scale-110 shadow-[0_8px_25px_rgba(0,0,0,0.3)] cursor-grabbing' 
          : 'transition-all duration-300 ease-out hover:scale-105 hover:shadow-[0_6px_20px_rgba(0,0,0,0.3)]',
        className
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onMouseDown={handleMouseDown}
    >
      {children}
    </div>
  );
  
  // 使用 Portal 将悬浮球渲染到 body，脱离父组件的层叠上下文
  return createPortal(ballElement, document.body);
}
