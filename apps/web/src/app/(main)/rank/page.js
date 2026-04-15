import { request, getCurrentUser } from '@/lib/server/api';
import { getDefaultCurrencyName } from '@/lib/server/ledger';
import { getTemplate } from '@/templates';
import { VIEWS } from '@/templates/constants';

export const metadata = {
  title: '排行榜',
  description: '查看社区活跃用户和财富榜单。',
};

export default async function RankPage({ searchParams }) {
  const { type } = await searchParams;
  const rankType = type || 'balance';

  const [currentUser, currencyName, rankData] = await Promise.all([
    getCurrentUser(),
    getDefaultCurrencyName(),
    request(`/rewards/rank?limit=50&type=${rankType}`).catch(e => {
      console.error("Fetch ranking failed", e);
      return { items: [] };
    }),
  ]);

  const ranking = rankData?.items || [];

  const RankView = getTemplate(VIEWS.RankView);

  return (
    <RankView
      rankType={rankType}
      currentUserId={currentUser?.id}
      currencyName={currencyName}
      ranking={ranking}
    />
  );
}
