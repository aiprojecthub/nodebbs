import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Coins, TrendingUp, TrendingDown, Users } from 'lucide-react';
import { formatCredits } from '../../utils/formatters';

/**
 * Display currency statistics for admin dashboard
 * @param {Object} props
 * @param {Object} props.currency - Currency definition (name, symbol, code)
 * @param {Object} props.stats - Statistics object
 * @param {boolean} props.loading - Loading state
 */
export function CurrencyStats({ currency, stats, loading }) {
  if (loading || !stats) {
    return null;
  }

  const { name, symbol } = currency || { name: '货币', symbol: '' };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="shadow-none">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">总流通{name}</CardTitle>
          <Coins className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold flex items-center gap-1">
             {formatCredits(stats.totalCirculation)}
             <span className="text-sm font-normal text-muted-foreground">{symbol}</span>
          </div>
          <p className="text-xs text-muted-foreground">系统中所有用户的{name}总和</p>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">今日发放</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600 flex items-center gap-1">
            +{formatCredits(stats.todayEarned)}
            <span className="text-sm font-normal text-muted-foreground opacity-70">{symbol}</span>
          </div>
          <p className="text-xs text-muted-foreground">今日用户获得的{name}总数</p>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">今日消费</CardTitle>
          <TrendingDown className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600 flex items-center gap-1">
            -{formatCredits(stats.todaySpent)}
             <span className="text-sm font-normal text-muted-foreground opacity-70">{symbol}</span>
          </div>
          <p className="text-xs text-muted-foreground">今日用户消费的{name}总数</p>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">活跃用户</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCredits(stats.userCount)}</div>
          <p className="text-xs text-muted-foreground">拥有{name}账户的用户数</p>
        </CardContent>
      </Card>
    </div>
  );
}
