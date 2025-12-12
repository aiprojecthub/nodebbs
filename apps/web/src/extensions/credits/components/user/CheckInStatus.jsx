import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import TimeAgo from '@/components/forum/TimeAgo';

/**
 * Display check-in streak and last check-in
 * @param {Object} props
 * @param {number} props.checkInStreak - Current check-in streak
 * @param {string} props.lastCheckInDate - Last check-in date (ISO string)
 */
export function CheckInStatus({ checkInStreak, lastCheckInDate }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          每日签到
        </CardTitle>
        <CardDescription>
          每日首次访问自动签到,连续签到可获得额外奖励
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">当前连续签到</span>
            <span className="text-2xl font-bold">{checkInStreak || 0} 天</span>
          </div>
          {lastCheckInDate && (
            <div className="flex flex-col border-l pl-4">
              <span className="text-sm text-muted-foreground">上次签到</span>
              <span className="text-sm font-medium">
                <TimeAgo date={lastCheckInDate} />
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
