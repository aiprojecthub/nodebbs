import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 用户头像组件（支持头像框）
 * @param {string} url - 头像 URL（可以是完整 URL 或相对路径）
 * @param {string} name - 用户名（用于生成 fallback 和 alt）
 * @param {string} size - 尺寸大小，可选值：'xs', 'sm', 'md', 'lg', 'xl'
 * @param {string} className - 额外的 CSS 类名
 * @param {object} frameMetadata - 头像框元数据（来自装备的头像框商品）
 */
export default function UserAvatar({
  url,
  name,
  size = 'md',
  className = '',
  frameMetadata = null,
}) {
  // 处理头像 URL
  const getAvatarUrl = () => {
    if (!url) return null;

    // 如果是完整 URL（http 或 https 开头），直接使用
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    // 否则拼接 API 基础 URL
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7100';
    const pathname = url.replace('/uploads/', '/uploads/embed,f_webp,s_200x200/');
    return `${baseUrl}${pathname}`;
  };

  // 生成 fallback 文字（取名字的首字母）
  const getFallbackText = () => {
    if (!name) return <User className="h-1/2 w-1/2" />;
    return name.charAt(0).toUpperCase();
  };

  // 尺寸映射
  const sizeClasses = {
    xs: 'h-6 w-6 text-xs',
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10 text-base',
    lg: 'h-12 w-12 text-lg',
    xl: 'h-16 w-16 text-xl',
  };

  // 解析头像框元数据
  const parseFrameMetadata = () => {
    if (!frameMetadata) return null;

    try {
      // 如果是字符串，解析为对象
      const metadata = typeof frameMetadata === 'string'
        ? JSON.parse(frameMetadata)
        : frameMetadata;

      return metadata;
    } catch (error) {
      console.error('解析头像框元数据失败:', error);
      return null;
    }
  };

  // 生成头像框样式
  const getFrameStyle = () => {
    const frame = parseFrameMetadata();
    if (!frame) return {};

    const style = {};

    // 1. 处理边框
    // 如果提供了完整的 border 简写属性 (e.g., "3px solid gold")
    if (frame.border) {
      style.border = frame.border;
    } else {
      // 分别处理各个属性
      if (frame.borderWidth) {
        style.borderWidth = typeof frame.borderWidth === 'number' ? `${frame.borderWidth}px` : frame.borderWidth;
      }
      
      if (frame.borderStyle) {
        // 如果 borderStyle 包含空格，假设它是简写属性误用，尝试作为 border 处理
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

    // 2. 处理阴影
    if (frame.shadow) {
      style.boxShadow = frame.shadow;
    }

    // 3. 处理自定义动画 (如果不是预定义类名)
    if (frame.animation && !['pulse', 'spin', 'glow'].includes(frame.animation)) {
      style.animation = frame.animation;
    }

    return style;
  };

  // 生成头像框类名
  const getFrameClassName = () => {
    const frame = parseFrameMetadata();
    if (!frame) return '';

    const classes = [];

    // 预定义动画效果
    if (frame.animation === 'pulse') {
      classes.push('animate-pulse');
    } else if (frame.animation === 'spin') {
      classes.push('animate-spin');
    } else if (frame.animation === 'glow') {
      classes.push('animate-[glow_2s_ease-in-out_infinite]');
    }

    // 圆角（默认圆形，除非显式设置为 false）
    if (frame.rounded !== false) {
      classes.push('rounded-full');
    }

    return classes.join(' ');
  };

  const avatarUrl = getAvatarUrl();
  const sizeClass = sizeClasses[size] || sizeClasses.md;
  const frameStyle = getFrameStyle();
  const frameClassName = getFrameClassName();
  const hasFrame = frameMetadata && Object.keys(frameStyle).length > 0;

  // 如果有头像框，包装在一个容器中
  if (hasFrame) {
    return (
      <div
        className={cn('inline-block p-0.5', sizeClass, frameClassName, className)}
        style={frameStyle}
      >
        <Avatar className="w-full h-full border-2 border-background">
          {avatarUrl && (
            <AvatarImage
              src={avatarUrl}
              alt={name || '用户头像'}
              className="object-cover"
            />
          )}
          <AvatarFallback className="bg-muted text-muted-foreground">
            {getFallbackText()}
          </AvatarFallback>
        </Avatar>
      </div>
    );
  }

  // 无头像框的默认渲染
  return (
    <Avatar className={cn(sizeClass, className)}>
      {avatarUrl && (
        <AvatarImage
          src={avatarUrl}
          alt={name || '用户头像'}
          className="object-cover"
        />
      )}
      <AvatarFallback className="bg-muted text-muted-foreground">
        {getFallbackText()}
      </AvatarFallback>
    </Avatar>
  );
}
