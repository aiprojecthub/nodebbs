'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { DataTable } from '@/components/forum/DataTable';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Edit, Trash2, Loader2, ShoppingCart, Package, Award, Sparkles } from 'lucide-react';
import { shopApi } from '@/lib/api';
import { toast } from 'sonner';
import { Loading } from '@/components/common/Loading';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

export default function ShopManagement() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('create'); // 'create' or 'edit'
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
  });

  const [formData, setFormData] = useState({
    type: 'avatar_frame',
    name: '',
    description: '',
    price: 0,
    imageUrl: '',
    stock: null,
    displayOrder: 0,
    isActive: true,
    metadata: '',
  });

  useEffect(() => {
    fetchItems();
  }, [pagination.page]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const data = await shopApi.admin.getItems({
        page: pagination.page,
        limit: pagination.limit,
      });
      setItems(data.items || []);
      setPagination((prev) => ({
        ...prev,
        total: data.total || 0,
      }));
    } catch (err) {
      console.error('获取商品列表失败:', err);
      toast.error('获取商品列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('请输入商品名称');
      return;
    }

    if (formData.price < 0) {
      toast.error('价格不能为负数');
      return;
    }

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
      resetForm();
      fetchItems();
    } catch (err) {
      console.error(`${dialogMode === 'create' ? '创建' : '更新'}商品失败:`, err);
      toast.error(`${dialogMode === 'create' ? '创建' : '更新'}失败：` + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;

    setSubmitting(true);
    try {
      await shopApi.admin.deleteItem(selectedItem.id);
      toast.success('商品删除成功');
      setShowDeleteDialog(false);
      setSelectedItem(null);
      fetchItems();
    } catch (err) {
      console.error('删除商品失败:', err);
      toast.error('删除失败：' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'avatar_frame',
      name: '',
      description: '',
      price: 0,
      imageUrl: '',
      stock: null,
      displayOrder: 0,
      isActive: true,
      metadata: '',
    });
    setSelectedItem(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogMode('create');
    setShowDialog(true);
  };

  const openEditDialog = (item) => {
    setSelectedItem(item);
    setFormData({
      type: item.type,
      name: item.name,
      description: item.description || '',
      price: item.price,
      imageUrl: item.imageUrl || '',
      stock: item.stock,
      displayOrder: item.displayOrder || 0,
      isActive: item.isActive,
      metadata: item.metadata || '',
    });
    setDialogMode('edit');
    setShowDialog(true);
  };

  const openDeleteDialog = (item) => {
    setSelectedItem(item);
    setShowDeleteDialog(true);
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'avatar_frame':
        return <Package className="h-4 w-4" />;
      case 'badge':
        return <Award className="h-4 w-4" />;
      default:
        return <Sparkles className="h-4 w-4" />;
    }
  };

  const getTypeName = (type) => {
    switch (type) {
      case 'avatar_frame':
        return '头像框';
      case 'badge':
        return '勋章';
      case 'custom':
        return '自定义';
      default:
        return type;
    }
  };

  const columns = [
    {
      label: 'ID',
      key: 'id',
      render: (value, row) => <span className="text-muted-foreground">#{row.id}</span>,
    },
    {
      label: '类型',
      key: 'type',
      render: (value, row) => (
        <div className="flex items-center gap-2">
          {getTypeIcon(row.type)}
          <span>{getTypeName(row.type)}</span>
        </div>
      ),
    },
    {
      label: '商品信息',
      key: 'name',
      render: (value, row) => (
        <div className="flex items-center gap-3">
          {row.imageUrl && (
            <div className="relative w-12 h-12">
              <img
                src={row.imageUrl}
                alt={row.name}
                className="object-cover"
              />
            </div>
          )}
          <div>
            <div className="font-medium">{row.name}</div>
            {row.description && (
              <div className="text-sm text-muted-foreground line-clamp-1">
                {row.description}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      label: '价格',
      key: 'price',
      render: (value, row) => (
        <span className="font-semibold text-yellow-600">{row.price}</span>
      ),
    },
    {
      label: '库存',
      key: 'stock',
      render: (value, row) => (
        <span>
          {row.stock === null ? (
            <Badge variant="secondary">不限</Badge>
          ) : (
            <Badge variant={row.stock > 10 ? 'default' : 'destructive'}>
              {row.stock}
            </Badge>
          )}
        </span>
      ),
    },
    {
      label: '状态',
      key: 'isActive',
      render: (value, row) => (
        <Badge variant={row.isActive ? 'default' : 'secondary'}>
          {row.isActive ? '上架' : '下架'}
        </Badge>
      ),
    },
    {
      label: '排序',
      key: 'displayOrder',
      render: (value, row) => (
        <span className="text-muted-foreground">{row.displayOrder || 0}</span>
      ),
    },
    {
      label: '操作',
      key: 'operation',
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditDialog(row)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openDeleteDialog(row)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return <Loading text="加载中..." className="py-12" />;
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
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

      {/* 商品列表 */}
      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        pagination={{
          page: pagination.page,
          total: pagination.total,
          limit: pagination.limit,
          onPageChange: (newPage) => {
            setPagination((prev) => ({
              ...prev,
              page: newPage,
            }));
          },
        }}
      />

      {/* 创建/编辑对话框 */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'create' ? '新建商品' : '编辑商品'}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === 'create'
                ? '创建一个新的商城商品'
                : '修改商品信息'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 商品类型 */}
            <div className="space-y-2">
              <Label htmlFor="type">商品类型 *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择商品类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="avatar_frame">头像框</SelectItem>
                  <SelectItem value="badge">勋章</SelectItem>
                  <SelectItem value="custom">自定义</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 商品名称 */}
            <div className="space-y-2">
              <Label htmlFor="name">商品名称 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="输入商品名称"
              />
            </div>

            {/* 商品描述 */}
            <div className="space-y-2">
              <Label htmlFor="description">商品描述</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="输入商品描述"
                rows={3}
              />
            </div>

            {/* 价格 */}
            <div className="space-y-2">
              <Label htmlFor="price">价格（积分）*</Label>
              <Input
                id="price"
                type="number"
                min="0"
                value={formData.price}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, price: e.target.value }))
                }
                placeholder="0"
              />
            </div>

            {/* 图片URL */}
            <div className="space-y-2">
              <Label htmlFor="imageUrl">图片URL</Label>
              <Input
                id="imageUrl"
                value={formData.imageUrl}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, imageUrl: e.target.value }))
                }
                placeholder="https://..."
              />
              {formData.imageUrl && (
                <div className="relative w-32 h-32 rounded-lg overflow-hidden bg-muted">
                  <Image
                    src={formData.imageUrl}
                    alt="预览"
                    fill
                    className="object-cover"
                  />
                </div>
              )}
            </div>

            {/* 库存 */}
            <div className="space-y-2">
              <Label htmlFor="stock">库存（留空表示不限）</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={formData.stock === null ? '' : formData.stock}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    stock: e.target.value === '' ? null : e.target.value,
                  }))
                }
                placeholder="不限"
              />
            </div>

            {/* 排序 */}
            <div className="space-y-2">
              <Label htmlFor="displayOrder">显示排序</Label>
              <Input
                id="displayOrder"
                type="number"
                value={formData.displayOrder}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    displayOrder: e.target.value,
                  }))
                }
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">
                数字越大越靠前，相同排序按创建时间倒序
              </p>
            </div>

            {/* 元数据 */}
            <div className="space-y-2">
              <Label htmlFor="metadata">元数据（JSON格式）</Label>
              <Textarea
                id="metadata"
                value={formData.metadata}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, metadata: e.target.value }))
                }
                placeholder='{"key": "value"}'
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                用于存储头像框样式、勋章图标等自定义配置
              </p>
            </div>

            {/* 是否上架 */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isActive">是否上架</Label>
                <p className="text-xs text-muted-foreground">
                  下架后用户将无法看到和购买此商品
                </p>
              </div>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, isActive: checked }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={submitting}
            >
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {dialogMode === 'create' ? '创建中...' : '更新中...'}
                </>
              ) : dialogMode === 'create' ? (
                '创建'
              ) : (
                '更新'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除商品 "{selectedItem?.name}" 吗？
              <br />
              <span className="text-destructive font-medium">
                注意：如果已有用户购买该商品，将无法删除，建议下架而不是删除。
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={submitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  删除中...
                </>
              ) : (
                '删除'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
