'use client';

import React from 'react';
import BadgesList from '@/features/badges/components/BadgesList';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Medal } from 'lucide-react';

export default function MyBadgesPage() {
  const { user } = useAuth();

  return (
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
  );
}
