'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { confirm } from '@/components/common/ConfirmPopover';
import { pagesApi } from '@/lib/api';
import { useAdminList } from './useAdminList';

export const PAGE_TYPES = ['html', 'markdown', 'text', 'json'];

const RESERVED_SLUG_PREFIXES = [
  'api',
  'auth',
  'dashboard',
  'profile',
  'create',
  'categories',
  'tags',
  'topic',
  'users',
  'search',
  'about',
  'reference',
  'uploads',
  'docs',
  '_next',
  'not-found-render',
  'page-render',
];

const DEFAULT_FORM = {
  title: '',
  slug: '',
  type: 'text',
  content: '',
  isPublished: false,
  standalone: false,
};

function normalizeSlugInput(value) {
  return String(value || '')
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .replace(/\/{2,}/g, '/')
    .toLowerCase();
}

function isReservedSlug(slug) {
  return RESERVED_SLUG_PREFIXES.some((prefix) => (
    slug === prefix || slug.startsWith(`${prefix}/`)
  ));
}

function validateForm(formData) {
  const normalizedSlug = normalizeSlugInput(formData.slug);

  if (!formData.title.trim()) {
    throw new Error('请输入页面标题');
  }

  if (!normalizedSlug) {
    throw new Error('请输入页面路径');
  }

  if (!/^[a-z0-9._/-]+$/.test(normalizedSlug)) {
    throw new Error('页面路径仅支持小写字母、数字、点、下划线、短横线和斜杠');
  }

  if (normalizedSlug.includes('..')) {
    throw new Error('页面路径不能包含连续点号');
  }

  if (isReservedSlug(normalizedSlug)) {
    throw new Error('页面路径与系统路由冲突，请更换');
  }

  if (!formData.content) {
    throw new Error('请输入页面内容');
  }

  if (formData.type === 'json') {
    JSON.parse(formData.content);
  }

  return {
    title: formData.title.trim(),
    slug: normalizedSlug,
    type: formData.type,
    content: formData.content,
    isPublished: Boolean(formData.isPublished),
    standalone: Boolean(formData.standalone),
  };
}

export function usePageManagement() {
  const list = useAdminList({
    fetchFn: async (params) => {
      const apiParams = {
        page: params.page,
        limit: params.limit,
      };

      if (params.search) {
        apiParams.search = params.search;
      }

      if (params.typeFilter && params.typeFilter !== 'all') {
        apiParams.type = params.typeFilter;
      }

      if (params.statusFilter && params.statusFilter !== 'all') {
        apiParams.status = params.statusFilter;
      }

      return pagesApi.admin.getList(apiParams);
    },
    pageSize: 20,
    debounceMs: 400,
    defaultFilters: {
      typeFilter: 'all',
      statusFilter: 'all',
    },
  });

  const {
    items,
    page,
    filters,
    setPage,
    updateItem,
    removeItem,
    refreshList,
  } = list;

  const [submitting, setSubmitting] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('create');
  const [selectedPage, setSelectedPage] = useState(null);
  const [formData, setFormData] = useState(DEFAULT_FORM);

  const openCreateDialog = useCallback(() => {
    setDialogMode('create');
    setSelectedPage(null);
    setFormData(DEFAULT_FORM);
    setShowDialog(true);
  }, []);

  const openEditDialog = useCallback((pageItem) => {
    setDialogMode('edit');
    setSelectedPage(pageItem);
    setFormData({
      title: pageItem.title || '',
      slug: pageItem.slug || '',
      type: pageItem.type || 'text',
      content: pageItem.content || '',
      isPublished: Boolean(pageItem.isPublished),
      standalone: Boolean(pageItem.standalone),
    });
    setShowDialog(true);
  }, []);

  const handleTypeChange = useCallback((value) => {
    setFormData((prev) => ({
      ...prev,
      type: value,
      ...(!['html', 'markdown'].includes(value) && { standalone: false }),
    }));
  }, []);

  const handleSubmit = useCallback(async () => {
    let payload;

    try {
      payload = validateForm(formData);
    } catch (error) {
      toast.error(
        error instanceof SyntaxError
          ? 'JSON 页面内容不是合法 JSON'
          : error.message || '表单校验失败'
      );
      return;
    }

    setSubmitting(true);

    try {
      if (dialogMode === 'create') {
        await pagesApi.admin.create(payload);
        toast.success('页面创建成功');
      } else {
        await pagesApi.admin.update(selectedPage.id, payload);
        toast.success('页面更新成功');
      }

      setShowDialog(false);
      setSelectedPage(null);
      setFormData(DEFAULT_FORM);
      refreshList();
    } catch (error) {
      console.error('保存页面失败:', error);
      toast.error(error.message || '保存页面失败');
    } finally {
      setSubmitting(false);
    }
  }, [dialogMode, formData, refreshList, selectedPage]);

  const handleDelete = useCallback(async (e, pageItem) => {
    const confirmed = await confirm(e, {
      title: '确认删除页面？',
      description: `确定要删除页面“${pageItem.title}”吗？此操作不可恢复。`,
      confirmText: '删除',
      variant: 'destructive',
    });

    if (!confirmed) {
      return;
    }

    setSubmitting(true);

    try {
      await pagesApi.admin.delete(pageItem.id);
      toast.success('页面已删除');

      if (items.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        removeItem(pageItem.id);
      }
    } catch (error) {
      console.error('删除页面失败:', error);
      toast.error(error.message || '删除页面失败');
    } finally {
      setSubmitting(false);
    }
  }, [items.length, page, removeItem, setPage]);

  const handleTogglePublished = useCallback(async (pageItem, nextPublished) => {
    updateItem(pageItem.id, {
      isPublished: nextPublished,
      _statusUpdating: true,
    });

    try {
      await pagesApi.admin.update(pageItem.id, {
        isPublished: nextPublished,
      });

      if (
        (filters.statusFilter === 'published' && !nextPublished) ||
        (filters.statusFilter === 'draft' && nextPublished)
      ) {
        removeItem(pageItem.id);
      } else {
        updateItem(pageItem.id, {
          isPublished: nextPublished,
          _statusUpdating: false,
        });
      }

      toast.success(nextPublished ? '页面已发布' : '页面已设为草稿');
    } catch (error) {
      console.error('切换页面状态失败:', error);
      toast.error(error.message || '切换页面状态失败');
      updateItem(pageItem.id, {
        isPublished: pageItem.isPublished,
        _statusUpdating: false,
      });
    }
  }, [filters.statusFilter, removeItem, updateItem]);

  return {
    ...list,
    PAGE_TYPES,
    submitting,
    showDialog,
    dialogMode,
    selectedPage,
    formData,
    setFormData,
    setShowDialog,
    openCreateDialog,
    openEditDialog,
    handleTypeChange,
    handleSubmit,
    handleDelete,
    handleTogglePublished,
  };
}
