'use client';

import { useState, useEffect } from 'react';
import { shopApi } from '@/lib/api';

/**
 * Hook to fetch and manage user's equipped items
 * @param {number} userId - User ID to fetch equipped items for (optional, defaults to current user)
 * @returns {object} - { equippedItems, avatarFrame, badges, isLoading, error, refetch }
 */
export function useEquippedItems(userId = null) {
  const [equippedItems, setEquippedItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchEquippedItems = async () => {
    setIsLoading(true);
    setError(null);

    try {
      let data;
      if (userId) {
        // Fetch for specific user using public endpoint
        data = await shopApi.getUserEquippedItems(userId);
      } else {
        // Fetch for current user (my-items endpoint)
        data = await shopApi.getMyItems();
      }
      
      const equipped = (data.items || []).filter(item => item.isEquipped);
      setEquippedItems(equipped);
    } catch (err) {
      console.error('Failed to fetch equipped items:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEquippedItems();
  }, [userId]);

  // Extract avatar frame (only one can be equipped)
  const avatarFrame = equippedItems.find(
    item => item.itemType === 'avatar_frame'
  );

  // Extract all equipped badges
  const badges = equippedItems.filter(
    item => item.itemType === 'badge'
  );

  return {
    equippedItems,
    avatarFrame,
    badges,
    isLoading,
    error,
    refetch: fetchEquippedItems,
  };
}
