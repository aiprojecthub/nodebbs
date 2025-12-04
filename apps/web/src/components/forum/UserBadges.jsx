import Image from 'next/image';
import { Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/**
 * 用户勋章组件
 * @param {Array} badges - 勋章列表 [{ itemName, itemMetadata }, ...]
 * @param {string} size - 尺寸大小，可选值：'sm', 'md', 'lg'
 * @param {number} maxDisplay - 最多显示几个勋章（超出部分显示"+N"）
 * @param {string} className - 额外的 CSS 类名
 */
export default function UserBadges({
  badges = [],
  size = 'md',
  maxDisplay = 3,
  className = '',
}) {
  if (!badges || badges.length === 0) {
    return null;
  }

  // 尺寸映射
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const sizeClass = sizeClasses[size] || sizeClasses.md;

  // 解析勋章元数据
  const parseBadgeMetadata = (metadata) => {
    if (!metadata) return null;

    try {
      return typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
    } catch (error) {
      console.error('解析勋章元数据失败:', error);
      return null;
    }
  };

  // 渲染单个勋章
  const renderBadge = (badge, index) => {
    const metadata = parseBadgeMetadata(badge.itemMetadata);

    // 如果有图标URL，使用图片
    if (metadata?.iconUrl) {
      return (
        <div
          key={index}
          className={`relative ${sizeClass} inline-flex items-center justify-center`}
          title={badge.itemName}
        >
          <Image
            src={metadata.iconUrl}
            alt={badge.itemName}
            fill
            className="object-contain"
          />
        </div>
      );
    }

    // 如果有颜色配置，使用彩色徽章
    if (metadata?.color) {
      return (
        <Badge
          key={index}
          variant="outline"
          className={`${size === 'sm' ? 'text-xs px-1.5 py-0' : size === 'lg' ? 'text-base px-3 py-1' : 'text-sm px-2 py-0.5'}`}
          style={{
            backgroundColor: metadata.backgroundColor || 'transparent',
            borderColor: metadata.color,
            color: metadata.color,
          }}
          title={badge.itemName}
        >
          {metadata.icon && <span className="mr-1">{metadata.icon}</span>}
          {badge.itemName}
        </Badge>
      );
    }

    // 默认样式
    return (
      <div
        key={index}
        className={`${sizeClass} inline-flex items-center justify-center text-yellow-600`}
        title={badge.itemName}
      >
        <Award className="h-full w-full" />
      </div>
    );
  };

  // 显示的勋章
  const displayBadges = badges.slice(0, maxDisplay);
  const remainingCount = badges.length - maxDisplay;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {displayBadges.map(renderBadge)}
      {remainingCount > 0 && (
        <Badge variant="secondary" className="text-xs">
          +{remainingCount}
        </Badge>
      )}
    </div>
  );
}
