'use client';

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Coins, Heart } from 'lucide-react';
import { creditsApi } from '@/lib/api';
import Link from 'next/link';
import TimeAgo from '../forum/TimeAgo';

export function RewardList({ postId, className = '' }) {
  const [rewards, setRewards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    if (postId) {
      fetchRewards();
    }
  }, [postId]);

  const fetchRewards = async () => {
    setIsLoading(true);
    try {
      const data = await creditsApi.getPostRewards(postId);
      setRewards(data.items || []);

      // 计算总打赏金额
      const total = (data.items || []).reduce((sum, reward) => sum + reward.amount, 0);
      setTotalAmount(total);
    } catch (error) {
      console.error('获取打赏列表失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 暴露刷新方法给父组件
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__refreshRewards = fetchRewards;
    }
  }, []);

  if (isLoading) {
    return null;
  }

  if (rewards.length === 0) {
    return null;
  }

  return (
    <Card className={className}>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Heart className="h-4 w-4 text-red-500" />
            <span>收到打赏</span>
            <span className="text-muted-foreground">({rewards.length})</span>
          </div>
          <div className="flex items-center gap-1 text-sm font-medium">
            <Coins className="h-4 w-4 text-yellow-500" />
            <span className="text-yellow-600">{totalAmount}</span>
          </div>
        </div>

        <div className="space-y-3">
          {rewards.map((reward) => (
            <div
              key={reward.id}
              className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <Link href={`/users/${reward.fromUsername}`}>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={reward.fromUserAvatar} alt={reward.fromUsername} />
                  <AvatarFallback>{reward.fromUsername[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
              </Link>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Link
                    href={`/users/${reward.fromUsername}`}
                    className="text-sm font-medium hover:underline"
                  >
                    {reward.fromUsername}
                  </Link>
                  <span className="flex items-center gap-1 text-sm font-medium text-yellow-600">
                    <Coins className="h-3 w-3" />
                    {reward.amount}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    <TimeAgo date={reward.createdAt} />
                  </span>
                </div>

                {reward.message && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {reward.message}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
