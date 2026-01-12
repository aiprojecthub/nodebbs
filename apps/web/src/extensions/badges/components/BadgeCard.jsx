import React from 'react';
import { Lock, Zap, Award, Eye, EyeOff } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";


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
      <div className="space-y-1 mt-2">
        <div className="flex items-center gap-1 text-xs font-semibold text-amber-500">
           <Zap className="w-3 h-3" /> 佩戴效果
        </div>
        <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside pl-1">
          {effects.checkInBonus > 0 && <li>签到奖励 +{effects.checkInBonus} 积分</li>}
          {effects.checkInBonusPercent > 0 && <li>签到奖励 +{effects.checkInBonusPercent}%</li>}
          {effects.replyCostReductionPercent > 0 && <li>回复消耗 -{effects.replyCostReductionPercent}%</li>}
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
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <div 
            className={`
              group relative flex flex-col items-center p-3 rounded-xl border border-border/50 transition-all duration-300 cursor-default h-full
              ${isUnlocked 
                ? 'bg-card border-primary/20 hover:border-primary/30' 
                : 'bg-muted/40 border-transparent hover:bg-muted/60'
              }
            `}
          >
            {/* 顶部状态栏：始终渲染占位以保持网格对齐 */}
            <div className="w-full flex justify-between items-start min-h-[24px] mb-2">
              {/* 左侧：效果标记 */}
              {hasEffects ? (
                 <div className="p-1">
                   <Zap className="w-3.5 h-3.5 text-amber-500 opacity-80" />
                 </div>
              ) : <div />}

              {/* 右侧：展示切换按钮 */}
              {isUnlocked && onToggleDisplay && (
                <button 
                  type="button"
                  className={`
                    p-1 rounded-full transition-all duration-200
                    ${isDisplayed 
                      ? 'text-primary/80 hover:text-primary hover:bg-primary/10' 
                      : 'text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted'
                    }
                    ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                  onClick={handleToggle}
                  disabled={isUpdating}
                  title={isDisplayed ? '点击隐藏' : '点击展示'}
                >
                  {isDisplayed ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              )}
            </div>

            {/* 图标区域 */}
            <div className="w-full aspect-square mb-3">
               <img 
                 src={badge.iconUrl} 
                 alt={badge.name} 
                 className={`w-full h-full object-contain drop-shadow-sm ${!isUnlocked && 'grayscale opacity-40'}`}
               />
               {!isUnlocked && (
                 <div className="absolute inset-0 flex items-center justify-center">
                   <Lock className="w-5 h-5 text-muted-foreground/50 drop-shadow-sm" />
                 </div>
               )}
            </div>
            
            {/* 文本区域 */}
            <h3 className={`font-bold text-sm text-center mb-1 line-clamp-1 ${isUnlocked ? 'text-foreground' : 'text-muted-foreground'}`}>
              {badge.name}
            </h3>
            
            <div className="text-xs text-center min-h-[1.5em] flex items-center justify-center w-full px-1">
              {isUnlocked ? (
                <span className="text-primary font-medium px-2 py-0.5 bg-primary/10 rounded-full">
                  已获得
                </span>
              ) : (
                <span className="text-muted-foreground/60 line-clamp-2" title={conditionText}>
                  {badge.description || conditionText}
                </span>
              )}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[200px] p-4 bg-muted/95 backdrop-blur-sm text-popover-foreground [&_.z-50]:!bg-muted/95 [&_.z-50]:!fill-muted/95">
           <div className="space-y-3">
             <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs font-semibold text-primary">
                  <Award className="w-3 h-3" /> 获取条件
                </div>
                <p className="text-xs text-muted-foreground">
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
