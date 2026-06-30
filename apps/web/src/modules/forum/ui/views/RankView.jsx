import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Coins, Crown } from 'lucide-react';
import Link from '@/components/common/Link';
import UserAvatar from '@/components/user/UserAvatar';
import { cn } from '@/lib/utils';
import SidebarLayout from '../layouts/SidebarLayout';

/**
 * 排行榜页面
 */

function Podium({ top3, rankType }) {
  const [first, second, third] = [top3[0], top3[1], top3[2]];

  const PodiumItem = ({ user, rank, className }) => {
    if (!user) return <div className={cn('flex-1', className)}></div>;
    const isFirst = rank === 1;
    const isSecond = rank === 2;
    const isThird = rank === 3;

    return (
      <div className={cn('flex flex-col items-center z-10', className)}>
        <div className='relative mb-3 sm:mb-4'>
          {isFirst && <Crown className='absolute -top-6 left-1/2 -translate-x-1/2 w-6 h-6 sm:w-8 sm:h-8 text-yellow-500 fill-yellow-500 animate-bounce' />}
          <div className={cn('rounded-full p-1 border-4', isFirst && 'border-yellow-400 bg-yellow-100', isSecond && 'border-gray-300 bg-gray-100', isThird && 'border-amber-600 bg-amber-50')}>
            <UserAvatar url={user.avatar} name={user.name || user.username} size={isFirst ? 'xl' : 'lg'} className='border-2 border-white dark:border-gray-900' modifiers='embed,s_200x200' />
          </div>
          <div className={cn('absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full font-bold text-white shadow-md text-xs sm:text-sm', isFirst && 'bg-yellow-500', isSecond && 'bg-gray-400', isThird && 'bg-amber-700')}>
            {rank}
          </div>
        </div>
        <Link href={`/users/${user.username}`} className='text-center group p-2 rounded-lg hover:bg-muted/50 transition-colors w-full max-w-35'>
          <div className='font-bold text-sm sm:text-base truncate w-full group-hover:text-primary transition-colors'>{user.name}</div>
          <div className='flex items-center justify-center gap-1 mt-1 text-xs sm:text-sm font-semibold'>
            <Coins className={cn('w-3 h-3 sm:w-4 sm:h-4', isFirst ? 'text-yellow-500' : 'text-muted-foreground')} />
            <span className='tabular-nums'>{rankType === 'balance' ? user.balance : user.totalEarned}</span>
          </div>
        </Link>
      </div>
    );
  };

  return (
    <div className='flex justify-center items-end gap-4 sm:gap-8 pb-8 pt-14 mb-2 border-b'>
      <PodiumItem user={second} rank={2} className='order-1 flex-1 sm:flex-none' />
      <PodiumItem user={first} rank={1} className='order-2 flex-1 sm:flex-none -mt-8 sm:-mt-12' />
      <PodiumItem user={third} rank={3} className='order-3 flex-1 sm:flex-none' />
    </div>
  );
}

function RankItem({ user, index, rankType, currentUserId }) {
  const isCurrentUser = currentUserId === user.userId;
  const rank = index + 1;
  return (
    <Link href={`/users/${user.username}`} className='block group'>
      <div className={cn('flex items-center gap-3 sm:gap-6 p-4 rounded-xl transition-colors hover:bg-muted/50 border border-transparent', isCurrentUser && 'bg-primary/5 hover:bg-primary/10 border-primary/20')}>
        <div className={cn('w-8 text-center font-bold text-lg tabular-nums opacity-50 group-hover:opacity-100 transition-opacity', isCurrentUser && 'opacity-100 text-primary')}>{rank}</div>
        <div className='flex-1 min-w-0 flex items-center gap-3'>
          <UserAvatar url={user.avatar} name={user.name || user.username} size='md' modifiers='embed,s_200x200' />
          <div className='flex-1 min-w-0'>
            <div className='flex items-center gap-2'>
              <span className={cn('font-medium truncate', isCurrentUser && 'text-primary font-semibold')}>{user.name || user.username}</span>
              {isCurrentUser && <span className='text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full whitespace-nowrap hidden sm:inline-block'>You</span>}
            </div>
            {user.checkInStreak > 0 && <div className='text-xs text-muted-foreground truncate opacity-70'>连续签到 {user.checkInStreak} 天</div>}
          </div>
        </div>
        <div className='text-right shrink-0 ml-4'>
          <div className='flex items-center justify-end gap-1.5 font-bold text-muted-foreground group-hover:text-foreground transition-colors'>
            <Coins className='h-4 w-4 text-yellow-500/70 group-hover:text-yellow-500 transition-colors' />
            <span className='tabular-nums text-base sm:text-lg'>{rankType === 'balance' ? user.balance : user.totalEarned}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function RankView({ rankType, currentUserId, currencyName, ranking }) {

  return (
    <SidebarLayout>
      <div>
        <div className='mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4'>
          <div>
            <h1 className='text-2xl font-bold text-foreground mb-1 flex items-center gap-2'>
              <Trophy className='h-7 w-7 text-yellow-500' />
              {currencyName}排行榜
            </h1>
            <p className='text-muted-foreground text-sm'>社区活跃度排名</p>
          </div>
          <div className='flex bg-muted p-1 rounded-lg self-start sm:self-auto'>
            <Link href='/rank?type=balance' scroll={false} replace className={cn('px-4 py-1.5 text-sm font-medium rounded-md transition', rankType === 'balance' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground')}>余额榜</Link>
            <Link href='/rank?type=totalEarned' scroll={false} replace className={cn('px-4 py-1.5 text-sm font-medium rounded-md transition', rankType === 'totalEarned' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground')}>财富榜</Link>
          </div>
        </div>

        <div className='bg-card border border-border rounded-lg p-0 sm:p-6'>
          {ranking.length === 0 ? (
            <div className='text-center py-12'>
              <Trophy className='h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50' />
              <h3 className='text-lg font-medium mb-2'>暂无排行数据</h3>
              <p className='text-muted-foreground'>还没有用户获得{currencyName}</p>
            </div>
          ) : (
            <div className='animate-in fade-in duration-500'>
              <Podium top3={ranking.slice(0, 3)} rankType={rankType} />
              <div className='space-y-1 mt-4'>
                {ranking.slice(3).map((user, index) => (
                  <RankItem key={user.userId} user={user} index={index + 3} rankType={rankType} currentUserId={currentUserId} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}
