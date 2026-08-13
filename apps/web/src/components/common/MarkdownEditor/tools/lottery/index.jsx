'use client';

import { useState, useRef } from 'react';
import { Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LotteryDialog from '@/modules/forum/components/topic/LotteryDialog';
import { usePermission } from '@/hooks/usePermission';

export function LotteryTool({ editor, disabled, config }) {
  const { hasPermission } = usePermission();
  const [open, setOpen] = useState(false);
  const pendingIdRef = useRef(null);

  if (!hasPermission('topic.lottery.create')) {
    return null;
  }

  // LotteryDialog 是先回调 onCreated、后关闭弹窗，此刻焦点仍被 Dialog trap，
  // 直接插入会让 execCommand 落空并清空撤销历史，故只暂存 id
  const handleCreated = (lotteryId) => {
    pendingIdRef.current = lotteryId;
  };

  // 焦点锁解除后再插入，并阻止焦点回到触发按钮，让光标落回编辑器
  const handleCloseAutoFocus = (e) => {
    const lotteryId = pendingIdRef.current;
    if (lotteryId == null) return;
    pendingIdRef.current = null;
    e.preventDefault();
    editor.insertBlock(`::lottery{id="${lotteryId}"}\n`);
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
        title="插入抽奖"
      >
        <Gift className="h-4 w-4" />
      </Button>
      <LotteryDialog
        open={open}
        onOpenChange={setOpen}
        onCreated={handleCreated}
        onCloseAutoFocus={handleCloseAutoFocus}
        topicId={config?.topicId}
      />
    </>
  );
}
