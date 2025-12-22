'use client';

import React, { useState, useEffect } from 'react';
import BadgesList from '@/extensions/badges/components/BadgesList';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Medal } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { BadgeUnlockDialog } from '@/extensions/shop/components/user/BadgeUnlockDialog';

export default function MyBadgesPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
  const [unlockBadgeItem, setUnlockBadgeItem] = useState(null);

  useEffect(() => {
    const unlockBadgeId = searchParams.get('unlockBadgeId');
    const unlockBadgeName = searchParams.get('unlockBadgeName');
    const unlockBadgeIcon = searchParams.get('unlockBadgeIcon');

    if (unlockBadgeId && unlockBadgeName && unlockBadgeIcon) {
      setUnlockBadgeItem({
        id: unlockBadgeId,
        name: unlockBadgeName,
        imageUrl: unlockBadgeIcon,
        description: '恭喜你获得这枚新勋章！' 
      });
      setUnlockDialogOpen(true);
      
      // 清除 URL 参数，避免刷新再次触发
      // 使用 replace 而不是 push 以免污染历史记录
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('unlockBadgeId');
      newUrl.searchParams.delete('unlockBadgeName');
      newUrl.searchParams.delete('unlockBadgeIcon');
      router.replace(newUrl.pathname + newUrl.search);
    }
  }, [searchParams, router]);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Medal className="h-5 w-5 text-amber-500" />
            我的勋章
          </CardTitle>
          <CardDescription>
            查看您获得的所有荣誉勋章
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BadgesList userId={user?.id} />
        </CardContent>
      </Card>

      <BadgeUnlockDialog 
        open={unlockDialogOpen} 
        onOpenChange={setUnlockDialogOpen} 
        badgeItem={unlockBadgeItem} 
      />
    </>
  );
}
