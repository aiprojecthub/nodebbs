'use client';

import MarkdownEditor from '@/components/common/MarkdownEditor';
import { Button } from '@/components/ui/button';
import { Reply, Loader2 } from 'lucide-react';

export default function ReplyInput({
  reply,
  replyingToPostId,
  setReplyingToPostId,
  replyToContent,
  setReplyToContent,
  submitting,
  handleSubmitReplyToPost
}) {
  if (replyingToPostId !== reply.id) return null;

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmitReplyToPost(reply.id);
    }
  };

  return (
    <div className='px-4 sm:px-6 pb-5 pt-0 opacity-100 transition-all'>
      <div className='bg-muted/30 rounded-lg p-3 sm:p-4 border border-border/50'>
        <div className='flex items-center justify-between text-xs text-muted-foreground mb-2'>
          <span className="flex items-center gap-1">
            <Reply className="h-3 w-3" />
            回复 <span className="font-medium text-foreground">@{reply.userName || reply.userUsername}</span>
          </span>
        </div>
        <MarkdownEditor
          editorClassName='min-h-30'
          placeholder='写下你的回复...'
          value={replyToContent}
          onChange={setReplyToContent}
          disabled={submitting}
          minimal={true}
          autoFocus
          onKeyDown={handleKeyDown}
          uploadType="topics"
        />
        <div className='flex items-center justify-end gap-2 mt-3'>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => {
              setReplyingToPostId(null);
              setReplyToContent('');
            }}
            disabled={submitting}
            className="h-8"
          >
            取消
          </Button>
          <Button
            size='sm'
            onClick={() => handleSubmitReplyToPost(reply.id)}
            disabled={submitting || !replyToContent.trim()}
            className="h-8"
          >
            {submitting ? (
              <>
                <Loader2 className='h-3.5 w-3.5 mr-1.5 animate-spin' />
                提交中...
              </>
            ) : (
              '发表回复'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
