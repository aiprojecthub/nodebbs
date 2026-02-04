'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ChevronLeft, ChevronRight, ExternalLink, X } from 'lucide-react';

import { Dialog, DialogOverlay, DialogPortal } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import ImageViewer from './ImageViewer';

const DEFAULT_OVERLAY_OPACITY = 0.5;

function ImagePreview({
  open,
  onOpenChange,
  images,
  initialIndex = 0,
  overlayBaseOpacity = DEFAULT_OVERLAY_OPACITY,
  onIndexChange,
}) {
  const normalizedImages = useMemo(() => {
    if (!images || images.length === 0) return [];
    return images
      .map((item) => {
        if (!item) return null;
        if (typeof item === 'string') {
          return { src: item, alt: '' };
        }
        return { src: item.src, alt: item.alt || '' };
      })
      .filter((item) => item && item.src);
  }, [images]);

  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [overlayOpacity, setOverlayOpacity] = useState(overlayBaseOpacity);

  const total = normalizedImages.length;
  const currentImage = normalizedImages[activeIndex] || normalizedImages[0];
  const canPrev = total > 1 && activeIndex > 0;
  const canNext = total > 1 && activeIndex < total - 1;

  const setIndex = useCallback((nextIndex) => {
    setActiveIndex(nextIndex);
    onIndexChange?.(nextIndex);
  }, [onIndexChange]);

  const handlePrev = useCallback(() => {
    if (!canPrev) return;
    setIndex(Math.max(activeIndex - 1, 0));
  }, [activeIndex, canPrev, setIndex]);

  const handleNext = useCallback(() => {
    if (!canNext) return;
    setIndex(Math.min(activeIndex + 1, total - 1));
  }, [activeIndex, canNext, setIndex, total]);

  const handleOverlayOpacityChange = useCallback((value) => {
    setOverlayOpacity(value);
  }, []);

  useEffect(() => {
    if (!open) return;
    const nextIndex = Math.min(Math.max(initialIndex, 0), Math.max(total - 1, 0));
    setActiveIndex(nextIndex);
  }, [open, initialIndex, total]);

  useEffect(() => {
    if (!open) {
      setOverlayOpacity(overlayBaseOpacity);
      return;
    }
    setOverlayOpacity(overlayBaseOpacity);
  }, [open, activeIndex, overlayBaseOpacity]);

  useEffect(() => {
    if (!open || total <= 1) return;
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        handlePrev();
      }
      if (e.key === 'ArrowRight') {
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, total, handlePrev, handleNext]);

  if (!currentImage) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay style={{ backgroundColor: `rgba(0, 0, 0, ${overlayOpacity})` }} />
        <DialogPrimitive.Content
          data-slot="dialog-content"
          className="fixed top-1/2 left-1/2 z-50 h-[95vh] w-[95vw] max-h-[95vh]! max-w-[95vw]! -translate-x-1/2 -translate-y-1/2 bg-transparent p-0 shadow-none border-0 outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-200"
        >
          <div className="relative w-full h-full flex items-center justify-center">
            {/* 关闭按钮 */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => onOpenChange?.(false)}
              className="absolute top-4 right-4 z-50 rounded-full bg-background/80 backdrop-blur-md"
              aria-label="关闭"
            >
              <X className="w-5 h-5" />
            </Button>

            {/* 新窗口打开按钮 */}
            <Button
              variant="outline"
              size="icon"
              asChild
              className="absolute top-4 right-16 z-50 rounded-full bg-background/80 backdrop-blur-md"
            >
              <a
                href={currentImage.src}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="在新窗口打开"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="w-5 h-5" />
              </a>
            </Button>

            {/* 上一张/下一张 */}
            {total > 1 && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePrev}
                  disabled={!canPrev}
                  className="absolute left-4 top-1/2 z-50 -translate-y-1/2 rounded-full bg-background/80 backdrop-blur-md disabled:bg-background/30 disabled:backdrop-blur-none disabled:border-border/50"
                  aria-label="上一张"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNext}
                  disabled={!canNext}
                  className="absolute right-4 top-1/2 z-50 -translate-y-1/2 rounded-full bg-background/80 backdrop-blur-md disabled:bg-background/30 disabled:backdrop-blur-none disabled:border-border/50"
                  aria-label="下一张"
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </>
            )}

            {/* 图片容器 - 处理交互 */}
            <ImageViewer
              key={currentImage.src}
              src={currentImage.src}
              alt={currentImage.alt}
              onClose={() => onOpenChange?.(false)}
              overlayBaseOpacity={overlayBaseOpacity}
              onOverlayOpacityChange={handleOverlayOpacityChange}
            />
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

export default ImagePreview;
