'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { FormDialog } from '@/components/common/FormDialog';
import { PageHeader } from '@/components/common/PageHeader';
import { Plus, Loader2 } from 'lucide-react';
import { emojiApi } from '@/lib/api';
import { toast } from 'sonner';
import { confirm } from '@/components/common/ConfirmPopover';
import EmojiGroupSortable from './components/EmojiGroupSortable';

export default function EmojiGroupsPage() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('create'); // 'create' | 'edit'

  const [selectedGroup, setSelectedGroup] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [reordering, setReordering] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    isActive: true,
    size: null,
  });

  const fetchGroups = useCallback(async () => {
    try {
      const data = await emojiApi.admin.getGroups();
      setGroups(data);
    } catch (err) {
      console.error('获取分组失败:', err);
      toast.error('获取分组失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  // 创建或编辑分组（本地乐观更新）
  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('请输入分组名称');
      return;
    }

    if (!formData.slug.trim()) {
      toast.error('请输入分组标识（Slug）');
      return;
    }

    setSubmitting(true);
    try {
      if (dialogMode === 'create') {
        const res = await emojiApi.admin.createGroup(formData);
        toast.success('分组创建成功');
        setGroups(prev => [...prev, res]);
      } else {
        const res = await emojiApi.admin.updateGroup(selectedGroup.id, formData);
        toast.success('分组更新成功');
        setGroups(prev => prev.map(g => g.id === res.id ? res : g));
      }
      setShowDialog(false);
      resetForm();
    } catch (err) {
      console.error(
        `${dialogMode === 'create' ? '创建' : '更新'}分组失败:`,
        err
      );
      toast.error(
        `${dialogMode === 'create' ? '创建' : '更新'}失败：` + (err.message || '未知错误')
      );
    } finally {
      setSubmitting(false);
    }
  };

  // 删除分组
  const handleDelete = async (e, group) => {
    const confirmed = await confirm(e, {
      title: '确认删除？',
      description: `确定要删除分组 "${group.name}" 吗？该分组下的所有表情也将被删除！此操作不可撤销。`,
      confirmText: '删除',
      variant: 'destructive',
    });

    if (!confirmed) return;

    try {
      await emojiApi.admin.deleteGroup(group.id);
      toast.success('分组删除成功');
      setGroups(prev => prev.filter(g => g.id !== group.id));
    } catch (err) {
      console.error('删除分组失败:', err);
      toast.error('删除失败：' + err.message);
    }
  };

  // 拖拽排序（乐观更新，失败时回滚）
  const handleReorder = async (newOrder) => {
    const newGroups = newOrder.map(id => groups.find(g => g.id === id)).filter(Boolean);
    setGroups(newGroups);

    setReordering(true);
    try {
      const items = newOrder.map((id, index) => ({ id, order: index }));
      await emojiApi.admin.batchReorderGroups(items);
      toast.success('排序已保存');
    } catch (err) {
      console.error('排序保存失败:', err);
      toast.error('排序保存失败');
      fetchGroups();
    } finally {
      setReordering(false);
    }
  };

  const openCreateDialog = () => {
    setDialogMode('create');
    resetForm();
    setShowDialog(true);
  };

  const openEditDialog = (group) => {
    setDialogMode('edit');
    setSelectedGroup(group);
    setFormData({
      name: group.name,
      slug: group.slug,
      isActive: group.isActive !== undefined ? group.isActive : true,
      size: group.size || null,
    });
    setShowDialog(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      isActive: true,
      size: null,
    });
    setSelectedGroup(null);
  };

  return (
    <div className='space-y-6'>
      <PageHeader
        title='表情管理'
        description='管理表情包分组及表情'
        actions={
          <div className="flex items-center gap-2">
            {reordering && <Loader2 className="animate-spin h-4 w-4 text-muted-foreground" />}
            <Button onClick={openCreateDialog}>
              <Plus className='h-4 w-4' />
              创建分组
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <EmojiGroupSortable
          groups={groups}
          onReorder={handleReorder}
          onEdit={openEditDialog}
          onDelete={handleDelete}
        />
      )}

      <FormDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        title={dialogMode === 'create' ? '创建分组' : '编辑分组'}
        description={dialogMode === 'create'
          ? '添加一个新的表情分组'
          : '修改分组信息'}
        submitText={dialogMode === 'create' ? '创建' : '保存'}
        onSubmit={handleSubmit}
        loading={submitting}
      >
        <div className='space-y-4 py-4'>
          <div className='space-y-2'>
            <Label htmlFor='name'>名称 *</Label>
            <Input
              id='name'
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder='分组名称（如：默认表情）'
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='slug'>
              Slug *
            </Label>
            <Input
              id='slug'
              value={formData.slug}
              onChange={(e) =>
                setFormData({ ...formData, slug: e.target.value })
              }
              placeholder='唯一标识（如：nb）'
              maxLength={10}
              required
            />
            {dialogMode === 'edit' && formData.slug !== selectedGroup?.slug && (
              <p className='text-sm text-destructive'>
                修改 Slug 可能导致已发布内容中引用该分组的表情失效
              </p>
            )}
          </div>

          <div className='space-y-2'>
            <Label htmlFor='size'>
              默认尺寸 (px){dialogMode === 'create' ? '（可选）' : ''}
            </Label>
            <Input
              id='size'
              type="number"
              min="0"
              value={formData.size || ''}
              onChange={(e) =>
                setFormData({ ...formData, size: e.target.value ? parseInt(e.target.value) : null })
              }
              placeholder='默认 24'
            />
          </div>

          <div className='flex items-center justify-between space-x-2 rounded-lg border border-border p-4'>
            <div className='space-y-0.5'>
              <Label htmlFor='isActive' className='text-base'>
                启用状态
              </Label>
              <p className='text-sm text-muted-foreground'>
                关闭后该分组将在前端隐藏
              </p>
            </div>
            <Switch
              id='isActive'
              checked={formData.isActive}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isActive: checked })
              }
            />
          </div>
        </div>
      </FormDialog>
    </div>
  );
}
