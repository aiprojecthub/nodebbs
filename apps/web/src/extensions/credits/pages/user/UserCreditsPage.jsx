'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trophy } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useCreditsBalance } from '../../hooks/useCreditsBalance';
import { useCreditsTransactions } from '../../hooks/useCreditsTransactions';
import { BalanceOverview } from '../../components/user/BalanceOverview';
import { CheckInStatus } from '../../components/user/CheckInStatus';
import { TransactionHistory } from '../../components/user/TransactionHistory';

export default function UserCreditsPage() {
  const { user } = useAuth();
  const { balance } = useCreditsBalance();
  const [page, setPage] = useState(1);
  const limit = 20;
  
  const { transactions, total, loading } = useCreditsTransactions({ page, limit });

  const handlePageChange = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-card-foreground mb-2">积分中心</h1>
          <p className="text-muted-foreground">管理你的积分和交易记录</p>
        </div>
        <Link href="/rank">
          <Button variant="outline" className="gap-2">
            <Trophy className="h-4 w-4 text-yellow-500" />
            查看排行榜
          </Button>
        </Link>
      </div>

      {/* Balance Overview */}
      <BalanceOverview balance={balance} />

      {/* Check-in Status */}
      {balance && (
        <CheckInStatus
          checkInStreak={balance.checkInStreak}
          lastCheckInDate={balance.lastCheckInDate}
        />
      )}

      {/* Transaction History */}
      <TransactionHistory
        transactions={transactions}
        loading={loading}
        pagination={{
          page,
          total,
          limit,
        }}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
