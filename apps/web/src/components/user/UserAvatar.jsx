import { useMemo } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { User } from 'lucide-react';
import { cn, getImageUrl } from '@/lib/utils';

// 预定义动画类名映射
const ANIMATION_CLASSES = {
  pulse: 'animate-pulse',
  spin: 'animate-spin',
  glow: 'animate-[glow_2s_ease-in-out_infinite]',
};

// 尺寸映射（提升到模块级别，避免每次渲染重新创建）
const SIZE_CLASSES = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-12 w-12 text-lg',
  xl: 'h-16 w-16 text-xl',
};

/**
 * 用户头像组件（支持头像框）
 * @param {string} url - 头像 URL（可以是完整 URL 或相对路径）
 * @param {string} name - 用户名（用于生成 fallback 和 alt）
 * @param {string} size - 尺寸大小，可选值：'xs', 'sm', 'md', 'lg', 'xl'
 * @param {string} className - 额外的 CSS 类名
 * @param {object} frameMetadata - 头像框元数据（来自装备的头像框商品）
 * @param {string} modifiers - 图片处理参数
 */
export default function UserAvatar({
  url,
  name,
  size = 'md',
  className = '',
  frameMetadata = null,
  modifiers = 'embed,f_webp,s_200x200',
}) {
  // 处理头像 URL（使用 getImageUrl 工具函数）
  const avatarUrl = useMemo(() => {
    return getImageUrl(url, modifiers);
  }, [url, modifiers]);

  // 缓存解析后的头像框元数据
  const frame = useMemo(() => {
    if (!frameMetadata) return null;
    try {
      return typeof frameMetadata === 'string'
        ? JSON.parse(frameMetadata)
        : frameMetadata;
    } catch (error) {
      console.error('解析头像框元数据失败:', error);
      return null;
    }
  }, [frameMetadata]);

  // 判断头像框类型
  const isImageFrame = frame?.type === 'image' || !!frame?.imageUrl;

  // 生成头像框样式（仅在有 frame 时计算）
  const frameStyle = useMemo(() => {
    if (!frame || isImageFrame) return {};

    const style = {};

    // 处理边框
    if (frame.border) {
      style.border = frame.border;
    } else {
      if (frame.borderWidth) {
        style.borderWidth = typeof frame.borderWidth === 'number'
          ? `${frame.borderWidth}px`
          : frame.borderWidth;
      }
      if (frame.borderStyle) {
        // borderStyle 包含空格时作为 border 简写处理
        if (frame.borderStyle.includes(' ')) {
          style.border = frame.borderStyle;
        } else {
          style.borderStyle = frame.borderStyle;
        }
      }
      if (frame.borderColor) {
        if (frame.borderColor.includes('gradient')) {
          style.borderImage = frame.borderColor;
          style.borderImageSlice = 1;
        } else {
          style.borderColor = frame.borderColor;
        }
      }
    }

    // 处理阴影
    if (frame.shadow) {
      style.boxShadow = frame.shadow;
    }

    // 处理自定义动画（非预定义类名）
    if (frame.animation && !ANIMATION_CLASSES[frame.animation]) {
      style.animation = frame.animation;
    }

    return style;
  }, [frame, isImageFrame]);

  // 生成头像框类名
  const frameClassName = useMemo(() => {
    if (!frame) return '';
    const classes = [];
    
    // 预定义动画效果
    if (ANIMATION_CLASSES[frame.animation]) {
      classes.push(ANIMATION_CLASSES[frame.animation]);
    }
    
    // 圆角（默认圆形）
    if (frame.rounded !== false) {
      classes.push('rounded-full');
    }
    
    return classes.join(' ');
  }, [frame]);

  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;
  const hasCssFrame = frame && !isImageFrame && Object.keys(frameStyle).length > 0;

  // 生成 fallback 内容
  const fallbackContent = name
    ? name.charAt(0).toUpperCase()
    : <User className="h-1/2 w-1/2" />;

  const altText = name || '用户头像';

  // 抽取的头像渲染函数，消除重复代码
  const renderAvatar = (avatarClassName = '') => (
    <Avatar className={cn('w-full h-full', avatarClassName)}>
      {avatarUrl && (
        <AvatarImage
          src={avatarUrl}
          alt={altText}
          className="object-cover"
        />
      )}
      <AvatarFallback className="bg-muted text-muted-foreground">
        {fallbackContent}
      </AvatarFallback>
    </Avatar>
  );

  // 图片头像框
  if (isImageFrame) {
    const scale = frame.scale || 1.35;
    const xOffset = frame.xOffset || '0px';
    const yOffset = frame.yOffset || '0px';
    const rotation = frame.rotation || 0;
    const opacity = frame.opacity ?? 1;
    
    return (
      <div className={cn('relative inline-flex items-center justify-center', sizeClass, className)}>
        {renderAvatar()}
        <img 
          src={frame.imageUrl} 
          alt="头像框"
          className="absolute pointer-events-none select-none z-10 max-w-none"
          style={{
            width: `${scale * 100}%`,
            height: `${scale * 100}%`,
            top: '50%',
            left: '50%',
            transform: `translate(calc(-50% + ${xOffset}), calc(-50% + ${yOffset})) rotate(${rotation}deg)`,
            mixBlendMode: frame.blendMode || 'normal',
            opacity,
          }}
        />
      </div>
    );
  }

  // CSS 样式头像框
  if (hasCssFrame) {
    return (
      <div
        className={cn('inline-block p-0.5', sizeClass, frameClassName, className)}
        style={frameStyle}
      >
        {renderAvatar('border-2 border-background')}
      </div>
    );
  }

  // 无头像框的默认渲染
  return renderAvatar(cn(sizeClass, className));
}
