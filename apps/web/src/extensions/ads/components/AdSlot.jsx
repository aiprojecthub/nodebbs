'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useAds } from '../contexts/AdsContext';
import { cn } from '@/lib/utils';

/**
 * 广告展示组件
 * @param {Object} props
 * @param {string} props.slotCode - 广告位代码
 * @param {string} [props.className] - 自定义样式类
 * @param {boolean} [props.showEmpty=false] - 无广告时是否显示占位
 * @param {'cover' | 'contain' | 'fill' | 'none' | 'scale-down'} [props.imageFit='cover'] - 图片填充模式
 */
export default function AdSlot({ slotCode, className, showEmpty = false, imageFit = 'cover' }) {
  const { slot, ads, loading, error, recordClick } = useAds(slotCode);

  // 判断是否为横幅广告（宽高比 > 2）
  const isBanner = slot?.width && slot?.height && slot.width / slot.height > 2;

  // 渲染单个广告
  const renderAd = (ad) => {
    const handleClick = () => recordClick(ad.id);

    switch (ad.type) {
      case 'image':
        return (
          <a
            key={ad.id}
            href={ad.linkUrl || '#'}
            target={ad.targetBlank ? '_blank' : '_self'}
            rel={ad.targetBlank ? 'noopener noreferrer' : undefined}
            onClick={handleClick}
            className="block"
          >
            <img
              src={ad.content}
              alt={ad.title}
              className={cn(
                'block mx-auto',
                isBanner
                  ? 'max-w-full' // Banner: 最大宽度 100%
                  : 'w-full h-auto object-contain' // Rectangle: 宽度受限，高度自适应
              )}
              style={
                isBanner
                  ? { 
                      width: '100%', 
                      height: `${slot.height}px`, // 固定高度
                      objectFit: imageFit
                    } 
                  : { maxWidth: `${slot.width}px` } // Rectangle: 限制最大宽度
              }
            />
          </a>
        );

      case 'html':
        return (
          <div
            key={ad.id}
            onClick={handleClick}
            dangerouslySetInnerHTML={{ __html: ad.content }}
          />
        );

      case 'script':
        return <ScriptAd key={ad.id} ad={ad} onLoad={handleClick} />;

      default:
        return null;
    }
  };

  // 加载中不显示
  if (loading) {
    return null;
  }

  // 出错或无广告
  if (error || !slot || !ads || ads.length === 0) {
    if (showEmpty && slot) {
      return (
        <div
          className={cn(
            'flex items-center justify-center bg-muted/30 text-muted-foreground text-sm rounded-lg',
            className
          )}
          style={{
            maxWidth: isBanner ? 'none' : (slot.width ? `${slot.width}px` : '100%'),
            width: '100%',
            height: isBanner ? 'auto' : (slot.height ? `${slot.height}px` : '90px'),
            minHeight: isBanner ? `${slot.height}px` : undefined,
          }}
        >
          广告位
        </div>
      );
    }
    return null;
  }

  return (
    <div className={cn('promo-slot rounded-lg overflow-hidden', className)} data-slot={slotCode}>
      {ads.map(renderAd)}
    </div>
  );
}

/**
 * 脚本广告组件
 */
function ScriptAd({ ad, onLoad }) {
  const containerRef = useRef(null);
  const scriptLoaded = useRef(false);

  useEffect(() => {
    if (!containerRef.current || !ad.content || scriptLoaded.current) {
      return;
    }

    scriptLoaded.current = true;

    const temp = document.createElement('div');
    temp.innerHTML = ad.content;

    const scripts = temp.getElementsByTagName('script');
    const nonScriptContent = ad.content.replace(/<script[\s\S]*?<\/script>/gi, '');

    if (nonScriptContent.trim()) {
      containerRef.current.innerHTML = nonScriptContent;
    }

    Array.from(scripts).forEach((originalScript) => {
      const script = document.createElement('script');
      Array.from(originalScript.attributes).forEach((attr) => {
        script.setAttribute(attr.name, attr.value);
      });
      if (originalScript.innerHTML) {
        script.innerHTML = originalScript.innerHTML;
      }
      containerRef.current.appendChild(script);
    });

    if (onLoad) {
      onLoad();
    }
  }, [ad.content, onLoad]);

  return <div ref={containerRef} />;
}
