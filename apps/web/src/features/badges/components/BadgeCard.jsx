import React from 'react';
import { Lock } from 'lucide-react';

export default function BadgeCard({ badge, isUnlocked = false }) {
  // Parse unlock condition for display
  const condition = badge.unlockCondition ? JSON.parse(badge.unlockCondition) : {};
  
  // Format condition text
  const getConditionText = () => {
    if (badge.category === 'manual') return '管理员发放';
    if (condition.type === 'checkin_streak') return `连续签到 ${condition.threshold} 天`;
    if (condition.type === 'post_count') return `由于活跃发帖获得`;
    return badge.description || '未知条件';
  };

  return (
    <div className={`relative flex flex-col items-center p-4 border rounded-xl transition-all ${
      isUnlocked 
        ? 'bg-gradient-to-br from-yellow-50/50 to-amber-50/30 border-amber-200 shadow-sm' 
        : 'bg-gray-50 border-gray-100 opacity-60 grayscale'
    }`}>
      <div className="w-20 h-20 mb-3 relative">
        <img 
          src={badge.iconUrl} 
          alt={badge.name} 
          className="w-full h-full object-contain drop-shadow-sm"
        />
        {!isUnlocked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/5 rounded-full">
            <Lock className="w-6 h-6 text-gray-400" />
          </div>
        )}
      </div>
      
      <h3 className="font-bold text-gray-900 mb-1">{badge.name}</h3>
      
      <div className="text-xs text-center text-gray-500 min-h-[2.5em] flex items-center justify-center">
        {isUnlocked ? (
          <span className="text-amber-600 font-medium">已获得</span>
        ) : (
          <span>解锁: {getConditionText()}</span>
        )}
      </div>
    </div>
  );
}
