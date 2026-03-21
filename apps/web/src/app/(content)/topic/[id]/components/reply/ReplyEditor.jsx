'use client';

import MarkdownEditor from '@/components/common/MarkdownEditor';
import { Button } from '@/components/ui/button';
import { Pencil, Loader2 } from 'lucide-react';

export default function ReplyEditor({
  editContent,
  setEditContent,
  isSubmittingEdit,
  handleCancelEdit,
  handleSubmitEdit,
}) {
  return (
    <div className='bg-muted/30 rounded-lg p-3 sm:p-4 border border-border/50'>
      <div className='flex items-center justify-between text-xs text-muted-foreground mb-2'>
        <span className="flex items-center gap-1">
          <Pencil className="h-3 w-3" />
          编辑回复
        </span>
      </div>
      <MarkdownEditor
        editorClassName='min-h-30'
        placeholder='编辑回复内容...'
        value={editContent}
        onChange={setEditContent}
        disabled={isSubmittingEdit}
        minimal={true}
        autoFocus
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            handleSubmitEdit();
          }
        }}
        uploadType="topics"
      />
      <div className='flex items-center justify-end gap-2 mt-3'>
        <Button
          variant='ghost'
          size='sm'
          onClick={handleCancelEdit}
          disabled={isSubmittingEdit}
          className="h-8"
        >
          取消
        </Button>
        <Button
          size='sm'
          onClick={handleSubmitEdit}
          disabled={isSubmittingEdit || !editContent.trim()}
          className="h-8"
        >
          {isSubmittingEdit ? (
            <>
              <Loader2 className='h-3.5 w-3.5 mr-1.5 animate-spin' />
              保存中...
            </>
          ) : (
            '保存修改'
          )}
        </Button>
      </div>
    </div>
  );
}
