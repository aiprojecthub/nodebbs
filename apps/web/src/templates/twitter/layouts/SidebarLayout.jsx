import { getCategoriesData, getStatsData, getTagsData } from '@/lib/server/topics';
import { AdSlot } from '@/extensions/ads/components';
import Link from '@/components/common/Link';
import { Search } from 'lucide-react';
import { formatCompactNumber } from '@/lib/utils';

function SearchBox() {
  return (
    <div className='pt-3 pb-2'>
      <form action='/search' className='relative'>
        <Search
          aria-hidden='true'
          className='absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground pointer-events-none'
        />
        <input
          type='search'
          name='s'
          placeholder='搜索'
          aria-label='搜索'
          className='w-full h-[42px] pl-10 pr-4 rounded-full bg-muted border-none text-[15px] outline-none focus:bg-background focus:ring-2 focus:ring-primary transition-all'
        />
      </form>
    </div>
  );
}

function Trending({ tags }) {
  if (!tags?.length) return null;

  return (
    <div className='rounded-2xl bg-muted/40 overflow-hidden'>
      <h2 className='font-extrabold text-xl px-4 pt-3 pb-2'>趋势</h2>
      {tags.slice(0, 5).map((tag) => (
        <Link
          key={tag.id || tag.slug}
          href={`/tags/${tag.slug}`}
          className='block px-4 py-2.5 hover:bg-muted/60 transition-colors'
        >
          <div className='font-bold text-[15px] leading-5'>#{tag.name}</div>
          <div className='text-[13px] text-muted-foreground mt-px'>
            {formatCompactNumber(tag.topicCount || 0)} 个话题
          </div>
        </Link>
      ))}
      <Link href='/tags' className='block px-4 py-3 text-[15px] text-primary hover:bg-muted/60 transition-colors'>
        显示更多
      </Link>
    </div>
  );
}

function Explore({ categories }) {
  if (!categories?.length) return null;

  return (
    <div className='rounded-2xl bg-muted/40 overflow-hidden'>
      <h2 className='font-extrabold text-xl px-4 pt-3 pb-2'>发现版块</h2>
      {categories.slice(0, 5).map((cat) => (
        <Link
          key={cat.id}
          href={`/categories/${cat.slug}`}
          className='flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60 transition-colors'
        >
          <div
            aria-hidden='true'
            className='w-9 h-9 rounded-lg shrink-0'
            style={{ backgroundColor: cat.color }}
          />
          <div className='flex-1 min-w-0'>
            <div className='font-bold text-[15px] leading-5 truncate'>{cat.name}</div>
            <div className='text-[13px] text-muted-foreground'>{formatCompactNumber(cat.topicCount || 0)} 个话题</div>
          </div>
        </Link>
      ))}
      <Link href='/categories' className='block px-4 py-3 text-[15px] text-primary hover:bg-muted/60 transition-colors'>
        显示更多
      </Link>
    </div>
  );
}

function FooterLinks({ stats }) {
  if (!stats) return null;

  return (
    <div className='px-4 py-3 text-[13px] text-muted-foreground/70 flex flex-wrap items-center gap-x-3 gap-y-1'>
      <span>{formatCompactNumber(stats.totalUsers)} 位用户</span>
      {stats.online?.total > 0 && (
        <span className='flex items-center gap-1'>
          <span className='inline-block h-1.5 w-1.5 bg-green-500 rounded-full' />
          {formatCompactNumber(stats.online.total)} 在线
        </span>
      )}
    </div>
  );
}

export default async function SidebarLayout({ children }) {
  const [categories, stats, tags] = await Promise.all([
    getCategoriesData({ isFeatured: true }),
    getStatsData(),
    getTagsData({ limit: 10 }),
  ]);

  return (
    <div className='flex'>
      {/* 中间内容区 */}
      <main className='flex-1 min-w-0 border-r border-border'>
        <AdSlot slotCode='home_header_banner' />
        {children}
        <AdSlot slotCode='home_footer_banner' />
      </main>

      {/* 右侧推荐栏 */}
      <aside className='hidden lg:block w-[350px] shrink-0'>
        <div className='sticky top-0 max-h-screen overflow-y-auto px-4 space-y-4'>
          <SearchBox />
          <Trending tags={tags} />
          <AdSlot slotCode='home_sidebar_top' className='rounded-2xl' />
          <Explore categories={categories} />
          <FooterLinks stats={stats} />
          <AdSlot slotCode='home_sidebar_bottom' className='rounded-2xl' />
        </div>
      </aside>
    </div>
  );
}
