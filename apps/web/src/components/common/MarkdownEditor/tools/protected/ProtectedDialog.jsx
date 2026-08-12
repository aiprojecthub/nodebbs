'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

/**
 * 回复可见内容编辑对话框
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {(open:boolean)=>void} props.onOpenChange
 * @param {string} props.initialContent - 打开时预填的内容（通常是编辑器中的选区）
 * @param {(content:string)=>void} props.onConfirm - 确认后回调，参数为去除首尾空白的内容
 */
export default function ProtectedDialog({ open, onOpenChange, initialContent = '', onConfirm }) {
  const [content, setContent] = useState('');

  // 每次打开时同步预填内容（关闭时不重置，避免淡出动画期间闪烁）
  useEffect(() => {
    if (open) {
      setContent(initialContent);
    }
  }, [open, initialContent]);

  const handleConfirm = () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    onConfirm?.(trimmed);
  };

  // 多行输入：Enter 换行，Ctrl / ⌘ + Enter 确认
  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>插入回复可见内容</DialogTitle>
          <DialogDescription>
            读者回复本话题后才能看到这段内容，作者与管理员始终可见。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="protected-content">隐藏内容</Label>
          <Textarea
            id="protected-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入需要隐藏的内容，支持 Markdown"
            className="min-h-40 max-h-[50vh] overflow-y-auto"
            autoFocus
          />
          <p className="text-xs text-muted-foreground">Ctrl / ⌘ + Enter 快速插入</p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)}>
            取消
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!content.trim()}>
            插入
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
