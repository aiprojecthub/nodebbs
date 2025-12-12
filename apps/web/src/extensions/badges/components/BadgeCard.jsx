import React from 'react';
import { Lock } from 'lucide-react';


export default function BadgeCard({ badge, isUnlocked = false }) {
  // Parse unlock condition for display
  const condition = badge.unlockCondition ? JSON.parse(badge.unlockCondition) : {};
  
  // Format condition text
  const getConditionText = () => {
     if (badge.category === 'manual') return '通过管理员发放或商城购买获得';
     if (condition.type === 'checkin_streak') return `连续签到满 ${condition.threshold} 天即可解锁`;
     if (condition.type === 'post_count') return `累计发布 ${condition.threshold} 篇帖子即可解锁`;
     if (condition.type === 'topic_count') return `累计发布 ${condition.threshold} 个话题即可解锁`;
     if (condition.type === 'like_received_count') return `累计获得 ${condition.threshold} 次点赞即可解锁`;
     if (condition.type === 'registration_days') return `注册满 ${condition.threshold} 天即可解锁`;
     return badge.description || '探索社区以解锁此勋章';
  };

  const conditionText = getConditionText();

  return (
    <div 
      className={`
        group relative flex flex-col items-center p-4 rounded-xl border transition-all duration-300 cursor-default
        ${isUnlocked 
          ? 'bg-card border-primary/20 shadow-sm hover:shadow-md hover:border-primary/50 hover:-translate-y-1' 
          : 'bg-muted/40 border-transparent hover:bg-muted/60' // Locked state
        }
      `}
    >
      {/* Icon Area */}
      <div className="w-16 h-16 mb-3 relative transition-transform duration-300 group-hover:scale-110">
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
      
      {/* Text Area */}
      <h3 className={`font-bold text-sm text-center mb-1 line-clamp-1 ${isUnlocked ? 'text-foreground' : 'text-muted-foreground'}`}>
        {badge.name}
      </h3>
      
      <div className="text-[10px] text-center min-h-[1.5em] flex items-center justify-center w-full px-1">
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
  );
}
