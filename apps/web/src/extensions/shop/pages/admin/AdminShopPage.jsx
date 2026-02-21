'use client';

import { useState } from 'react';
import { confirm } from '@/components/common/ConfirmPopover';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/common/PageHeader';
import { ShoppingCart, Plus } from 'lucide-react';
import { shopApi } from '@/lib/api';
import { toast } from 'sonner';
import { useShopItems } from '../../hooks/useShopItems';
import { ShopItemTable } from '../../components/admin/ShopItemTable';
import { ShopItemFormDialog } from '../../components/admin/ShopItemFormDialog';
import { useDefaultCurrencyName } from '@/extensions/ledger/contexts/LedgerContext';

export default function AdminShopPage() {
  const currencyName = useDefaultCurrencyName();
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
      toast.error(err.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = async (e, item) => {
    const confirmed = await confirm(e, {
      title: '确认删除',
      description: (
        <>
          确定要删除商品 "{item.name}" 吗？
          <br />
          <span className="text-destructive font-medium">
            注意：如果已有用户购买该商品，将无法删除，建议下架而不是删除。
          </span>
        </>
      ),
      confirmText: '删除',
      variant: 'destructive',
    });

    if (!confirmed) return;

    try {
      await shopApi.admin.deleteItem(item.id);
      toast.success('商品删除成功');
      refetch();
    } catch (err) {
      console.error('删除商品失败:', err);
      toast.error(err.message || '删除失败');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title='商城管理'
        description={`管理${currencyName}商城的商品`}
        actions={
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4" />
            新建商品
          </Button>
        }
      />

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
        onDelete={handleDeleteClick}
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
