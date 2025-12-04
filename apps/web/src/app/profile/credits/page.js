'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { creditsApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Coins, TrendingUp, TrendingDown, Calendar, Trophy, Loader2 } from 'lucide-react';
import { Loading } from '@/components/common/Loading';
import { Pager } from '@/components/common/Pagination';
import { toast } from 'sonner';
import TimeAgo from '@/components/forum/TimeAgo';

export default function CreditsPage() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 20;

  useEffect(() => {
    if (user?.id) {
      fetchBalance();
      fetchTransactions();
    }
  }, [user, page]);

  const fetchBalance = async () => {
    try {
      const data = await creditsApi.getBalance();
      setBalance(data);
    } catch (error) {
      console.error('获取积分余额失败:', error);
      toast.error('获取积分余额失败');
    }
  };

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const data = await creditsApi.getTransactions({ page, limit });
      setTransactions(data.items || []);
      setTotalCount(data.total || 0);
      setTotalPages(Math.ceil((data.total || 0) / limit));
    } catch (error) {
      console.error('获取交易记录失败:', error);
      toast.error('获取交易记录失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckIn = async () => {
    setIsCheckingIn(true);
    try {
      const result = await creditsApi.checkIn();
      toast.success(result.message);
      // 刷新余额和交易记录
      await fetchBalance();
      await fetchTransactions();
    } catch (error) {
      toast.error(error.message || '签到失败');
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // 交易类型映射
  const typeMap = {
    check_in: { label: '每日签到', color: 'default' },
    post_topic: { label: '发布话题', color: 'default' },
    post_reply: { label: '发布回复', color: 'default' },
    receive_like: { label: '获得点赞', color: 'default' },
    reward_post: { label: '打赏帖子', color: 'destructive' },
    buy_avatar_frame: { label: '购买头像框', color: 'destructive' },
    buy_badge: { label: '购买勋章', color: 'destructive' },
    admin_grant: { label: '管理员发放', color: 'default' },
    admin_deduct: { label: '管理员扣除', color: 'destructive' },
  };

  if (!balance && !isLoading) {
    return <Loading text="加载中..." />;
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-card-foreground mb-2">积分中心</h1>
        <p className="text-muted-foreground">管理你的积分和交易记录</p>
      </div>

      {/* 积分概览卡片 */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* 当前余额 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">当前余额</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{balance?.balance || 0}</div>
            <p className="text-xs text-muted-foreground">
              可用于打赏和商城消费
            </p>
          </CardContent>
        </Card>

        {/* 累计获得 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">累计获得</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{balance?.totalEarned || 0}</div>
            <p className="text-xs text-muted-foreground">
              通过各种活动获得
            </p>
          </CardContent>
        </Card>

        {/* 累计消费 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">累计消费</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{balance?.totalSpent || 0}</div>
            <p className="text-xs text-muted-foreground">
              用于打赏和购物
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 签到卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            每日签到
          </CardTitle>
          <CardDescription>
            连续签到可获得额外奖励，当前连续签到 {balance?.checkInStreak || 0} 天
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleCheckIn}
            disabled={isCheckingIn}
            size="lg"
            className="w-full sm:w-auto"
          >
            {isCheckingIn ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                签到中...
              </>
            ) : (
              <>
                <Coins className="mr-2 h-4 w-4" />
                立即签到
              </>
            )}
          </Button>
          {balance?.lastCheckInDate && (
            <p className="text-sm text-muted-foreground mt-2">
              上次签到：
              <TimeAgo date={balance.lastCheckInDate}  />
            </p>
          )}
        </CardContent>
      </Card>

      {/* 交易记录 */}
      <Card>
        <CardHeader>
          <CardTitle>交易记录</CardTitle>
          <CardDescription>查看你的所有积分变动记录</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Loading text="加载中..." className="py-8" />
          ) : transactions.length > 0 ? (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>类型</TableHead>
                      <TableHead>描述</TableHead>
                      <TableHead className="text-right">变动</TableHead>
                      <TableHead className="text-right">余额</TableHead>
                      <TableHead className="text-right">时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>
                          <Badge variant={typeMap[tx.type]?.color || 'default'}>
                            {typeMap[tx.type]?.label || tx.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {tx.description || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              tx.amount > 0 ? 'text-green-600' : 'text-red-600'
                            }
                          >
                            {tx.amount > 0 ? '+' : ''}
                            {tx.amount}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{tx.balance}</TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          <TimeAgo date={tx.createdAt}  />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* 分页 */}
              {totalPages > 1 && (
                <div className="mt-4">
                  <Pager
                    total={totalCount}
                    page={page}
                    pageSize={limit}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-card-foreground mb-2">
                暂无交易记录
              </h3>
              <p className="text-muted-foreground">
                开始参与社区活动来获得积分吧！
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
