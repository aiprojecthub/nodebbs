import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Coins, TrendingUp, TrendingDown } from 'lucide-react';
import { formatCredits } from '../../utils/formatters';

/**
 * Detailed balance overview with earned/spent stats
 * @param {Object} props
 * @param {Object} props.balance - Balance object with balance, totalEarned, totalSpent
 */
export function BalanceOverview({ balance }) {
  if (!balance) return null;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Current Balance */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">当前余额</CardTitle>
          <Coins className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCredits(balance.balance || 0)}</div>
          <p className="text-xs text-muted-foreground">
            可用于打赏和商城消费
          </p>
        </CardContent>
      </Card>

      {/* Total Earned */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">累计获得</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCredits(balance.totalEarned || 0)}</div>
          <p className="text-xs text-muted-foreground">
            通过各种活动获得
          </p>
        </CardContent>
      </Card>

      {/* Total Spent */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">累计消费</CardTitle>
          <TrendingDown className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCredits(balance.totalSpent || 0)}</div>
          <p className="text-xs text-muted-foreground">
            用于打赏和购物
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
