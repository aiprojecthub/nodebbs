'use client';

import TopicAlerts from '@/components/topic/TopicDetail/TopicAlerts';
import TopicHeader from '@/components/topic/TopicDetail/TopicHeader';
import TopicMetaLine from '@/components/topic/TopicDetail/TopicMetaLine';
import TopicBody from '@/components/topic/TopicDetail/TopicBody';
import FirstPostActions from '@/components/topic/TopicDetail/FirstPostActions';
import { useTopicContext } from '@/contexts/TopicContext';

/**
 * 话题内容组件（首帖展示）
 * 默认组合：组装原子组件，保持向后兼容
 * 模板可直接使用此组件，也可单独引用原子组件自由组合
 */
export default function TopicContent() {
  const { topic } = useTopicContext();

  return (
    <>
      {/* 提示信息 */}
      <div className='px-4 mb-4'>
        <TopicAlerts />
      </div>

      {/* 话题标题 + 元信息 */}
      <div className='px-4 mb-6 space-y-3'>
        <TopicHeader />
        <TopicMetaLine />
      </div>

      {/* 话题内容 - 首帖 */}
      <div
        className='content-card mb-6'
        data-post-number='1'
      >
        <div className='px-3 sm:px-6 py-4 sm:py-5'>
          <TopicBody content={topic.content} />
          <div className='pt-4 mt-4 border-t border-border/50'>
            <FirstPostActions />
          </div>
        </div>
      </div>
    </>
  );
}
