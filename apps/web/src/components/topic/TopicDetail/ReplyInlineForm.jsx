'use client';

import { Button } from '@/components/ui/button';
import { Reply, Loader2 } from 'lucide-react';
import MarkdownEditor from '@/components/common/MarkdownEditor';

/**
 * 楼中楼回复表单
 * 原子组件
 *
 * @param {Object} props
 * @param {Object} props.reply - 目标回复数据
 * @param {string} props.replyContent - 回复内容
 * @param {Function} props.onReplyChange - 内容变化回调
 * @param {Function} props.onSubmit - 提交回调
 * @param {Function} props.onCancel - 取消回调
 * @param {boolean} props.submitting - 是否正在提交
 */
export default function ReplyInlineForm({
  reply,
  replyContent,
  onReplyChange,
  onSubmit,
  onCancel,
  submitting,
}) {
  return (
    <div className='opacity-100 transition-all'>
      <div className='bg-muted/30 rounded-lg p-3 sm:p-4 border border-border/50'>
        <div className='flex items-center justify-between text-xs text-muted-foreground mb-2'>
          <span className="flex items-center gap-1">
            <Reply className="h-3 w-3" /> 回复 <span className="font-medium text-foreground">@{reply.userName || reply.userUsername}</span>
          </span>
        </div>
        <MarkdownEditor
          editorClassName='min-h-30'
          placeholder='写下你的回复...'
          value={replyContent}
          onChange={onReplyChange}
          disabled={submitting}
          minimal
          autoFocus
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault();
              onSubmit();
            }
          }}
          uploadType="topics"
        />
        <div className='flex items-center justify-end gap-2 mt-3'>
          <Button variant='ghost' size='sm' onClick={onCancel} disabled={submitting} className="h-8">取消</Button>
          <Button size='sm' onClick={onSubmit} disabled={submitting || !replyContent.trim()} className="h-8">
            {submitting ? (<><Loader2 className='h-3.5 w-3.5 mr-1.5 animate-spin' /> 提交中...</>) : '发表回复'}
          </Button>
        </div>
      </div>
    </div>
  );
}
