'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import LotteryFormTab from './LotteryFormTab';
import DraftsTab from './DraftsTab';
import BoundTab from './BoundTab';

/**
 * 抽奖创建/编辑/复用对话框
 * Tab 式布局，与 PollDialog 同结构。
 */
export default function LotteryDialog({ open, onOpenChange, onCreated, topicId, onCloseAutoFocus }) {
  const [activeTab, setActiveTab] = useState('new');
  const [editingDraft, setEditingDraft] = useState(null);
  const [draftsRefreshKey, setDraftsRefreshKey] = useState(0);

  const handleOpenChange = (next) => {
    // 关闭时不重置 state — 让淡出动画播完，否则会闪烁
    onOpenChange?.(next);
  };

  // 每次打开都从"新建" tab 开始（外部 setOpen(true) 不触发 onOpenChange，故用 effect 监听）
  useEffect(() => {
    if (open) {
      setActiveTab('new');
      setEditingDraft(null);
    }
  }, [open]);

  const handleFormSubmitted = (lotteryId, wasEditing) => {
    if (wasEditing) {
      setEditingDraft(null);
      setDraftsRefreshKey((k) => k + 1);
    } else {
      onCreated?.(lotteryId);
      handleOpenChange(false);
    }
  };

  const handleEditDraft = (draft) => {
    setEditingDraft(draft);
    setActiveTab('new');
  };

  const handleInsert = (lotteryId) => {
    onCreated?.(lotteryId);
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" onCloseAutoFocus={onCloseAutoFocus}>
        <DialogHeader>
          <DialogTitle>
            {editingDraft ? `编辑草稿 #${editingDraft.id}` : '插入抽奖'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={topicId ? 'grid grid-cols-3 w-full' : 'grid grid-cols-2 w-full'}>
            <TabsTrigger value="new">新建</TabsTrigger>
            <TabsTrigger value="drafts">草稿</TabsTrigger>
            {topicId && <TabsTrigger value="bound">本话题已有</TabsTrigger>}
          </TabsList>

          <TabsContent value="new">
            <LotteryFormTab
              editingDraft={editingDraft}
              onSubmitted={handleFormSubmitted}
              onCancelEdit={() => setEditingDraft(null)}
            />
          </TabsContent>

          <TabsContent value="drafts">
            <DraftsTab
              refreshKey={draftsRefreshKey}
              onInsert={handleInsert}
              onEdit={handleEditDraft}
            />
          </TabsContent>

          {topicId && (
            <TabsContent value="bound">
              <BoundTab topicId={topicId} onInsert={handleInsert} />
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
