'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { creditsApi } from '@/lib/api';
import { Trophy, Coins, TrendingUp, Medal } from 'lucide-react';
import { Loading } from '@/components/common/Loading';
import Link from 'next/link';

export default function RankPage() {
  const [rankType, setRankType] = useState('balance');
  const [ranking, setRanking] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRanking();
  }, [rankType]);

  const fetchRanking = async () => {
    setIsLoading(true);
    try {
      const data = await creditsApi.getRanking({ limit: 50, type: rankType });
      setRanking(data.items || []);
    } catch (error) {
      console.error('获取排行榜失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getMedalIcon = (index) => {
    if (index === 0) return <Trophy className="h-6 w-6 text-yellow-500" />;
    if (index === 1) return <Medal className="h-6 w-6 text-gray-400" />;
    if (index === 2) return <Medal className="h-6 w-6 text-amber-700" />;
    return null;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-card-foreground mb-2 flex items-center gap-2">
          <Trophy className="h-8 w-8 text-yellow-500" />
          积分排行榜
        </h1>
        <p className="text-muted-foreground">社区活跃度排名</p>
      </div>

      <Tabs value={rankType} onValueChange={setRankType}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="balance" className="gap-2">
            <Coins className="h-4 w-4" />
            当前余额
          </TabsTrigger>
          <TabsTrigger value="totalEarned" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            累计获得
          </TabsTrigger>
        </TabsList>

        <TabsContent value={rankType}>
          <Card>
            <CardHeader>
              <CardTitle>
                {rankType === 'balance' ? '积分余额排行' : '累计积分排行'}
              </CardTitle>
              <CardDescription>
                {rankType === 'balance'
                  ? '根据用户当前积分余额排名'
                  : '根据用户累计获得积分排名'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Loading text="加载中..." className="py-12" />
              ) : ranking.length > 0 ? (
                <div className="space-y-2">
                  {ranking.map((user, index) => (
                    <Link
                      key={user.userId}
                      href={`/users/${user.username}`}
                      className="block"
                    >
                      <div className="flex items-center gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border">
                        {/* 排名 */}
                        <div className="w-12 text-center flex items-center justify-center">
                          {getMedalIcon(index) || (
                            <span className="text-lg font-bold text-muted-foreground">
                              {index + 1}
                            </span>
                          )}
                        </div>

                        {/* 用户头像 */}
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={user.avatar} alt={user.username} />
                          <AvatarFallback>{user.username[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>

                        {/* 用户信息 */}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-card-foreground truncate">
                            {user.username}
                          </div>
                          {user.checkInStreak > 0 && (
                            <div className="text-sm text-muted-foreground">
                              连续签到 {user.checkInStreak} 天
                            </div>
                          )}
                        </div>

                        {/* 积分数据 */}
                        <div className="text-right">
                          <div className="flex items-center gap-2 font-bold text-lg">
                            <Coins className="h-5 w-5 text-yellow-500" />
                            <span className="text-yellow-600">
                              {rankType === 'balance' ? user.balance : user.totalEarned}
                            </span>
                          </div>
                          {rankType === 'totalEarned' && (
                            <div className="text-xs text-muted-foreground">
                              余额 {user.balance}
                            </div>
                          )}
                        </div>

                        {/* 特殊标记 */}
                        {index < 3 && (
                          <div>
                            {index === 0 && (
                              <Badge className="bg-yellow-500 hover:bg-yellow-600">
                                第一名
                              </Badge>
                            )}
                            {index === 1 && (
                              <Badge className="bg-gray-400 hover:bg-gray-500">
                                第二名
                              </Badge>
                            )}
                            {index === 2 && (
                              <Badge className="bg-amber-700 hover:bg-amber-800">
                                第三名
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium text-card-foreground mb-2">
                    暂无排行数据
                  </h3>
                  <p className="text-muted-foreground">
                    还没有用户获得积分
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
