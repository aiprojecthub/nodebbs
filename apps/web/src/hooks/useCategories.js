import { useState, useEffect } from 'react';
import { categoryApi } from '@/lib/api';
import { toast } from 'sonner';

/**
 * 分类列表逻辑 Hook
 * 管理分类数据获取和层级结构组装
 * 
 * 设计说明：
 * - 从 API 获取扁平化的分类列表
 * - 在前端组装父子层级结构
 * - 管理 loading 和 error 状态
 *
 * @returns {Object} 分类状态和数据
 */
export function useCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  /**
   * 获取分类列表并组装层级结构
   */
  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await categoryApi.getAll();

      // 在前端组装子分类结构
      const categoryMap = new Map();
      const rootCategories = [];

      // 首先创建所有分类的映射
      data.forEach(cat => {
        categoryMap.set(cat.id, { ...cat, subcategories: [] });
      });

      // 然后组装层级结构
      data.forEach(cat => {
        const category = categoryMap.get(cat.id);
        if (cat.parentId) {
          const parent = categoryMap.get(cat.parentId);
          if (parent) {
            parent.subcategories.push(category);
          }
        } else {
          rootCategories.push(category);
        }
      });

      // 按 name 字母排序（position 只用于精选分类）
      const sortByName = (a, b) => a.name.localeCompare(b.name);

      // 递归排序每一级分类
      const sortCategories = (cats) => {
        cats.sort(sortByName);
        cats.forEach(cat => {
          if (cat.subcategories && cat.subcategories.length > 0) {
            sortCategories(cat.subcategories);
          }
        });
      };
      sortCategories(rootCategories);

      // 递归计算包含子分类的话题总数
      const calculateTotalStats = (category) => {
        let total = category.topicCount || 0;
        
        if (category.subcategories && category.subcategories.length > 0) {
          category.subcategories.forEach(sub => {
            total += calculateTotalStats(sub);
          });
        }
        
        category.totalTopics = total;
        return total;
      };

      rootCategories.forEach(calculateTotalStats);

      setCategories(rootCategories);
    } catch (err) {
      setError(err);
      toast.error(err.message || '获取分类列表失败');
    } finally {
      setLoading(false);
    }
  };

  return {
    /** 分类列表（树形结构） */
    categories,
    /** 加载状态 */
    loading,
    /** 错误信息 */
    error,
    /** 重新获取数据 */
    refresh: fetchCategories,
  };
}
