'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Plus } from 'lucide-react';
import { shopApi } from '@/lib/api';
import { toast } from 'sonner';
import { useShopItems } from '../../hooks/useShopItems';
import { ShopItemTable } from '../../components/admin/ShopItemTable';
import { ShopItemFormDialog } from '../../components/admin/ShopItemFormDialog';

export default function AdminShopPage() {
  const [showDialog, setShowDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('create'); // 'create' or 'edit'
  const [selectedItem, setSelectedItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 20;

  const { items, total, loading, refetch } = useShopItems({ page, limit, isAdmin: true });

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

  const handleSubmit = async (formData) => {
    setSubmitting(true);
    try {
      const submitData = {
        ...formData,
        price: parseInt(formData.price),
        stock: formData.stock === null || formData.stock === '' ? null : parseInt(formData.stock),
        displayOrder: parseInt(formData.displayOrder),
      };

      if (dialogMode === 'create') {
        await shopApi.admin.createItem(submitData);
        toast.success('商品创建成功');
      } else {
        await shopApi.admin.updateItem(selectedItem.id, submitData);
        toast.success('商品更新成功');
      }
      setShowDialog(false);
      refetch();
    } catch (err) {
      console.error(`${dialogMode === 'create' ? '创建' : '更新'}商品失败:`, err);
      toast.error(`${dialogMode === 'create' ? '创建' : '更新'}失败：` + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item) => {
    try {
      await shopApi.admin.deleteItem(item.id);
      toast.success('商品删除成功');
      refetch();
    } catch (err) {
      console.error('删除商品失败:', err);
      toast.error('删除失败：' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-card-foreground mb-2 flex items-center gap-2">
            <ShoppingCart className="h-6 w-6" />
            商城管理
          </h1>
          <p className="text-muted-foreground">管理积分商城的商品</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          新建商品
        </Button>
      </div>

      {/* Shop Items Table */}
      <ShopItemTable
        items={items}
        loading={loading}
        pagination={{
          page,
          total,
          limit,
          onPageChange: setPage,
        }}
        onEdit={openEditDialog}
        onDelete={handleDelete}
      />

      {/* Create/Edit Dialog */}
      <ShopItemFormDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        mode={dialogMode}
        initialData={selectedItem}
        onSubmit={handleSubmit}
        submitting={submitting}
      />
    </div>
  );
}
