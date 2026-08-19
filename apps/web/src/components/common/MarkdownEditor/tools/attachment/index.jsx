'use client';

import { useState, useRef } from 'react';
import { Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AttachmentDialog from '@/modules/forum/components/topic/AttachmentDialog';
import { usePermission } from '@/hooks/usePermission';

export function AttachmentTool({ editor, disabled, config }) {
  const { hasPermission } = usePermission();
  const [open, setOpen] = useState(false);
  const pendingIdRef = useRef(null);

  // 无上传附件权限时不显示按钮
  if (!hasPermission('upload.attachments')) {
    return null;
  }

  // AttachmentDialog 是先回调 onCreated、后关闭弹窗，此刻焦点仍被 Dialog trap，
  // 直接插入会让 execCommand 落空并清空撤销历史，故只暂存 id
  const handleCreated = (attachmentId) => {
    pendingIdRef.current = attachmentId;
  };

  // 焦点锁解除后再插入，并阻止焦点回到触发按钮，让光标落回编辑器。
  // 一条指令即一个附件（组），组内可含多个文件
  const handleCloseAutoFocus = (e) => {
    const attachmentId = pendingIdRef.current;
    if (attachmentId == null) return;
    pendingIdRef.current = null;
    e.preventDefault();
    editor.insertBlock(`::attachment{id="${attachmentId}"}\n`);
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => setOpen(true)}
        disabled={disabled}
        title="插入附件"
      >
        <Paperclip className="h-4 w-4" />
      </Button>
      <AttachmentDialog
        open={open}
        onOpenChange={setOpen}
        onCreated={handleCreated}
        onCloseAutoFocus={handleCloseAutoFocus}
        topicId={config?.topicId}
      />
    </>
  );
}
