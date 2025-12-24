'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import MarkdownEditor from '../common/MarkdownEditor';
import CategorySelector from '@/components/topic/CategorySelector';
import { toast } from 'sonner';
import { X, AlertCircle, Loader2, Tag as TagIcon } from 'lucide-react';

/**
 * 话题表单组件 - 用于创建和编辑话题
 * @param {Object} props
 * @param {Object} props.initialData - 初始数据（编辑模式）
 * @param {Function} props.onSubmit - 提交回调
 * @param {Function} props.onCancel - 取消回调
 * @param {boolean} props.isSubmitting - 是否正在提交
 * @param {string} props.submitButtonText - 提交按钮文本
 * @param {boolean} props.isEditMode - 是否为编辑模式
 */
export default function TopicForm({
  initialData = {},
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitButtonText = '发布话题',
  isEditMode = false,
}) {
  const [formData, setFormData] = useState({
    title: initialData.title || '',
    content: initialData.content || '',
    categoryId: initialData.categoryId || '',
    tags: initialData.tags || [],
  });
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState({});

  // 当初始数据变化时更新表单
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



  const validateForm = () => {
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    await onSubmit(formData);
  };

  const addTag = () => {
    if (
      tagInput.trim() &&
      !formData.tags.includes(tagInput.trim()) &&
      formData.tags.length < 5
    ) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((tag) => tag !== tagToRemove),
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const isFormValid =
    formData.title.trim() && formData.content.trim() && formData.categoryId;

  return (
    <form onSubmit={handleSubmit}>
      <div className='flex flex-col lg:flex-row gap-6'>
        {/* 主内容区 */}
        <div className='flex-1 space-y-4'>
          {/* 标题输入 */}
          <div className='space-y-2'>
            <label htmlFor='title' className='block text-sm font-semibold'>
              标题
            </label>
            <Input
              id='title'
              type='text'
              value={formData.title}
              onChange={(e) => {
                setFormData({ ...formData, title: e.target.value });
                if (errors.title) setErrors({ ...errors, title: '' });
              }}
              className='text-base'
              placeholder='输入一个清晰、简洁的标题...'
              maxLength={100}
              aria-invalid={!!errors.title}
              autoFocus={!isEditMode}
            />
            {errors.title && (
              <p className='text-sm text-destructive flex items-center gap-1'>
                <AlertCircle className='h-3 w-3' />
                <span>{errors.title}</span>
              </p>
            )}
          </div>

          {/* 内容输入 */}
          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <label htmlFor='content' className='text-sm font-semibold'>
                内容
              </label>
            </div>

            <MarkdownEditor
              value={formData.content}
              onChange={(value) => {
                setFormData({ ...formData, content: value });
                if (errors.content) setErrors({ ...errors, content: '' });
              }}
              placeholder='详细描述你的话题内容，支持 Markdown 格式...'
              className={errors.content ? 'border-destructive' : ''}
            />

            {errors.content && (
              <p className='text-sm text-destructive flex items-center gap-1'>
                <AlertCircle className='h-3 w-3' />
                <span>{errors.content}</span>
              </p>
            )}
            <p className='text-xs text-muted-foreground'>支持 Markdown 格式</p>
          </div>
        </div>

        {/* 右侧边栏 - Sticky定位 */}
        <div className='w-full lg:w-80 shrink-0'>
          <aside className='lg:sticky lg:top-[157px] space-y-4'>
            {/* 分类选择 */}
            <div className='border border-border rounded-lg bg-card'>
              <div className='px-3 py-2 border-b border-border'>
                <h3 className='text-sm font-semibold'>分类</h3>
              </div>
              <div className='p-3'>
                <CategorySelector
                  value={formData.categoryId}
                  onChange={(value) => {
                    setFormData({ ...formData, categoryId: value });
                    if (errors.category) setErrors({ ...errors, category: '' });
                  }}
                  placeholder='选择一个分类'
                  className='w-full'
                />
                {errors.category && (
                  <p className='text-xs text-destructive mt-2 flex items-center gap-1'>
                    <AlertCircle className='h-3 w-3' />
                    <span>{errors.category}</span>
                  </p>
                )}
              </div>
            </div>

            {/* 标签 */}
            <div className='border border-border rounded-lg bg-card'>
              <div className='px-3 py-2 border-b border-border'>
                <div className='flex items-center justify-between'>
                  <h3 className='text-sm font-semibold'>标签</h3>
                  <span className='text-xs text-muted-foreground'>
                    {formData.tags.length}/5
                  </span>
                </div>
              </div>
              <div className='p-3'>
                {formData.tags.length > 0 && (
                  <div className='flex flex-wrap gap-2 mb-3'>
                    {formData.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant='secondary'
                        className='flex items-center gap-1 px-2 py-1'
                      >
                        <span>{tag}</span>
                        <button
                          type='button'
                          onClick={() => removeTag(tag)}
                          className='hover:text-destructive transition-colors'
                        >
                          <X className='h-3 w-3' />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                <div className='space-y-2'>
                  <div className="relative">
                    <TagIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id='tag-input'
                      type='text'
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={formData.tags.length >= 5}
                      placeholder='输入标签后按回车...'
                      className='text-sm pl-9'
                    />
                  </div>
                  <p className='text-xs text-muted-foreground'>
                    添加有意义的标签，方便他人检索（限5个）
                  </p>
                </div>
              </div>
            </div>

            {/* 提交按钮区域 */}
            <div className='border border-border rounded-lg bg-card p-3'>
              <div className='flex flex-col gap-2'>
                <Button
                  type='submit'
                  className='w-full'
                  disabled={!isFormValid || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className='h-4 w-4 animate-spin' />
                      {isEditMode ? '保存中...' : '发布中...'}
                    </>
                  ) : (
                    submitButtonText
                  )}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  className='w-full'
                  disabled={isSubmitting}
                  onClick={onCancel}
                >
                  取消
                </Button>
              </div>
            </div>

            {/* 提示 */}
            <div className='border border-border rounded-lg bg-card p-3'>
              <h3 className='text-sm font-semibold mb-3'>
                {isEditMode ? '编辑提示' : '发布提示'}
              </h3>
              <div className='space-y-2 text-xs text-muted-foreground'>
                <p>• 使用清晰的标题描述你的话题</p>
                <p>• 提供详细的背景信息和上下文</p>
                <p>• 选择合适的分类便于他人查找</p>
                <p>• 添加相关标签提高话题可见度</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </form>
  );
}
