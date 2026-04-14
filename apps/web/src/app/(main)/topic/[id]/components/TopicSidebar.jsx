'use client';

import TopicActions from './TopicActions';
import TopicAuthorCard from './TopicAuthorCard';
import TopicMeta from './TopicMeta';

/**
 * 话题侧边栏组件 — 组合操作按钮、作者卡片、元信息
 * 模板可以直接使用此组件，也可以单独引用 TopicActions/TopicAuthorCard/TopicMeta 自由组合
 */
export default function TopicSidebar() {
  return (
    <div className='space-y-4'>
      <TopicActions />
      <TopicAuthorCard />
      <TopicMeta />
    </div>
  );
}
