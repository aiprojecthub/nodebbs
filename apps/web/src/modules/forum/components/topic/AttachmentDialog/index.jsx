'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import UploadTab from './UploadTab';
import DraftsTab from './DraftsTab';
import BoundTab from './BoundTab';

/**
 * 附件上传/编辑/复用对话框（与 PollDialog 同构）
 * Tab 式布局：
 *  - "上传"：上传一个或多个文件并设置下载策略，整批作为**一个**附件插入
 *    （editingDraft 决定走 POST 还是 PUT）
 *  - "草稿"：当前用户未绑话题的附件，可插入/编辑/删除
 *  - "本话题已有"（仅 topicId 存在时）：当前话题已绑附件，仅"重新插入"
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {(open:boolean)=>void} props.onOpenChange
 * @param {(attachmentId:number)=>void} props.onCreated - 插入到编辑器的回调
 * @param {number|undefined} props.topicId - 仅编辑现有话题时传入
 * @param {(e:Event)=>void} props.onCloseAutoFocus
 */
export default function AttachmentDialog({
  open,
  onOpenChange,
  onCreated,
  topicId,
  onCloseAutoFocus,
}) {
  const [activeTab, setActiveTab] = useState('upload');
  const [editingDraft, setEditingDraft] = useState(null);
  const [draftsRefreshKey, setDraftsRefreshKey] = useState(0);

  const handleOpenChange = (next) => {
    // 关闭时不重置 state — 让淡出动画播完，否则会闪烁
    onOpenChange?.(next);
  };

  // 每次打开都从"上传" tab 开始（外部 setOpen(true) 不触发 onOpenChange，故用 effect 监听）
  useEffect(() => {
    if (open) {
      setActiveTab('upload');
      setEditingDraft(null);
    }
  }, [open]);

  const handleSubmitted = (attachmentId, wasEditing) => {
    if (wasEditing) {
      setEditingDraft(null);
      setDraftsRefreshKey((k) => k + 1);
    } else {
      onCreated?.(attachmentId);
      handleOpenChange(false);
    }
  };

  const handleEditDraft = (draft) => {
    setEditingDraft(draft);
    setActiveTab('upload');
  };

  const handleInsert = (attachmentId) => {
    onCreated?.(attachmentId);
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" onCloseAutoFocus={onCloseAutoFocus}>
        <DialogHeader>
          <DialogTitle>
            {editingDraft ? `编辑草稿 #${editingDraft.id}` : '插入附件'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={topicId ? 'grid grid-cols-3 w-full' : 'grid grid-cols-2 w-full'}>
            <TabsTrigger value="upload">上传</TabsTrigger>
            <TabsTrigger value="drafts">草稿</TabsTrigger>
            {topicId && <TabsTrigger value="bound">本话题已有</TabsTrigger>}
          </TabsList>

          {/*
            forceMount：Radix 默认会卸载非激活 tab，而 UploadTab 的 uploadedFiles 是
            组件内 state——用户传完文件、点一下「草稿」再切回来，列表就空了，可服务端
            文件还在（且此后再无入口删它，只能等孤儿回收）。保持挂载让 state 存活。
            非激活时 Radix 会加 hidden 属性，视觉上仍是隐藏的。
          */}
          <TabsContent value="upload" forceMount hidden={activeTab !== 'upload'}>
            <UploadTab
              editingDraft={editingDraft}
              onSubmitted={handleSubmitted}
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
