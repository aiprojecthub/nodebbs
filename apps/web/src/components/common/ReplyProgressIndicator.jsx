'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageSquare } from 'lucide-react';

/**
 * 回复进度指示器组件
 * 显示当前查看到第几个回复和总回复数
 * 类似 Discourse 的设计
 */
export default function ReplyProgressIndicator({ posts, totalReplies, maxPostNumber }) {
  const [currentPostNumber, setCurrentPostNumber] = useState(1);
  const [isVisible, setIsVisible] = useState(false);
  const observerRef = useRef(null);

  useEffect(() => {
    // 创建 Intersection Observer 来监听回复的可见性
    const options = {
      root: null,
      rootMargin: '-40% 0px -40% 0px', // 当元素在视口中间附近时触发
      threshold: [0, 0.5, 1], // 多个阈值，提高检测准确性
    };

    observerRef.current = new IntersectionObserver((entries) => {
      // 找出所有可见的元素，选择编号最大的
      const visiblePosts = entries
        .filter(entry => entry.isIntersecting)
        .map(entry => parseInt(entry.target.dataset.postNumber))
        .filter(num => !isNaN(num));
      
      if (visiblePosts.length > 0) {
        const maxVisible = Math.max(...visiblePosts);
        setCurrentPostNumber(maxVisible);
      }
    }, options);

    // 延迟观察元素，确保 DOM 已经更新（特别是在分页切换后）
    const observeElements = () => {
      const replyElements = document.querySelectorAll('[data-post-number]');
      replyElements.forEach((element) => {
        observerRef.current?.observe(element);
      });
    };

    // 使用 setTimeout 确保在 DOM 更新后执行
    const timeoutId = setTimeout(observeElements, 100);

    // 监听滚动来控制指示器的显示/隐藏
    const handleScroll = () => {
      const scrollY = window.scrollY;
      // 滚动超过 200px 时显示指示器
      setIsVisible(scrollY > 200);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // 初始检查

    return () => {
      clearTimeout(timeoutId);
      observerRef.current?.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, [posts]);

  // 点击指示器滚动到特定回复
  const handleClick = () => {
    const input = prompt(`跳转到 postNumber (1-${maxPostNumber}):`, currentPostNumber);
    if (input) {
      const targetPostNumber = parseInt(input);
      if (targetPostNumber >= 1 && targetPostNumber <= maxPostNumber) {
        const element = document.querySelector(`[data-post-number="${targetPostNumber}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  };

  if (!isVisible || maxPostNumber <= 1) {
    return null;
  }

  return (
    <div
      className="fixed left-4 top-1/2 -translate-y-1/2 z-40 hidden lg:block"
      onClick={handleClick}
    >
      <div className="flex flex-col items-center gap-2 bg-card border border-border rounded-lg shadow-lg p-3 cursor-pointer hover:shadow-xl transition hover:scale-105">
        {/* 图标 */}
        <MessageSquare className="h-5 w-5 text-muted-foreground" />
        
        {/* 进度条 */}
        <div className="relative w-1 h-24 bg-muted rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 right-0 bg-primary rounded-full transition-[height] duration-300"
            style={{
              height: `${(currentPostNumber / maxPostNumber) * 100}%`,
            }}
          />
        </div>
        
        {/* 当前 postNumber / 最大 postNumber */}
        <div className="flex flex-col items-center text-xs">
          <span className="font-semibold text-foreground">{currentPostNumber}</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-muted-foreground">{maxPostNumber}</span>
        </div>
      </div>
    </div>
  );
}
