'use client';

import TopicTags from '@/components/topic/TopicDetail/TopicTags';

/**
 * 话题元信息组件（侧边栏标签展示）
 * 委托给共享的 TopicTags 原子组件
 */
export default function TopicMeta() {
  return <TopicTags />;
}
