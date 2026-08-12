'use client';

import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProtectedDialog from './ProtectedDialog';

/**
 * 构造 :::protected 块
 *
 * 内容中行首的 ::: 会提前闭合外层块：服务端按 /^:::\s*$/m 切块
 * （apps/api .../topics/index.js），渲染端 micromark 的闭合围栏还允许
 * 最多 3 个前导空格、且围栏可长于开头，故缩进或补冒号都拦不住。
 * 用 \ 转义首个冒号：两边都不再识别为围栏，Markdown 仍渲染出字面量 :::
 */
function buildProtectedBlock(content) {
  const body = content.replace(/\r\n?/g, '\n').replace(/^:::/gm, '\\:::');
  return `:::protected{type="reply"}\n${body}\n:::\n`;
}

export function ProtectedTool({ editor, disabled }) {
  const [open, setOpen] = useState(false);
  const [initialContent, setInitialContent] = useState('');

  // 打开时把当前选区带入弹窗，确认后整体替换该选区
  const handleOpen = () => {
    setInitialContent(editor.getSelection());
    setOpen(true);
  };

  const handleConfirm = (content) => {
    editor.replaceSelection(buildProtectedBlock(content), true);
    setOpen(false);
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={handleOpen}
        disabled={disabled}
        title="回复可见"
      >
        <ShieldCheck className="h-4 w-4" />
      </Button>
      <ProtectedDialog
        open={open}
        onOpenChange={setOpen}
        initialContent={initialContent}
        onConfirm={handleConfirm}
      />
    </>
  );
}
