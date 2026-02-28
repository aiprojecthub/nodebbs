'use client';

import React from 'react';
import Image from 'next/image';
import { Award, Zap } from 'lucide-react';
import { Badge as ShadcnBadge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import Time from '@/components/common/Time';
import { useDefaultCurrencyName } from '@/extensions/ledger/contexts/LedgerContext';

/**
 * 通用勋章组件
 * @param {Object} props
 * @param {Object} props.badge - 勋章数据 (可能是 userBadge.badge 或直接是 badge 对象)
 * @param {Object} props.userBadge - 用户勋章关联数据 (包含 earnedAt 等), 可选
 * @param {string} props.size - 尺寸: 'sm' (16px), 'md' (20px), 'lg' (24px), 'xl' (32px), '2xl' (40px)
 * @param {boolean} props.showTooltip - 是否显示详情提示框
 * @param {string} props.className - 额外样式
 */
export default function Badge({
  badge,
  userBadge, // 如果传入 userBadge，优先使用其中的 badge 属性，并读取 earnedAt
  size = 'md',
  showTooltip = true,
  className = ''
}) {
  const currencyName = useDefaultCurrencyName();

  // 处理传入的数据结构差异
  // 情况 1: 传入的是 userBadge 对象 (包含 badge 属性)
  // 情况 2: 传入的是 badge 对象本身
  const badgeData = userBadge?.badge || badge || userBadge;
  const earnedAt = userBadge?.earnedAt;

  if (!badgeData) return null;

  // 解析元数据
  const getMetadata = () => {
    try {
      // 兼容 itemMetadata (UserBadges format) 和 metadata (Badge format)
      const meta = badgeData.itemMetadata || badgeData.metadata;
      return typeof meta === 'string' ? JSON.parse(meta) : (meta || {});
    } catch (e) {
      return {};
    }
  };

  const metadata = getMetadata();
  const effects = metadata.effects || {};
  const hasEffects = Object.keys(effects).length > 0;

  // 尺寸映射
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
    '2xl': 'w-10 h-10',
  };
  const sizeClass = sizeMap[size] || sizeMap.md;

  // 渲染勋章主体（无 Tooltip）
  const renderBadgeContent = () => {
    // 1. 图片图标
    if (badgeData.iconUrl || metadata.iconUrl) {
      return (
        <div className={`relative ${sizeClass} inline-flex items-center justify-center ${className}`}>
          <img 
            src={badgeData.iconUrl || metadata.iconUrl} 
            alt={badgeData.name || badgeData.itemName} 
            className="w-full h-full object-contain"
          />
        </div>
      );
    }

    // 2. 纯色/文字徽章 (Legacy or CSS based)
    if (metadata.color) {
      return (
        <ShadcnBadge
          variant="outline"
          className={`
            ${size === 'sm' ? 'text-[10px] px-1 py-0' : 'text-xs px-2 py-0.5'} 
            ${className}
          `}
          style={{
            backgroundColor: metadata.backgroundColor || 'transparent',
            borderColor: metadata.color,
            color: metadata.color,
          }}
        >
          {metadata.icon && <span className="mr-1">{metadata.icon}</span>}
          {badgeData.name || badgeData.itemName}
        </ShadcnBadge>
      );
    }

    // 3. 默认图标
    return (
      <div className={`${sizeClass} inline-flex items-center justify-center text-yellow-600 ${className}`}>
        <Award className="w-full h-full" />
      </div>
    );
  };

  const content = renderBadgeContent();

  if (!showTooltip) return content;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <div className="cursor-default inline-block">
            {content}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="p-0 bg-muted/95 backdrop-blur-sm shadow-xl border-border/50 [&_.z-50]:!bg-muted/95 [&_.z-50]:!fill-muted/95">
          <div className="flex flex-col rounded-md overflow-hidden">
            {/* 大图展示区 */}
            <div className="w-full aspect-square flex items-center justify-center p-6 relative">
              {badgeData.iconUrl || metadata.iconUrl ? (
                <img 
                  src={badgeData.iconUrl || metadata.iconUrl} 
                  alt={badgeData.name || badgeData.itemName}
                  className="w-50 h-50 object-contain drop-shadow-lg transition-transform hover:scale-110 duration-500 ease-in-out"
                />
              ) : (
                <Award className="w-32 h-32 text-primary/20" />
              )}
            </div>

            {/* 信息区 */}
            <div className="p-5 pt-2 space-y-4">
              <div className="text-center space-y-1.5">
                <h3 className="font-bold text-lg text-foreground">
                  {badgeData.name || badgeData.itemName}
                </h3>
                {(badgeData.description || metadata.description) && (
                  <p className="text-xs text-muted-foreground leading-relaxed px-2">
                    {badgeData.description || metadata.description}
                  </p>
                )}
              </div>

              {/* 佩戴效果 */}
              {hasEffects && (
                <div className="bg-muted/30 rounded-lg p-3 space-y-2 border border-border/50">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-500">
                    <Zap className="w-3.5 h-3.5 fill-current" /> 
                    <span>佩戴效果</span>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-1.5 pl-1">
                    {effects.checkInBonus > 0 &&
                      <li className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-amber-500/50" />
                        签到奖励 +{effects.checkInBonus} {currencyName}
                      </li>
                    }
                    {effects.checkInBonusPercent > 0 && 
                      <li className="flex items-center gap-1.5">
                         <span className="w-1 h-1 rounded-full bg-amber-500/50" />
                         签到奖励 +{effects.checkInBonusPercent}%
                      </li>
                    }
                    {effects.replyCostReductionPercent > 0 && 
                      <li className="flex items-center gap-1.5">
                         <span className="w-1 h-1 rounded-full bg-amber-500/50" />
                         回复消耗 -{effects.replyCostReductionPercent}%
                      </li>
                    }
                  </ul>
                </div>
              )}

              {/* 获得时间 */}
              {earnedAt && (
                <div className="pt-3 border-t border-border/50 text-center">
                  <p className="text-[10px] text-muted-foreground/50 font-mono">
                   获得于 <Time date={earnedAt} format="YYYY.MM.DD" />
                  </p>
                </div>
              )}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
