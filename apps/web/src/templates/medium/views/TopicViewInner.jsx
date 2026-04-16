'use client';

import Link from '@/components/common/Link';
import UserAvatar from '@/components/user/UserAvatar';
import Time from '@/components/common/Time';
import { useTopicContext } from '@/contexts/TopicContext';
import TopicAlerts from '@/components/topic/TopicDetail/TopicAlerts';
import TopicBody from '@/components/topic/TopicDetail/TopicBody';
import FirstPostActions from '@/components/topic/TopicDetail/FirstPostActions';
import TopicTags from '@/components/topic/TopicDetail/TopicTags';
import MediumReplySection from '../components/MediumReplySection';
import TopicActionMenu from '../components/TopicActionMenu';

export default function TopicViewInner({
  initialPosts,
  totalPosts,
  totalPages,
  currentPage,
  limit,
}) {
  const { topic } = useTopicContext();

  return (
    <div>
      {/* 提示 */}
      <TopicAlerts />

      {/* 标题区 */}
      <div className='pt-8 sm:pt-12 mb-6'>
        {/* 分类 */}
        {topic.categoryName && (
          <Link
            href={`/categories/${topic.categorySlug}`}
            className='inline-flex items-center gap-1.5 text-sm mb-4 hover:opacity-80 transition-opacity'
            style={{ color: topic.categoryColor }}
          >
            <span className='w-2 h-2 rounded-full' style={{ backgroundColor: topic.categoryColor }} />
            {topic.categoryName}
          </Link>
        )}

        {/* 大标题 — 衬线字体 */}
        <h1
          className='text-3xl sm:text-[42px] font-bold leading-tight text-foreground mb-4 break-words'
          style={{ fontFamily: 'var(--font-serif)', letterSpacing: '-0.02em' }}
        >
          {topic.title}
        </h1>

        {/* 作者信息 + 操作栏：桌面端水平两端对齐，移动端垂直 */}
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-4'>
          <div className='flex items-center gap-3'>
            <Link href={`/users/${topic.username}`}>
              <UserAvatar
                url={topic.userAvatar}
                name={topic.userName || topic.username}
                size='md'
                frameMetadata={topic.userAvatarFrame?.itemMetadata}
              />
            </Link>
            <div className='flex flex-col'>
              <Link
                href={`/users/${topic.username}`}
                className='text-sm font-medium text-foreground hover:underline'
              >
                {topic.userName || topic.username}
              </Link>
              <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                <Time date={topic.createdAt} fromNow />
                {topic.viewCount > 0 && (
                  <>
                    <span className='opacity-50'>·</span>
                    <span>{topic.viewCount} 次阅读</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <TopicActionMenu />
        </div>
      </div>

      {/* 分隔线 */}
      <div className='border-b border-border/60 mb-8' />

      {/* 正文内容 */}
      <article className='mb-8'>
        <TopicBody content={topic.content} />
      </article>

      {/* 底部操作（点赞/打赏） */}
      <div className='border-t border-border/60 py-4'>
        <FirstPostActions />
      </div>

      {/* 标签 */}
      {topic.tags?.length > 0 && (
        <div className='mb-8'>
          <TopicTags />
        </div>
      )}

      {/* 回复区域 */}
      <div className='pt-4'>
        <MediumReplySection
          initialPosts={initialPosts}
          totalPosts={totalPosts}
          totalPages={totalPages}
          currentPage={currentPage}
          limit={limit}
        />
      </div>
    </div>
  );
}
