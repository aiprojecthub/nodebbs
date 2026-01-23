'use client';

import { useAuth } from '@/contexts/AuthContext';

export function usePermission() {
  const { user } = useAuth();

  return {
    isAdmin: user?.isAdmin || false,
    isModerator: user?.isModerator || false,
    canManage: (targetUser) => {
        if (!user) return false;
        if (user.isAdmin) return true;
        if (user.isModerator && targetUser?.role !== 'admin') return true;
        return false;
    }
  };
}
