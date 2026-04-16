'use client';

import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, Loader2, ChevronUp, ChevronDown } from 'lucide-react';
import MarkdownRender from '@/components/common/MarkdownRender';
import MarkdownEditor from '@/components/common/MarkdownEditor';

/**
 * 回复正文内容 + 折叠/展开 + 编辑模式
 * 原子组件
 *
 * @param {Object} props
 * @param {string} props.content - 回复内容（Markdown）
 * @param {boolean} props.isEditing - 是否处于编辑模式
 * @param {string} props.editContent - 编辑内容
 * @param {Function} props.onEditChange - 编辑内容变化回调
 * @param {Function} props.onSubmitEdit - 提交编辑回调
 * @param {Function} props.onCancelEdit - 取消编辑回调
 * @param {boolean} props.isSubmittingEdit - 是否正在提交编辑
 */
export default function ReplyBody({
  content,
  isEditing,
  editContent,
  onEditChange,
  onSubmitEdit,
  onCancelEdit,
  isSubmittingEdit,
}) {
  const contentRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsCollapse, setNeedsCollapse] = useState(false);
  const [hasCheckedHeight, setHasCheckedHeight] = useState(false);

  useEffect(() => {
    if (contentRef.current) {
      setNeedsCollapse(contentRef.current.scrollHeight > 300);
      setHasCheckedHeight(true);
    }
  }, [content]);

  if (isEditing) {
    return (
      <div className='bg-muted/30 rounded-lg p-3 sm:p-4 border border-border/50'>
        <div className='flex items-center justify-between text-xs text-muted-foreground mb-2'>
          <span className="flex items-center gap-1"><Pencil className="h-3 w-3" /> 编辑回复</span>
        </div>
        <MarkdownEditor
          editorClassName='min-h-30'
          placeholder='编辑回复内容...'
          value={editContent}
          onChange={onEditChange}
          disabled={isSubmittingEdit}
          minimal
          autoFocus
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault();
              onSubmitEdit();
            }
          }}
          uploadType="topics"
        />
        <div className='flex items-center justify-end gap-2 mt-3'>
          <Button variant='ghost' size='sm' onClick={onCancelEdit} disabled={isSubmittingEdit} className="h-8">取消</Button>
          <Button size='sm' onClick={onSubmitEdit} disabled={isSubmittingEdit || !editContent.trim()} className="h-8">
            {isSubmittingEdit ? (<><Loader2 className='h-3.5 w-3.5 mr-1.5 animate-spin' />保存中...</>) : '保存修改'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={contentRef}
        className={`max-w-none prose prose-stone dark:prose-invert prose-sm sm:prose-base wrap-break-word transition-all duration-300 ${(!hasCheckedHeight || (!isExpanded && needsCollapse)) ? 'max-h-75 overflow-hidden' : ''}`}
        style={{
          maskImage: hasCheckedHeight && !isExpanded && needsCollapse ? 'linear-gradient(to bottom, black 70%, transparent 100%)' : 'none',
          WebkitMaskImage: hasCheckedHeight && !isExpanded && needsCollapse ? 'linear-gradient(to bottom, black 70%, transparent 100%)' : 'none',
        }}
      >
        <MarkdownRender content={content} />
      </div>
      {needsCollapse && (
        <Button variant="ghost" size="sm" className="w-full mt-2 h-8 text-xs text-muted-foreground hover:bg-transparent hover:text-primary gap-1.5" onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? (<><ChevronUp className="h-3.5 w-3.5" /> 收起</>) : (<><ChevronDown className="h-3.5 w-3.5" /> 展开全部</>)}
        </Button>
      )}
    </div>
  );
}
