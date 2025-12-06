import React, { useEffect, useState } from 'react';
import { badgesApi } from '../api';
import BadgeCard from './BadgeCard';

export default function BadgesList({ userId }) {
  const [allBadges, setAllBadges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const badgesRes = await badgesApi.getAll();
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

  if (loading) return <div className="p-8 text-center text-gray-500">加载勋章中...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-500 to-orange-600">
          勋章墙
        </h2>
        <span className="text-sm text-gray-500">
          已获得 {ownedCount} / {allBadges.length}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {allBadges.map(badge => (
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
