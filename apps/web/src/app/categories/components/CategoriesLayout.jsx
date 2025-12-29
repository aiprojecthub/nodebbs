'use client';

import { useCategories } from '@/hooks/useCategories';
import { CategoriesUI } from './CategoriesUI';

/**
 * 分类页面布局组件
 * 消费 useCategories Hook，将数据传递给 CategoriesUI
 */
export default function CategoriesLayout() {
  const { categories, loading, error } = useCategories();

  return (
    <CategoriesUI
      categories={categories}
      loading={loading}
      error={error}
    />
  );
}
