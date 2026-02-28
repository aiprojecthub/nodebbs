'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Wallet, Trophy, TrendingUp } from 'lucide-react';
import Link from '@/components/common/Link';
import { ledgerApi } from '../../api';
import { DEFAULT_CURRENCY_CODE } from '../../constants';
import { rewardsApi } from '@/lib/api';
import { CheckInStatus } from '../../components/user/CheckInStatus';
import { LedgerTransactionTable } from '../../components/common/LedgerTransactionTable';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export default function UserWalletPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [checkInStatus, setCheckInStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const limit = 20;
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [page, user?.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [accountsData, txData, checkInResult] = await Promise.all([
        ledgerApi.getAccounts(),
        ledgerApi.getTransactions({ page, limit, userId: user?.id }),
        rewardsApi.getCheckInStatus().catch(() => null) // Fault tolerance for rewards status
      ]);
      setAccounts(accountsData);
      setTransactions(txData.items || []);
      setTotal(txData.total || 0);
      if (checkInResult) {
        setCheckInStatus({
            checkInStreak: checkInResult.checkInStreak,
            lastCheckInDate: checkInResult.lastCheckInDate
        });
      }
    } catch (err) {
      console.error('Failed to load wallet data:', err);
      toast.error('获取钱包数据失败');
    } finally {
      setLoading(false);
    }
  };

  const getCurrencySymbol = (code) => {
    switch (code) {
      case DEFAULT_CURRENCY_CODE: return '🪙';
      case 'gold': return '💰';
      default: return '$';
    }
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  return (
    <div className="space-y-6">
      {/* Hero Header - Compact & Theme Consistent */}
      <div className="relative overflow-hidden rounded-2xl bg-muted/30 border border-border/50 p-6">
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start text-center md:text-left justify-between gap-6">
          
          <div className="space-y-2 max-w-2xl">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center justify-center md:justify-start gap-3">
              <span className="p-2 rounded-lg bg-primary/10 text-primary">
                 <Wallet className="h-5 w-5" />
              </span>
              我的钱包
            </h1>
            <p className="text-muted-foreground text-sm md:text-base max-w-lg">
               查看您的资产余额及交易明细，管理您的数字财富。
            </p>
          </div>

          <div className="shrink-0">
            <Link href="/rank">
              <Button variant="outline" className="gap-2 bg-background/50 backdrop-blur-sm hover:bg-background/80 transition-colors border-border/50 shadow-sm">
                <Trophy className="h-4 w-4 text-yellow-500" />
                查看排行榜
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {loading && !checkInStatus ? (
        <Card className="shadow-none">
          <CardHeader>
            <div className="flex items-center gap-2 mb-1.5">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-16" />
              </div>
              <div className="flex flex-col border-l pl-4 gap-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : checkInStatus && (
        <CheckInStatus
          checkInStreak={checkInStatus.checkInStreak}
          lastCheckInDate={checkInStatus.lastCheckInDate}
        />
      )}

      {/* Accounts Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading && accounts.length === 0 ? (
           Array.from({ length: 3 }).map((_, index) => (
             <Card key={index} className="shadow-none">
               <CardHeader className="pb-2">
                 <Skeleton className="h-4 w-24" />
               </CardHeader>
               <CardContent>
                 <div className="flex items-center gap-2 mb-4">
                   <Skeleton className="h-9 w-32" />
                 </div>
                 <div className="flex items-center gap-4">
                   <Skeleton className="h-3 w-24" />
                 </div>
               </CardContent>
             </Card>
           ))
        ) : (
          accounts.map(account => (
            <Card key={account.currency.code} className="relative overflow-hidden shadow-none">
               <div className="absolute top-0 right-0 p-4 opacity-10">
                 <Wallet className="h-24 w-24" />
               </div>
               <CardHeader className="pb-2">
                 <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                   {account.currency.name}
                 </CardTitle>
               </CardHeader>
               <CardContent>
                 <div className="text-3xl font-bold flex items-center gap-2">
                   <span>{account.balance}</span>
                   <span className="text-xl opacity-50">{account.currency.symbol}</span>
                 </div>
                 <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                   <div className="flex items-center gap-1">
                     <TrendingUp className="h-3 w-3 text-green-500" />
                     累计获得: {account.totalEarned}
                   </div>
                   {account.isFrozen && (
                     <Badge variant="destructive" className="h-5 px-1.5">已冻结</Badge>
                   )}
                 </div>
               </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Transactions */}
      <div className="space-y-4">
          <LedgerTransactionTable 
            transactions={transactions}
            loading={loading}
            pagination={{
                page,
                limit,
                total,
                onPageChange: handlePageChange
            }}
            showUserColumn={false}
          />
      </div>
    </div>
  );
}
