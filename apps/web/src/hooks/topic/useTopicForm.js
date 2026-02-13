'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * 话题表单 Hook
 * 管理表单状态、验证和标签操作
 *
 * @param {Object} options - 配置选项
 * @param {Object} options.initialData - 初始数据（编辑模式）
 * @param {Function} options.onSubmit - 提交回调
 */
export function useTopicForm({ initialData = {}, onSubmit }) {
  // ===== 表单数据状态 =====
  const [formData, setFormData] = useState({
    title: initialData.title || '',
    content: initialData.content || '',
    categoryId: initialData.categoryId || '',
    tags: initialData.tags || [],
  });

  // ===== 错误状态 =====
  const [errors, setErrors] = useState({});

  // ===== 同步初始数据变化 =====
  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        content: initialData.content || '',
        categoryId: initialData.categoryId || '',
        tags: initialData.tags || [],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    initialData?.title,
    initialData?.content,
    initialData?.categoryId,
    initialData?.tags?.length,
  ]);

  // ===== 表单验证 =====
  const validateForm = useCallback(() => {
    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = '请输入话题标题';
    } else if (formData.title.length < 5) {
      newErrors.title = '标题至少需要5个字符';
    }
    if (!formData.content.trim()) {
      newErrors.content = '请输入话题内容';
    } else if (formData.content.length < 10) {
      newErrors.content = '内容至少需要10个字符';
    }
    if (!formData.categoryId) {
      newErrors.category = '请选择一个分类';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData.title, formData.content, formData.categoryId]);

  // ===== 表单提交 =====
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    await onSubmit(formData);
  }, [validateForm, onSubmit, formData]);

  // ===== 字段更新 =====
  const updateField = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // 清除对应字段的错误
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

  // ===== 派生状态 =====
  /** 表单是否有效（可提交） */
  const isFormValid = useMemo(() => {
    return formData.title.trim() && formData.content.trim() && formData.categoryId;
  }, [formData.title, formData.content, formData.categoryId]);

  return {
    // ===== 表单数据 =====
    /** 表单数据对象 */
    formData,
    /** 表单验证错误 */
    errors,

    // ===== 表单操作 =====
    /** 提交表单 */
    handleSubmit,
    /** 更新单个字段 */
    updateField,

    // ===== 派生状态 =====
    /** 表单是否有效 */
    isFormValid,
  };
}
