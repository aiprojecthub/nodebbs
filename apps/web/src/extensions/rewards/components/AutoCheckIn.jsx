'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { rewardsApi } from '@/lib/api';

import { toast } from 'sonner';

export default function AutoCheckIn() {
  const { isAuthenticated, user } = useAuth();
  const hasCheckedIn = useRef(false);

  useEffect(() => {
    const checkIn = async () => {
      // 如果未登录或本次会话已尝试签到，则跳过
      if (!isAuthenticated || !user || hasCheckedIn.current) {
        return;
      }

      // 标记为已尝试签到，避免重复请求
      hasCheckedIn.current = true;

      try {
        // 尝试签到
        const result = await rewardsApi.checkIn();
        if (result.amount) {
          // 签到成功，显示提示
          toast.success(result.message || '每日签到成功！', {
            description: `获得 ${result.amount} 积分，当前连续签到 ${result.checkInStreak} 天`,
            duration: 5000,
          });
        }
        
      } catch (error) {
        // 如果是"今天已经签到过了"，则静默失败，不打扰用户
        // 其他错误也不需要特别提示，避免影响用户体验
        console.error('自动签到失败:', error);
      }
    };

    checkIn();
  }, [isAuthenticated, user?.id]);

  return null;
}
