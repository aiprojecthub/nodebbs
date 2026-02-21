'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/common/PageHeader';
import { Medal, Plus } from 'lucide-react';
import { badgesApi } from '@/extensions/badges/api';
import { toast } from 'sonner';
import { BadgeTable } from '../../components/admin/BadgeTable';
import { BadgeFormDialog } from '../../components/admin/BadgeFormDialog';
import { BadgeAssignmentDialog } from '../../components/admin/BadgeAssignmentDialog';

import { confirm } from '@/components/common/ConfirmPopover';

export default function AdminBadgesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('create');
  const [selectedItem, setSelectedItem] = useState(null);
  
  // 派遣/撤销对话框状态
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  
  


  const fetchData = async () => {
    setLoading(true);
    try {
      const { items } = await badgesApi.admin.getAll({ limit: 100 });
      setItems(items || []);
    } catch (err) {
      console.error('Failed to fetch badges:', err);
      toast.error(err.message || '加载勋章列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateDialog = () => {
    setSelectedItem(null);
    setDialogMode('create');
    setShowDialog(true);
  };

  const openEditDialog = (item) => {
    setSelectedItem(item);
    setDialogMode('edit');
    setShowDialog(true);
  };

  const handleSubmit = async (data) => {
    try {
      if (dialogMode === 'create') {
        await badgesApi.admin.create(data);
        toast.success('勋章创建成功');
      } else {
        await badgesApi.admin.update(selectedItem.id, data);
        toast.success('勋章更新成功');
      }
      setShowDialog(false);
      fetchData();
    } catch (err) {
      console.error(`${dialogMode === 'create' ? '创建' : '更新'}勋章失败:`, err);
      toast.error(err.message || '操作失败');
    }
  };

  // 触发确认删除
  const handleDeleteClick = async (e, badge) => {
    const confirmed = await confirm(e, {
      title: '确认删除该勋章吗？',
      description: (
        <>
          此操作<span className="font-bold text-red-500">不可撤销</span>。
          <br/>
          1. 所有拥有该勋章的用户将<span className="font-bold">永久失去</span>及其佩戴效果。
          <br/>
          2. 任何关联此勋章的商店商品将被<span className="font-bold">自动下架</span>。
        </>
      ),
      confirmText: '确认删除',
      variant: 'destructive',
    });

    if (!confirmed) return;
    
    try {
      await badgesApi.admin.delete(badge.id);
      toast.success('勋章删除成功，关联商品已下架');
      fetchData();
    } catch (err) {
        // 处理特定的 403 错误以优化 UI 显示
        if (err.status === 403 || err.message?.includes('创始人')) {
             toast.error('操作被拒绝：只有创始人可以删除勋章');
        } else {
             console.error('删除勋章失败:', err);
             toast.error(err.message || '删除失败');
        }
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title='勋章管理'
        description='管理系统中的所有荣誉勋章'
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowAssignmentDialog(true)}>
              授予/撤销
            </Button>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4" />
              新建勋章
            </Button>
          </div>
        }
      />

      <BadgeTable
        items={items}
        loading={loading}
        onEdit={openEditDialog}
        onDelete={handleDeleteClick}  // 现在传递项目对象或 ID，由包装器处理
      />

      <BadgeFormDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        mode={dialogMode}
        initialData={selectedItem}
        onSubmit={handleSubmit}
      />
      
      <BadgeAssignmentDialog 
        open={showAssignmentDialog} 
        onOpenChange={setShowAssignmentDialog}
        badgeList={items}
      />
      

    </div>
  );
}
