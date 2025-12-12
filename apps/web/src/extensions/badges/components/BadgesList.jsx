import React, { useEffect, useState } from 'react';
import { badgesApi } from '../api';
import BadgeCard from './BadgeCard';

export default function BadgesList({ userId }) {
  const [allBadges, setAllBadges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const badgesRes = await badgesApi.getAll({ limit: 100 });
        setAllBadges(badgesRes.items || []);
      } catch (error) {
        console.error('Failed to fetch badges', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [userId]);

  // derived state
  const ownedCount = allBadges.filter(b => b.isOwned).length;
  const totalCount = allBadges.length;
  const progressPercentage = totalCount > 0 ? (ownedCount / totalCount) * 100 : 0;
  
  // Sort: Owned first, then by displayOrder/id
  const sortedBadges = [...allBadges].sort((a, b) => {
    if (a.isOwned && !b.isOwned) return -1;
    if (!a.isOwned && b.isOwned) return 1;
    return (a.displayOrder || 0) - (b.displayOrder || 0);
  });

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-12 space-y-4">
      <div className="w-8 h-8 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      <p className="text-gray-500 text-sm">正在加载荣誉勋章...</p>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-muted/30 p-6 rounded-2xl border border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              勋章收藏家
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              收集勋章，展示你的成就与贡献
            </p>
          </div>
          <div className="text-right">
             <div className="text-2xl font-bold text-primary">
              {ownedCount} / {totalCount}
            </div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              已获得
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {sortedBadges.map(badge => (
          <BadgeCard 
            key={badge.id} 
            badge={badge} 
            isUnlocked={badge.isOwned} 
          />
        ))}
      </div>
    </div>
  );
}
