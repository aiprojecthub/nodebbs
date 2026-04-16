import { Trophy, Coins, Crown } from 'lucide-react';
import Link from '@/components/common/Link';
import UserAvatar from '@/components/user/UserAvatar';
import { cn } from '@/lib/utils';
import { getTemplate } from '@/templates';
import { LAYOUTS } from '@/templates/constants';

function RankItem({ user, index, rankType, currentUserId }) {
  const isCurrentUser = currentUserId === user.userId;
  const rank = index + 1;

  return (
    <div className='flex items-center gap-4 py-4 border-b border-border/60'>
      <span className={cn('w-8 text-center text-lg font-semibold tabular-nums', rank <= 3 ? 'text-foreground' : 'text-muted-foreground/60')}>
        {rank}
      </span>
      <Link href={`/users/${user.username}`} className='shrink-0'>
        <UserAvatar url={user.avatar} name={user.name || user.username} size='sm' modifiers='embed,s_200x200' />
      </Link>
      <div className='flex-1 min-w-0'>
        <Link href={`/users/${user.username}`} className='hover:underline'>
          <span className={cn('font-semibold', isCurrentUser && 'text-primary')}>{user.name}</span>
        </Link>
        {isCurrentUser && <span className='text-xs text-primary ml-2'>(you)</span>}
      </div>
      <div className='flex items-center gap-1.5 text-muted-foreground'>
        <Coins className='h-4 w-4 text-yellow-500/70' />
        <span className='font-semibold tabular-nums text-foreground'>
          {rankType === 'balance' ? user.balance : user.totalEarned}
        </span>
      </div>
    </div>
  );
}

export default function RankView({ rankType, currentUserId, currencyName, ranking }) {
  const SidebarLayout = getTemplate(LAYOUTS.SidebarLayout);

  return (
    <SidebarLayout>
      <div>
        <h1 className='text-2xl font-bold mb-2' style={{ fontFamily: 'var(--font-serif)' }}>
          {currencyName}排行榜
        </h1>
        <p className='text-muted-foreground text-[15px] mb-6'>社区中最活跃的创作者</p>

        {/* Tab */}
        <div className='flex gap-6 border-b border-border mb-4'>
          <Link
            href='/rank?type=balance'
            scroll={false}
            replace
            className={cn('pb-3 text-sm font-semibold border-b-2 transition-colors -mb-px', rankType === 'balance' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}
          >
            余额榜
          </Link>
          <Link
            href='/rank?type=totalEarned'
            scroll={false}
            replace
            className={cn('pb-3 text-sm font-semibold border-b-2 transition-colors -mb-px', rankType === 'totalEarned' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}
          >
            财富榜
          </Link>
        </div>

        {ranking.length === 0 ? (
          <div className='text-center py-16'>
            <Trophy className='h-10 w-10 text-muted-foreground/30 mx-auto mb-4' />
            <p className='font-semibold'>暂无排行数据</p>
            <p className='text-sm text-muted-foreground mt-1'>还没有用户获得{currencyName}</p>
          </div>
        ) : (
          <div>
            {ranking.map((user, index) => (
              <RankItem key={user.userId} user={user} index={index} rankType={rankType} currentUserId={currentUserId} />
            ))}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
