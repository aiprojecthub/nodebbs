'use client';

import { useState, useRef, useEffect } from 'react';

/**
 * 独立的图片查看器组件，处理缩放和拖拽逻辑
 */
function ImageViewer({ src, alt, onClose, overlayBaseOpacity = 0.5, onOverlayOpacityChange }) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isClosingGesture, setIsClosingGesture] = useState(false);
  const [closeOffsetY, setCloseOffsetY] = useState(0);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const imgRef = useRef(null);
  const containerRef = useRef(null);
  const hasMoved = useRef(false);
  const scaleRef = useRef(scale);
  const pointersRef = useRef(new Map());
  const pinchStartRef = useRef({ distance: 0, scale: 1 });
  const closeDragRef = useRef({
    active: false,
    candidate: false,
    startX: 0,
    startY: 0,
    offsetY: 0,
    rawDeltaY: 0,
  });
  const [isPinching, setIsPinching] = useState(false);
  const clickStartOnImageRef = useRef(false);

  // 同步 scaleRef 以便在 event listener 中获取最新值
  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  // 添加非被动 wheel 事件监听器以解决页面滚动问题
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();

      const delta = e.deltaY * -0.002;
      const currentScale = scaleRef.current;
      const newScale = Math.min(Math.max(0.1, currentScale + delta), 20); // 限制 0.1x 到 20x

      if (newScale < 1) {
        setPosition({ x: 0, y: 0 });
      }

      setScale(newScale);
    };

    // 使用 sensitive: false (默认) 但这里关键是 preventDefault 能生效
    // React 的 onWheel 有时是被动的，原生监听器指定 passive: false 更稳健
    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // 双击切换
  const handleDoubleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!imgRef.current) return;

    if (scale !== 1) {
      // 还原适应屏幕
      setScale(1);
      setPosition({ x: 0, y: 0 });
    } else {
      // 放大到原始分辨率
      const { naturalWidth, clientWidth } = imgRef.current;
      if (naturalWidth > clientWidth) {
        // 计算需要的缩放比例
        const targetScale = naturalWidth / clientWidth;
        setScale(targetScale);
      } else {
        // 如果原图比屏幕小，或者已经显示为原图大小，默认放大 2 倍
        setScale(2);
      }
    }
  };

  const getDistance = (p1, p2) => {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.hypot(dx, dy);
  };

  const CLOSE_SWIPE_THRESHOLD = 90; // 触发关闭的垂直滑动阈值（原始位移 px）
  const CLOSE_SWIPE_DAMPING = 300; // 阻尼强度（值越大阻尼越弱）
  const CLOSE_SWIPE_INTENT = 8; // 判定为纵向手势的最小位移（px）

  const applyDamping = (value) => {
    const abs = Math.abs(value);
    const damped = abs / (1 + abs / CLOSE_SWIPE_DAMPING);
    return Math.sign(value) * damped;
  };

  const startCloseDrag = (e) => {
    closeDragRef.current = {
      active: false,
      candidate: true,
      startX: e.clientX,
      startY: e.clientY,
      offsetY: 0,
      rawDeltaY: 0,
    };
  };

  const updateCloseDrag = (e) => {
    const deltaY = e.clientY - closeDragRef.current.startY;
    closeDragRef.current.rawDeltaY = deltaY;
    const damped = applyDamping(deltaY);
    closeDragRef.current.offsetY = damped;
    setCloseOffsetY(damped);
    const progress = Math.min(Math.abs(deltaY) / CLOSE_SWIPE_THRESHOLD, 1);
    const nextOpacity = overlayBaseOpacity * (1 - progress);
    onOverlayOpacityChange?.(nextOpacity);
    if (Math.abs(deltaY) > 2) {
      hasMoved.current = true;
    }
  };

  const resetCloseDrag = () => {
    closeDragRef.current.active = false;
    closeDragRef.current.candidate = false;
    closeDragRef.current.offsetY = 0;
    closeDragRef.current.rawDeltaY = 0;
    setIsClosingGesture(false);
    setCloseOffsetY(0);
    onOverlayOpacityChange?.(overlayBaseOpacity);
  };

  const endCloseDrag = () => {
    const rawDeltaY = closeDragRef.current.rawDeltaY;
    resetCloseDrag();

    if (Math.abs(rawDeltaY) > CLOSE_SWIPE_THRESHOLD) {
      onClose?.();
      return;
    }
  };

  const handlePointerDown = (e) => {
    hasMoved.current = false;
    clickStartOnImageRef.current = isClickOnImage(e);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (e.pointerType === 'touch' || scaleRef.current > 1) {
      e.currentTarget.setPointerCapture(e.pointerId);
    }

    if (pointersRef.current.size === 2) {
      if (closeDragRef.current.active || closeDragRef.current.candidate) {
        resetCloseDrag();
      }
      setIsPinching(true);
      const points = Array.from(pointersRef.current.values());
      pinchStartRef.current = {
        distance: getDistance(points[0], points[1]),
        scale: scaleRef.current,
      };
    } else if (
      pointersRef.current.size === 1 &&
      scaleRef.current <= 1.001 &&
      e.pointerType === 'touch' &&
      clickStartOnImageRef.current
    ) {
      startCloseDrag(e);
    } else if (pointersRef.current.size === 1 && scaleRef.current > 1) {
      setIsDragging(true);
      setStartPos({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handlePointerMove = (e) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    if (
      e.pointerType === 'touch' ||
      isDragging ||
      pointersRef.current.size === 2 ||
      closeDragRef.current.active ||
      closeDragRef.current.candidate
    ) {
      e.preventDefault();
    }

    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 2) {
      if (closeDragRef.current.active || closeDragRef.current.candidate) {
        resetCloseDrag();
      }
      const points = Array.from(pointersRef.current.values());
      const distance = getDistance(points[0], points[1]);
      const { distance: startDistance, scale: startScale } = pinchStartRef.current;
      if (startDistance > 0) {
        const nextScale = Math.min(Math.max(0.1, startScale * (distance / startDistance)), 20);
        if (nextScale < 1) {
          setPosition({ x: 0, y: 0 });
        }
        setScale(nextScale);
        hasMoved.current = true;
      }
      return;
    }

    if (scaleRef.current <= 1.001) {
      if (closeDragRef.current.candidate) {
        const deltaX = e.clientX - closeDragRef.current.startX;
        const deltaY = e.clientY - closeDragRef.current.startY;
        if (
          Math.abs(deltaX) < CLOSE_SWIPE_INTENT &&
          Math.abs(deltaY) < CLOSE_SWIPE_INTENT
        ) {
          return;
        }
        if (Math.abs(deltaY) > Math.abs(deltaX) * 1.2) {
          closeDragRef.current.active = true;
          closeDragRef.current.candidate = false;
          setIsClosingGesture(true);
          updateCloseDrag(e);
          return;
        }
        closeDragRef.current.candidate = false;
      }
      if (closeDragRef.current.active) {
        updateCloseDrag(e);
        return;
      }
    }

    if (isDragging && scaleRef.current > 1) {
      hasMoved.current = true;
      setPosition({
        x: e.clientX - startPos.x,
        y: e.clientY - startPos.y,
      });
    }
  };

  const handlePointerUp = (e) => {
    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.delete(e.pointerId);
    }
    if (pointersRef.current.size < 2) {
      setIsPinching(false);
    }
    if (closeDragRef.current.active || closeDragRef.current.candidate) {
      endCloseDrag();
    }
    setIsDragging(false);
  };

  const isClickOnImage = (event) => {
    if (!imgRef.current) return false;
    const rect = imgRef.current.getBoundingClientRect();
    return (
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom
    );
  };

  const handleContainerClick = (e) => {
    e.stopPropagation();
    if (hasMoved.current) return;
    if (clickStartOnImageRef.current) return;
    if (!isClickOnImage(e)) {
      onClose?.();
    }
    clickStartOnImageRef.current = false;
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center cursor-move touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      onClick={handleContainerClick}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={src}
        alt={alt || ''}
        style={{
          transform: `translateY(${closeOffsetY}px) scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
          transition: (isDragging || isPinching || isClosingGesture) ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0, 0.2, 1)',
          cursor: scale > 1 ? 'grab' : 'zoom-in',
          willChange: isDragging || isPinching || isClosingGesture ? 'transform' : undefined,
        }}
        // 使用 max-w/h-full 确保默认状态下适应屏幕
        className="max-w-full max-h-full object-contain select-none"
        draggable={false}
      />
    </div>
  );
}

export default ImageViewer;
