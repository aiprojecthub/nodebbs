import Link from 'next/link';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function TopicSortTabs({ defaultValue = 'latest', className }) {
  // 使用相对查询参数更新，兼容各页面
  return (
    <Tabs defaultValue={defaultValue} className={className}>
      <TabsList>
        <TabsTrigger value='latest' asChild>
          <Link href='?sort=latest'>最新回复</Link>
        </TabsTrigger>
        <TabsTrigger value='newest' asChild>
          <Link href='?sort=newest'>最新发布</Link>
        </TabsTrigger>
        {/* <TabsTrigger value='popular' asChild>
          <Link href='?sort=popular'>精华话题</Link>
        </TabsTrigger>
        <TabsTrigger value='trending' asChild>
          <Link href='?sort=trending'>热门趋势</Link>
        </TabsTrigger> */}
      </TabsList>
    </Tabs>
  );
}
