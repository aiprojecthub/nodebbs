'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import MarkdownEditor from '../common/MarkdownEditor';
import CategorySelector from '@/components/topic/CategorySelector';
import { X, AlertCircle, Loader2, Tag as TagIcon } from 'lucide-react';
import { useTopicForm } from '@/hooks/topic/useTopicForm';

/**
 * 话题表单组件 - 用于创建和编辑话题
 * 纯 UI 组件，消费 useTopicForm Hook
 */
export default function TopicForm({
  initialData = {},
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitButtonText = '发布话题',
  isEditMode = false,
}) {
  // 使用 Hook 管理表单逻辑
  const {
    formData,
    tagInput,
    setTagInput,
    errors,
    handleSubmit,
    updateField,
    addTag,
    removeTag,
    handleTagInputKeyDown,
    isFormValid,
    canAddMoreTags,
  } = useTopicForm({ initialData, onSubmit });

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
              onChange={(e) => updateField('title', e.target.value)}
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
              onChange={(value) => updateField('content', value)}
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

        {/* 右侧边栏 */}
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
                  onChange={(value) => updateField('categoryId', value)}
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
                      onKeyDown={handleTagInputKeyDown}
                      disabled={!canAddMoreTags}
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
