'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wallet, Loader2, Trophy, TrendingUp } from 'lucide-react';
import Link from '@/components/common/Link';
import { ledgerApi } from '../../api';
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
      case 'credits': return '🪙';
      case 'gold': return '💰';
      default: return '$';
    }
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-card-foreground mb-2 flex items-center gap-2">
            <Wallet className="h-6 w-6" />
            我的钱包
          </h1>
          <p className="text-muted-foreground">查看您的资产余额及交易明细</p>
        </div>
        <Link href="/rank">
          <Button variant="outline" className="gap-2">
            <Trophy className="h-4 w-4 text-yellow-500" />
            查看排行榜
          </Button>
        </Link>
      </div>

      {checkInStatus && (
        <CheckInStatus
          checkInStreak={checkInStatus.checkInStreak}
          lastCheckInDate={checkInStatus.lastCheckInDate}
        />
      )}

      {/* Accounts Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading && accounts.length === 0 ? (
          <div className="col-span-full flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
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
