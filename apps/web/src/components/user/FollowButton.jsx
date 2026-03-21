'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { userApi } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, UserPlus, UserMinus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function FollowButton({ username, initialIsFollowing = false, onFollowChange, className }) {
  const { user, isAuthenticated, openLoginDialog } = useAuth();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);

  // 当initialIsFollowing变化时更新状态
  useEffect(() => {
    setIsFollowing(initialIsFollowing);
  }, [initialIsFollowing]);

  const handleToggleFollow = async () => {
    if (!isAuthenticated) {
      openLoginDialog();
      return;
    }

    setLoading(true);

    try {
      if (isFollowing) {
        await userApi.unfollowUser(username);
        setIsFollowing(false);
        toast.success('已取消关注');
        onFollowChange?.(false);
      } else {
        await userApi.followUser(username);
        setIsFollowing(true);
        toast.success('关注成功');
        onFollowChange?.(true);
      }
    } catch (error) {
      console.error('关注操作失败:', error);
      toast.error(error.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  // 不显示关注自己的按钮
  if (user && user.username === username) {
    return null;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Button
      onClick={handleToggleFollow}
      disabled={loading}
      variant={isFollowing ? 'outline' : 'default'}
      className={className}
    >
      {loading ? (
        <>
          <Loader2 className='h-4 w-4 animate-spin' />
          处理中...
        </>
      ) : isFollowing ? (
        <>
          <UserMinus className='h-4 w-4' />
          取消关注
        </>
      ) : (
        <>
          <UserPlus className='h-4 w-4' />
          关注
        </>
      )}
    </Button>
  );
}
