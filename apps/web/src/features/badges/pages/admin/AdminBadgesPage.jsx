'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Medal, Plus } from 'lucide-react';
import { badgesApi } from '@/features/badges/api';
import { toast } from 'sonner';
import { BadgeTable } from '../../components/admin/BadgeTable';
import { BadgeFormDialog } from '../../components/admin/BadgeFormDialog';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function AdminBadgesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('create');
  const [selectedItem, setSelectedItem] = useState(null);
  
  // Confirmation Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [badgeIdToDelete, setBadgeIdToDelete] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { items } = await badgesApi.getAll({});
      setItems(items || []);
    } catch (error) {
      console.error('Failed to fetch badges:', error);
      toast.error('加载勋章列表失败');
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
      toast.error(`${dialogMode === 'create' ? '创建' : '更新'}失败`);
    }
  };

  // Trigger Confirmation Dialog
  const handleDelete = (id) => {
    setBadgeIdToDelete(id);
    setDeleteDialogOpen(true);
  };

  // Execute actual delete
  const confirmDelete = async () => {
    if (!badgeIdToDelete) return;
    
    try {
      await badgesApi.admin.delete(badgeIdToDelete);
      toast.success('勋章删除成功，关联商品已下架');
      fetchData();
    } catch (err) {
        // Handle specific 403 error for cleaner UI
        if (err.status === 403 || err.message?.includes('创始人')) {
             toast.error('操作被拒绝：只有创始人可以删除勋章');
        } else {
             console.error('删除勋章失败:', err);
             toast.error('删除失败：' + (err.message || '未知错误'));
        }
    } finally {
        setDeleteDialogOpen(false);
        setBadgeIdToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-card-foreground mb-2 flex items-center gap-2">
            <Medal className="h-6 w-6" />
            勋章管理
          </h1>
          <p className="text-muted-foreground">管理系统中的所有荣誉勋章</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          新建勋章
        </Button>
      </div>

      <BadgeTable
        items={items}
        loading={loading}
        onEdit={openEditDialog}
        onDelete={handleDelete}  // Now passes the item object or id, handled by wrapper
      />

      <BadgeFormDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        mode={dialogMode}
        initialData={selectedItem}
        onSubmit={handleSubmit}
      />
      
      {/* Delete Confirmation Alert */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除该勋章吗？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作<span className="font-bold text-red-500">不可撤销</span>。
              <br/>
              1. 所有拥有该勋章的用户将<span className="font-bold">永久失去</span>及其佩戴权益。
              <br/>
              2. 任何关联此勋章的商店商品将被<span className="font-bold">自动下架</span>。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
