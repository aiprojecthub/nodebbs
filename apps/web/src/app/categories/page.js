'use client';

import CategoriesLayout from './components/CategoriesLayout';

/**
 * 分类列表页面入口
 * 使用客户端组件获取和渲染分类数据
 */
export default function CategoriesPage() {
  return (
    <div className='container mx-auto px-4 py-6'>
      <CategoriesLayout />
    </div>
  );
}
