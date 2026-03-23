'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { categoryApi } from '@/lib/api';
import { confirm } from '@/components/common/ConfirmPopover';
import { toast } from 'sonner';

const DEFAULT_FORM = {
  name: '',
  slug: '',
  description: '',
  color: '#3B82F6',
  parentId: null,
  position: 0,
  isPrivate: false,
  isFeatured: false,
};

/**
 * 分类管理 Hook（独立，不使用 useAdminList）
 * 管理分类的 CRUD、层级展示和精选排序
 */
export function useCategoryManagement() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('create');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [reordering, setReordering] = useState(false);
  const [formData, setFormData] = useState(DEFAULT_FORM);

  // ===== 数据获取 =====
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await categoryApi.getAll();
      setCategories(data);
    } catch (err) {
      console.error('获取分类失败:', err);
      toast.error('获取分类失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // ===== 表单操作 =====
  const resetForm = useCallback(() => {
    setFormData(DEFAULT_FORM);
    setSelectedCategory(null);
  }, []);

  const openCreateDialog = useCallback(() => {
    setDialogMode('create');
    resetForm();
    setShowDialog(true);
  }, [resetForm]);

  const openEditDialog = useCallback((category) => {
    setDialogMode('edit');
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      color: category.color || '#3B82F6',
      parentId: category.parentId || null,
      position: category.position !== undefined ? category.position : 0,
      isPrivate: category.isPrivate || false,
      isFeatured: category.isFeatured || false,
    });
    setShowDialog(true);
  }, []);

  // ===== 提交 =====
  const handleSubmit = useCallback(async () => {
    if (!formData.name.trim()) {
      toast.error('请输入分类名称');
      return;
    }

    setSubmitting(true);
    try {
      if (dialogMode === 'create') {
        await categoryApi.create(formData);
        toast.success('分类创建成功');
      } else {
        await categoryApi.update(selectedCategory.id, formData);
        toast.success('分类更新成功');
      }
      setShowDialog(false);
      resetForm();
      fetchCategories();
    } catch (err) {
      console.error(`${dialogMode === 'create' ? '创建' : '更新'}分类失败:`, err);
      toast.error(`${dialogMode === 'create' ? '创建' : '更新'}失败：` + err.message);
    } finally {
      setSubmitting(false);
    }
  }, [formData, dialogMode, selectedCategory, resetForm, fetchCategories]);

  // ===== 删除 =====
  const handleDeleteClick = useCallback(
    async (e, category) => {
      const confirmed = await confirm(e, {
        title: '确认删除？',
        description: (
          <>
            确定要删除分类 &quot;{category.name}&quot; 吗？此操作不可撤销。
            {category.topicCount > 0 && (
              <span className='block mt-2 text-destructive'>
                注意：该分类下有 {category.topicCount} 个话题，无法删除。
              </span>
            )}
          </>
        ),
        confirmText: '删除',
        variant: 'destructive',
        confirmDisabled: category.topicCount > 0,
        className: 'w-96',
      });

      if (!confirmed) return;

      setSubmitting(true);
      try {
        await categoryApi.delete(category.id);
        toast.success('分类删除成功');
        setSelectedCategory(null);
        fetchCategories();
      } catch (err) {
        console.error('删除分类失败:', err);
        toast.error(err.message || '删除失败');
      } finally {
        setSubmitting(false);
      }
    },
    [fetchCategories]
  );

  // ===== 层级展开 =====
  const flattenCategories = useCallback((cats) => {
    const result = [];
    const categoryMap = new Map();
    cats.forEach((cat) => categoryMap.set(cat.id, cat));

    const calculateLevel = (catId, visited = new Set()) => {
      if (visited.has(catId)) return 0;
      visited.add(catId);
      const cat = categoryMap.get(catId);
      if (!cat || !cat.parentId) return 0;
      const parent = categoryMap.get(cat.parentId);
      if (!parent) return 0;
      return 1 + calculateLevel(cat.parentId, visited);
    };

    const sortByName = (a, b) => a.name.localeCompare(b.name);

    const addCategoryAndChildren = (parentId) => {
      const children = cats
        .filter((cat) =>
          parentId === null
            ? cat.parentId === null || cat.parentId === undefined
            : cat.parentId === parentId
        )
        .sort(sortByName);

      children.forEach((cat) => {
        const level = calculateLevel(cat.id);
        result.push({ ...cat, level });
        addCategoryAndChildren(cat.id);
      });
    };

    addCategoryAndChildren(null);
    return result;
  }, []);

  const flatCategories = useMemo(
    () => flattenCategories(categories),
    [categories, flattenCategories]
  );

  const featuredCategories = useMemo(
    () =>
      categories
        .filter((c) => c.isFeatured)
        .sort((a, b) => (a.position || 0) - (b.position || 0)),
    [categories]
  );

  // ===== 精选排序 =====
  const handleReorder = useCallback(
    async (newOrder) => {
      setReordering(true);
      try {
        const items = newOrder.map((id, index) => ({ id, position: index }));
        await categoryApi.batchReorder(items);
        toast.success('排序已保存');
        fetchCategories();
      } catch (err) {
        console.error('更新排序失败:', err);
        toast.error(err.message || '排序保存失败');
      } finally {
        setReordering(false);
      }
    },
    [fetchCategories]
  );

  return {
    // 数据
    categories,
    flatCategories,
    featuredCategories,
    loading,
    // Tab
    activeTab,
    setActiveTab,
    // 表单
    showDialog,
    setShowDialog,
    dialogMode,
    selectedCategory,
    submitting,
    formData,
    setFormData,
    reordering,
    // 操作
    openCreateDialog,
    openEditDialog,
    handleSubmit,
    handleDeleteClick,
    handleReorder,
  };
}
