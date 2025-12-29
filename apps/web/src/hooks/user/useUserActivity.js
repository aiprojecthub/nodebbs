'use client';

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { topicApi, postApi } from '@/lib/api';

/**
 * 用户活动 Tab Hook
 * 管理 Tab 切换、分页和数据加载
 */
export function useUserActivity({
  userId,
  initialTab = 'topics',
  initialTopics = [],
  initialPosts = [],
  topicsTotal = 0,
  postsTotal = 0,
  currentPage = 1,
  limit = 20,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 话题状态
  const [topics, setTopics] = useState(initialTopics);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [topicsPageTotal, setTopicsPageTotal] = useState(topicsTotal);

  // 回复状态
  const [posts, setPosts] = useState(initialPosts);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [postsPageTotal, setPostsPageTotal] = useState(postsTotal);

  // 当前 Tab
  const [activeTab, setActiveTab] = useState(initialTab);

  /**
   * 更新 URL 参数
   */
  const updateURL = useCallback((tab, page = 1) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', tab);
    if (page > 1) {
      params.set('page', page.toString());
    } else {
      params.delete('page');
    }
    router.push(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  /**
   * 获取话题列表
   */
  const fetchTopics = useCallback(async (page = 1) => {
    setIsLoadingTopics(true);
    try {
      const data = await topicApi.getList({
        userId,
        page,
        limit,
      });
      setTopics(data.items || []);
      setTopicsPageTotal(data.total || 0);
    } catch (error) {
      console.error('获取话题失败:', error);
    } finally {
      setIsLoadingTopics(false);
    }
  }, [userId, limit]);

  /**
   * 获取回复列表
   */
  const fetchPosts = useCallback(async (page = 1) => {
    setIsLoadingPosts(true);
    try {
      const data = await postApi.getByUser(userId, page, limit);
      setPosts(data.items || []);
      setPostsPageTotal(data.total || 0);
    } catch (error) {
      console.error('获取回复失败:', error);
    } finally {
      setIsLoadingPosts(false);
    }
  }, [userId, limit]);

  /**
   * 处理 Tab 切换
   */
  const handleTabChange = useCallback((value) => {
    setActiveTab(value);
    updateURL(value, 1);

    // 如果切换到标签且没有数据，则加载
    if (value === 'posts' && posts.length === 0) {
      fetchPosts(1);
    } else if (value === 'topics' && topics.length === 0) {
      fetchTopics(1);
    }
  }, [updateURL, posts.length, topics.length, fetchPosts, fetchTopics]);

  /**
   * 处理话题分页
   */
  const handleTopicsPageChange = useCallback((page) => {
    updateURL('topics', page);
    fetchTopics(page);
  }, [updateURL, fetchTopics]);

  /**
   * 处理回复分页
   */
  const handlePostsPageChange = useCallback((page) => {
    updateURL('posts', page);
    fetchPosts(page);
  }, [updateURL, fetchPosts]);

  return {
    // ===== 状态 =====
    /** 当前激活的 Tab（'topics' | 'posts'） */
    activeTab,
    /** 话题列表数据 */
    topics,
    /** 回复列表数据 */
    posts,
    /** 话题列表加载中 */
    isLoadingTopics,
    /** 回复列表加载中 */
    isLoadingPosts,
    /** 话题总数 */
    topicsPageTotal,
    /** 回复总数 */
    postsPageTotal,
    /** 当前页码 */
    currentPage,
    /** 每页数量 */
    limit,
    // ===== 回调函数 =====
    /** 切换 Tab 回调 */
    handleTabChange,
    /** 话题分页切换回调 */
    handleTopicsPageChange,
    /** 回复分页切换回调 */
    handlePostsPageChange,
  };
}
