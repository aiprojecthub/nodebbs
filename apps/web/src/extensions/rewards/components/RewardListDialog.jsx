'use client';

import { useState, useEffect } from 'react';
import { FormDialog } from '@/components/common/FormDialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import UserAvatar from '@/components/user/UserAvatar';
import { rewardsApi } from '@/lib/api';
import { Coins, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from '@/components/common/Link';
import Time from '@/components/common/Time';

const PAGE_LIMIT = 10;

export function RewardListDialog({ open, onOpenChange, postId }) {
  const [loading, setLoading] = useState(false);
  const [rewards, setRewards] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    if (open && postId) {
      // 重置状态并获取第一页
      setPage(1);
      setRewards([]);
      fetchRewards(1);
    }
  }, [open, postId]);

  const fetchRewards = async (pageNum) => {
    setLoading(true);
    try {
      const data = await rewardsApi.getPostRewards(postId, { page: pageNum, limit: PAGE_LIMIT });
      
      if (pageNum === 1) {
        setRewards(data.items || []);
      } else {
        setRewards(prev => [...prev, ...(data.items || [])]);
      }
      
      setTotalAmount(data.totalAmount || 0);
      setTotalCount(data.total || 0);
      setHasMore((data.items?.length || 0) >= PAGE_LIMIT); // 如果返回数量等于limit，说明可能还有下一页
    } catch (error) {
      console.error('获取打赏列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchRewards(nextPage);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="sm:max-w-[425px]"
      title={
        <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-yellow-600" />
            打赏记录
            {totalCount > 0 && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                (共 {totalCount} 次, {totalAmount} 积分)
              </span>
            )}
        </div>
      }
      footer={null}
    >
        <ScrollArea className="h-[300px] pr-4">
          {loading && page === 1 ? (
            <div className="flex justify-center items-center h-full py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rewards.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              暂无打赏记录
            </div>
          ) : (
            <div className="space-y-4">
              {rewards.map((reward) => (
                <div key={reward.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <Link href={`/users/${reward.fromUsername}`} className="shrink-0">
                    <UserAvatar 
                      url={reward.fromUserAvatar} 
                      name={reward.fromUsername} 
                      size="sm"
                      frameMetadata={reward.userAvatarFrame?.itemMetadata}
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <Link 
                        href={`/users/${reward.fromUsername}`}
                        className="text-sm font-medium hover:underline truncate"
                      >
                        {reward.fromUsername}
                      </Link>
                      <span className="text-sm font-bold text-yellow-600 flex items-center gap-1 shrink-0">
                        <Coins className="h-3 w-3" />
                        {reward.amount}
                      </span>
                    </div>
                    {reward.message && (
                      <p className="text-sm text-muted-foreground mt-1 break-words">
                        {reward.message}
                      </p>
                    )}
                    <div className="text-xs text-muted-foreground/60 mt-1">
                      <Time date={reward.createdAt} fromNow />
                    </div>
                  </div>
                </div>
              ))}
              
              {hasMore && (
                <div className="flex justify-center pt-2 pb-4">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleLoadMore}
                    disabled={loading}
                    className="text-xs text-muted-foreground"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        加载中...
                      </>
                    ) : (
                      '加载更多'
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
    </FormDialog>
  );
}
