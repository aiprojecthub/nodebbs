import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Coins, Crown } from 'lucide-react';
import Link from '@/components/common/Link';
import UserAvatar from '@/components/user/UserAvatar';
import { cn } from '@/lib/utils';
import StickyHeader from '../components/StickyHeader';

function Podium({ top3, rankType }) {
  const [first, second, third] = [top3[0], top3[1], top3[2]];

  const PodiumItem = ({ user, rank, className }) => {
    if (!user) return <div className={cn("flex-1", className)}></div>;
    const isFirst = rank === 1;
    const isSecond = rank === 2;
    const isThird = rank === 3;

    return (
      <div className={cn("flex flex-col items-center z-10", className)}>
        <div className="relative mb-3">
          {isFirst && <Crown className="absolute -top-6 left-1/2 -translate-x-1/2 w-6 h-6 text-yellow-500 fill-yellow-500 animate-bounce" />}
          <div className={cn("rounded-full p-0.5 border-3", isFirst && "border-yellow-400", isSecond && "border-gray-300", isThird && "border-amber-600")}>
            <UserAvatar url={user.avatar} name={user.name || user.username} size={isFirst ? "xl" : "lg"} modifiers='embed,s_200x200' />
          </div>
          <div className={cn("absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full font-bold text-white text-xs flex items-center justify-center", isFirst && "bg-yellow-500", isSecond && "bg-gray-400", isThird && "bg-amber-700")}>
            {rank}
          </div>
        </div>
        <Link href={`/users/${user.username}`} className="text-center p-1 rounded-lg hover:bg-muted/50 w-full max-w-25">
          <div className="font-bold text-sm truncate">{user.name}</div>
          <div className="flex items-center justify-center gap-1 mt-0.5 text-xs text-muted-foreground">
            <Coins className="w-3 h-3" />
            <span className="tabular-nums">{rankType === 'balance' ? user.balance : user.totalEarned}</span>
          </div>
        </Link>
      </div>
    );
  };

  return (
    <div className="flex justify-center items-end gap-4 sm:gap-8 pb-6 pt-4 border-b border-border">
      <PodiumItem user={second} rank={2} className="order-1 flex-1 sm:flex-none" />
      <PodiumItem user={first} rank={1} className="order-2 flex-1 sm:flex-none -mt-6" />
      <PodiumItem user={third} rank={3} className="order-3 flex-1 sm:flex-none" />
    </div>
  );
}

function RankItem({ user, index, rankType, currentUserId }) {
  const isCurrentUser = currentUserId === user.userId;
  const rank = index + 1;

  return (
    <Link href={`/users/${user.username}`} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors border-b border-border">
      <span className={cn("w-6 text-center font-bold tabular-nums text-muted-foreground", isCurrentUser && "text-primary")}>{rank}</span>
      <UserAvatar url={user.avatar} name={user.name || user.username} size="sm" modifiers='embed,s_200x200' />
      <div className="flex-1 min-w-0">
        <span className={cn("font-bold text-[15px]", isCurrentUser && "text-primary")}>{user.name}</span>
        {isCurrentUser && <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full ml-2">You</span>}
      </div>
      <div className="flex items-center gap-1 text-muted-foreground">
        <Coins className="h-4 w-4 text-yellow-500/70" />
        <span className="font-bold tabular-nums">{rankType === 'balance' ? user.balance : user.totalEarned}</span>
      </div>
    </Link>
  );
}

export default function RankView({ rankType, currentUserId, currencyName, ranking }) {
  return (
    <div>
      <StickyHeader title={`${currencyName}排行榜`} showBack={false} />

      {/* Tab 切换 */}
      <div className="flex border-b border-border">
        <Link href="/rank?type=balance" scroll={false} replace className={cn("flex-1 text-center py-3 text-sm font-bold transition-colors relative hover:bg-accent/30", rankType === 'balance' ? "text-foreground" : "text-muted-foreground")}>
          余额榜
          {rankType === 'balance' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-primary rounded-full" />}
        </Link>
        <Link href="/rank?type=totalEarned" scroll={false} replace className={cn("flex-1 text-center py-3 text-sm font-bold transition-colors relative hover:bg-accent/30", rankType === 'totalEarned' ? "text-foreground" : "text-muted-foreground")}>
          财富榜
          {rankType === 'totalEarned' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-primary rounded-full" />}
        </Link>
      </div>

      {ranking.length === 0 ? (
        <div className="text-center py-16">
          <Trophy className="h-10 w-10 text-muted-foreground/40 mx-auto mb-4" />
          <p className="font-bold">暂无排行数据</p>
          <p className="text-sm text-muted-foreground mt-1">还没有用户获得{currencyName}</p>
        </div>
      ) : (
        <>
          <Podium top3={ranking.slice(0, 3)} rankType={rankType} />
          <div>
            {ranking.slice(3).map((user, index) => (
              <RankItem key={user.userId} user={user} index={index + 3} rankType={rankType} currentUserId={currentUserId} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
