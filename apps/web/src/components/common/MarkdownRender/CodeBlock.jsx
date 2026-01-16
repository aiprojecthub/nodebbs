'use client';

import React from 'react';
import { PrismAsyncLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy } from 'lucide-react';
import CopyButton from '@/components/common/CopyButton';

export default function CodeBlock({ language, code, ...rest }) {
  return (
    <div className='relative group rounded-lg w-full max-w-full grid grid-cols-1 min-w-0'>
      <CopyButton
        value={code}
        variant='ghost'
        size='sm'
        className='absolute text-accent right-2 top-2 shrink opacity-0 group-hover:opacity-100 transition z-10'
      >
        {({ copied }) => (copied ? '已复制' : <Copy className='w-4 h-4' />)}
      </CopyButton>
      <SyntaxHighlighter
        {...rest}
        language={language}
        style={tomorrow}
        customStyle={{ margin: 0, overflowX: 'auto', maxWidth: '100%' }}
        PreTag='div'
        className='rounded-xl border-[3px] border-border overflow-x-auto max-w-full min-w-0'
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
