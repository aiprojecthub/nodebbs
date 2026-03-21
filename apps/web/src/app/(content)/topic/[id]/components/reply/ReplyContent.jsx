'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MarkdownRender from '@/components/common/MarkdownRender';

export default function ReplyContent({ content }) {
  const contentRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsCollapse, setNeedsCollapse] = useState(false);
  const [hasCheckedHeight, setHasCheckedHeight] = useState(false);
  const MAX_CONTENT_HEIGHT = 300; // 折叠阈值高度 (px)

  // 检测内容高度 - 使用 useLayoutEffect 在绘制前完成检测，避免闪烁
  useEffect(() => {
    if (contentRef.current) {
      const height = contentRef.current.scrollHeight;
      setNeedsCollapse(height > MAX_CONTENT_HEIGHT);
      setHasCheckedHeight(true);
    }
  }, [content]);

  return (
    <div className="relative">
      <div 
        ref={contentRef}
        className={`max-w-none prose prose-stone dark:prose-invert prose-sm sm:prose-base wrap-break-word transition-all duration-300 ${
          // 检测完成前默认折叠，检测完成后根据实际情况决定
          (!hasCheckedHeight || (!isExpanded && needsCollapse)) ? 'max-h-75 overflow-hidden' : ''
        }`}
        style={{
          // 只有检测完成且确认需要折叠时才显示渐变遮罩
          maskImage: hasCheckedHeight && !isExpanded && needsCollapse 
            ? 'linear-gradient(to bottom, black 70%, transparent 100%)' 
            : 'none',
          WebkitMaskImage: hasCheckedHeight && !isExpanded && needsCollapse
            ? 'linear-gradient(to bottom, black 70%, transparent 100%)'
            : 'none',
        }}
      >
        <MarkdownRender content={content} />
      </div>
      
      {/* 展开/收起按钮 */}
      {needsCollapse && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2 h-8 text-xs text-muted-foreground hover:bg-transparent hover:text-primary gap-1.5"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              收起
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              展开全部
            </>
          )}
        </Button>
      )}
    </div>
  );
}
