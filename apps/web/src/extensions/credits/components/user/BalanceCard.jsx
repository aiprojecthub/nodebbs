import { Card, CardContent } from '@/components/ui/card';
import { Coins } from 'lucide-react';
import { formatCredits } from '../../utils/formatters';

/**
 * Compact balance display card for headers
 * @param {Object} props
 * @param {number} props.balance - Credits balance
 */
export function BalanceCard({ balance }) {
  return (
    <Card className="border-yellow-500/20 bg-yellow-500/5">
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <Coins className="h-5 w-5 text-yellow-500" />
          <div>
            <div className="text-xs text-muted-foreground">我的余额</div>
            <div className="text-lg font-bold text-yellow-600">{formatCredits(balance)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
