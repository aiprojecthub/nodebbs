'use client';

import React from 'react';
import { Lock, Zap, Award, Eye, EyeOff } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDefaultCurrencyName } from '@/extensions/ledger/contexts/LedgerContext';


/**
 * 勋章卡片组件
 * @param {Object} badge - 勋章数据
 * @param {boolean} isUnlocked - 是否已解锁
 * @param {boolean} isDisplayed - 是否设置为展示（已解锁时有效）
 * @param {number} userBadgeId - 用户勋章记录ID（用于更新展示设置）
 * @param {function} onToggleDisplay - 切换展示状态的回调
 * @param {boolean} isUpdating - 是否正在更新中
 */
export default function BadgeCard({
  badge,
  isUnlocked = false,
  isDisplayed = true,
  userBadgeId,
  onToggleDisplay,
  isUpdating = false,
}) {
  const currencyName = useDefaultCurrencyName();

  // 解析解锁条件
  const condition = badge.unlockCondition ? JSON.parse(badge.unlockCondition) : {};
  // 解析元数据获取效果
  const metadata = typeof badge.metadata === 'string' 
    ? (JSON.parse(badge.metadata || '{}')) 
    : (badge.metadata || {});
  const effects = metadata.effects || {};

  // 格式化条件文本
  const getConditionText = () => {
     if (badge.category === 'manual') return '通过管理员发放或商城购买获得';
     if (condition.type === 'checkin_streak') return `连续签到满 ${condition.threshold} 天`;
     if (condition.type === 'post_count') return `累计发布 ${condition.threshold} 条回复`;
     if (condition.type === 'topic_count') return `累计发布 ${condition.threshold} 个话题`;
     if (condition.type === 'like_received_count') return `累计获得 ${condition.threshold} 次点赞`;
     if (condition.type === 'registration_days') return `注册满 ${condition.threshold} 天`;
     return badge.description || '探索社区以解锁此勋章';
  };

  const conditionText = getConditionText();

  // 判断是否有被动效果
  const hasEffects = Object.keys(effects).length > 0;
  
  // 渲染效果列表
  const renderEffects = () => {
    if (!hasEffects) return null;
    return (
      <div className="space-y-1 mt-2 pt-2 border-t border-border/50">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-500">
           <Zap className="w-3 h-3 fill-current" /> 佩戴增益
        </div>
        <ul className="text-xs text-muted-foreground space-y-1 list-none">
          {effects.checkInBonus > 0 && <li className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-amber-500"/>签到奖励 +{effects.checkInBonus} {currencyName}</li>}
          {effects.checkInBonusPercent > 0 && <li className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-amber-500"/>签到奖励 +{effects.checkInBonusPercent}%</li>}
          {effects.replyCostReductionPercent > 0 && <li className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-amber-500"/>回复消耗 -{effects.replyCostReductionPercent}%</li>}
        </ul>
      </div>
    );
  };

  // 处理展示开关切换
  const handleToggle = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (onToggleDisplay && userBadgeId && !isUpdating) {
      onToggleDisplay(userBadgeId, !isDisplayed);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <div 
            className={`
              group relative flex flex-col items-center p-4 rounded-2xl border transition duration-500 cursor-default h-full isolate overflow-hidden
              ${isUnlocked 
                ? 'bg-gradient-to-b from-card to-muted/20 border-primary/10 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1' 
                : 'bg-muted/20 border-transparent hover:bg-muted/30 hover:border-border/30'
              }
            `}
          >
            {/* Glossy Effect (Unlocked only) */}
            {isUnlocked && (
              <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            )}

            {/* Top Bar */}
            <div className="w-full flex justify-between items-start min-h-[24px] mb-3 relative z-10">
              {/* Effect Indicator */}
              {hasEffects ? (
                 <div className="p-1 rounded-full bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20">
                   <Zap className="w-3.5 h-3.5 fill-current" />
                 </div>
              ) : <div />}

              {/* Display Toggle Button */}
              {isUnlocked && onToggleDisplay && (
                <button 
                  type="button"
                  className={`
                    p-1.5 rounded-full transition-colors duration-300 backdrop-blur-sm
                    ${isDisplayed 
                      ? 'bg-primary/10 text-primary ring-1 ring-primary/20 hover:bg-primary/20' 
                      : 'bg-muted/50 text-muted-foreground ring-1 ring-border/50 hover:bg-muted hover:text-foreground'
                    }
                    ${isUpdating ? 'opacity-50 cursor-not-allowed animate-pulse' : 'cursor-pointer'}
                  `}
                  onClick={handleToggle}
                  disabled={isUpdating}
                  title={isDisplayed ? '点击隐藏' : '点击展示'}
                >
                  {isDisplayed ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>

            {/* Icon Area */}
            <div className="relative w-full aspect-square mb-4 group-hover:scale-105 transition-transform duration-500">
               {isUnlocked && (
                 <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full opacity-0 group-hover:opacity-40 transition-opacity duration-700" />
               )}
               <img 
                 src={badge.iconUrl} 
                 alt={badge.name} 
                 className={`
                    w-full h-full object-contain relative z-10 filter drop-shadow-md transition duration-500
                    ${!isUnlocked && 'grayscale opacity-30 contrast-75'}
                 `}
               />
               {!isUnlocked && (
                 <div className="absolute inset-0 flex items-center justify-center z-20">
                   <div className="bg-background/80 backdrop-blur-sm p-2 rounded-full shadow-sm border border-border/50">
                     <Lock className="w-4 h-4 text-muted-foreground" />
                   </div>
                 </div>
               )}
            </div>
            
            {/* Text Area */}
            <div className="relative z-10 w-full text-center space-y-1">
                <h3 className={`font-bold text-sm truncate px-2 ${isUnlocked ? 'text-foreground' : 'text-muted-foreground'}`}>
                {badge.name}
                </h3>
                
                <div className="text-xs min-h-[1.5em] flex items-center justify-center w-full">
                {isUnlocked ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 bg-primary/5 text-primary rounded-full border border-primary/10">
                         <Award className="w-3 h-3" />
                         已获得
                    </span>
                ) : (
                    <span className="text-muted-foreground/50 line-clamp-1 text-[11px]" title={conditionText}>
                    {badge.description || conditionText}
                    </span>
                )}
                </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent 
          side="bottom" 
          arrowClassName="fill-background/95 bg-background/95" 
          className="max-w-[220px] p-4 bg-background/95 backdrop-blur-xl border-border/50 shadow-xl z-50"
        >
           <div className="space-y-3">
             <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary/80">
                  <Award className="w-3.5 h-3.5" /> 获取条件
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                   {badge.description || conditionText}
                </p>
             </div>
             {renderEffects()}
           </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
