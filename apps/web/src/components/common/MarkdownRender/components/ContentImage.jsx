'use client';

import { useState, useCallback, useRef, useEffect, useId } from 'react';
import { ZoomIn } from 'lucide-react';
import { useImagePreview } from '@/components/common/ImagePreview/ImagePreviewContext';
import { getImageUrl, isLocalImage } from '@/lib/utils';

/**
 * 内容图片组件 - 支持缩略图和点击放大
 * 用于 MarkdownRender 中的图片展示
 */
const MIN_ZOOM_SIZE = 1024;
export function ContentImage({ src, alt, ...props }) {
  const [imageError, setImageError] = useState(false);
  const [isZoomable, setIsZoomable] = useState(false);
  const imgRef = useRef(null);
  const spanRef = useRef(null);
  const id = useId();
  const { register, unregister, openPreview } = useImagePreview();

  // 判断是否是本站可处理的图片
  const isLocal = isLocalImage(src);

  // 生成缩略图 URL（仅本站图片）
  const thumbnailUrl = isLocal
    ? getImageUrl(src, `fit_inside,f_webp,s_${MIN_ZOOM_SIZE}x${MIN_ZOOM_SIZE}`)
    : src;

  // 原图 URL
  const originalUrl = src;

  const handleImageClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    openPreview(id);
  }, [openPreview, id]);

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  const checkZoomable = useCallback((img) => {
    const { naturalWidth, naturalHeight } = img;
    if (naturalWidth >= MIN_ZOOM_SIZE || naturalHeight >= MIN_ZOOM_SIZE) {
      setIsZoomable(true);
    }
  }, []);

  const handleImageLoad = useCallback((e) => {
    checkZoomable(e.currentTarget);
  }, [checkZoomable]);

  // 处理缓存图片的情况
  useEffect(() => {
    if (imgRef.current && imgRef.current.complete) {
      checkZoomable(imgRef.current);
    }
  }, [checkZoomable]);

  // 注册/注销图片到 Context
  useEffect(() => {
    if (isZoomable && spanRef.current) {
      register(id, originalUrl, alt, spanRef.current);
      return () => {
        unregister(id);
      };
    }
  }, [isZoomable, id, originalUrl, alt, register, unregister]);

  if (!src || src.trim() === '') {
    return null;
  }

  // 图片加载失败时显示原图
  const displayUrl = imageError ? originalUrl : thumbnailUrl;

  return (
    <span
      ref={spanRef}
      className={`inline-block relative ${isZoomable ? 'cursor-zoom-in group/image' : ''} not-prose`}
      onClick={isZoomable ? handleImageClick : undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={displayUrl}
        alt={alt || ''}
        loading="lazy"
        onLoad={handleImageLoad}
        onError={handleImageError}
        className="max-w-full h-auto rounded"
        style={{
          maxWidth: `min(100%, ${MIN_ZOOM_SIZE}px)`,
          maxHeight: `${MIN_ZOOM_SIZE}px`,
        }}
        {...props}
      />
      {/* 放大图标提示 */}
      {isZoomable && (
        <span className="absolute inset-0 flex items-center justify-center bg-transparent group-hover/image:bg-background/30 group-hover/image:backdrop-blur-[2px] transition-all duration-300 rounded">
          <ZoomIn className="w-8 h-8 text-foreground/60 opacity-0 group-hover/image:opacity-100 transition-all duration-300 transform scale-75 group-hover/image:scale-100 drop-shadow-md" />
        </span>
      )}
    </span>
  );
}

export default ContentImage;
