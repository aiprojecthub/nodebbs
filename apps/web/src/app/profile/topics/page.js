'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreatedTopics } from './components/CreatedTopics';
import { FavoriteTopics } from './components/FavoriteTopics';

export default function MyTopicsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 从 URL 获取当前 Tab，默认为 'created'
  const currentTab = searchParams.get('tab') || 'created';

  const handleTabChange = (value) => {
    const params = new URLSearchParams(searchParams);
    if (value === 'created') {
      params.delete('tab');
    } else {
      params.set('tab', value);
    }
    router.push(`/profile/topics?${params.toString()}`);
  };

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-card-foreground mb-2'>
            我的话题
          </h1>
          <p className='text-muted-foreground'>查看发布和收藏的话题</p>
        </div>
      </div>
      <Tabs
        defaultValue='created'
        value={currentTab}
        onValueChange={handleTabChange}
      >
        <TabsList className='grid grid-cols-2 mb-2'>
          <TabsTrigger value='created'>我的发布</TabsTrigger>
          <TabsTrigger value='favorites'>我的收藏</TabsTrigger>
        </TabsList>

        <TabsContent value='created' className='mt-0'>
          <CreatedTopics />
        </TabsContent>

        <TabsContent value='favorites' className='mt-0'>
          <FavoriteTopics />
        </TabsContent>
      </Tabs>
    </div>
  );
}
