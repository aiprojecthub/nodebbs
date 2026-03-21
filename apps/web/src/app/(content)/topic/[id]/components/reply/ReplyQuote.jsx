'use client';

import { useState } from 'react';
import { Reply, ChevronUp, ChevronDown, Loader2, AlertCircle } from 'lucide-react';
import MarkdownRender from '@/components/common/MarkdownRender';
import { postApi } from '@/lib/api';

export default function ReplyQuote({ reply }) {
  const [quoteExpanded, setQuoteExpanded] = useState(false);
  const [quoteContent, setQuoteContent] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  const handleQuoteToggle = async () => {
    if (quoteExpanded) { setQuoteExpanded(false); return; }
    setQuoteExpanded(true);
    if (quoteContent !== null) return;
    setQuoteLoading(true);
    try {
      const post = await postApi.getById(reply.replyToPost.id);
      setQuoteContent(post.content);
    } catch (err) {
      setQuoteContent('');
    } finally {
      setQuoteLoading(false);
    }
  };

  if (!reply.replyToPostId || !reply.replyToPost) {
    return null;
  }

  return (
    <div className='mb-3'>
      <button
        onClick={handleQuoteToggle}
        className='text-xs text-muted-foreground/60 flex items-center gap-1.5 bg-muted/30 px-3 py-2 rounded-md border border-border/50 max-w-full hover:bg-muted/50 hover:text-muted-foreground transition-colors cursor-pointer'
      >
        <Reply className='h-3 w-3 shrink-0 opacity-70' />
        <span className="shrink-0">回复</span>
        <span className="font-mono">
          #{reply.replyToPost.postNumber}
        </span>
        <span className="truncate max-w-37.5 sm:max-w-xs">
          {reply.replyToPost.userName || reply.replyToPost.userUsername}
        </span>
        {quoteExpanded ? (
          <ChevronUp className='h-3 w-3 shrink-0 opacity-70' />
        ) : (
          <ChevronDown className='h-3 w-3 shrink-0 opacity-70' />
        )}
      </button>

      {quoteExpanded && (
        <div className='mt-1.5 border border-border/50 rounded-md bg-muted/20 overflow-hidden'>
          <div className='px-3 py-2'>
            {quoteLoading ? (
              <div className='flex items-center justify-center py-4'>
                <Loader2 className='h-4 w-4 animate-spin text-muted-foreground/50' />
              </div>
            ) : quoteContent === '' ? (
              <div className='flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground/60'>
                <AlertCircle className='h-3.5 w-3.5' />
                <span>加载失败</span>
                <button
                  onClick={() => { setQuoteContent(null); handleQuoteToggle(); }}
                  className='text-primary hover:underline cursor-pointer'
                >
                  重试
                </button>
              </div>
            ) : (
              <div className='max-h-50 overflow-y-auto prose prose-stone dark:prose-invert prose-sm max-w-none'>
                <MarkdownRender content={quoteContent} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
