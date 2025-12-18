import { useState } from 'react';
import { DataTable } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Edit, Trash2, Loader2 } from 'lucide-react';
import { Loading } from '@/components/common/Loading';
import { ItemTypeIcon } from '../shared/ItemTypeIcon';
import { getItemTypeLabel } from '../../utils/itemTypes';

/**
 * Shop items management table for admin
 * @param {Object} props
 * @param {Array} props.items - Array of shop items
 * @param {boolean} props.loading - Loading state
 * @param {Object} props.pagination - { page, total, limit, onPageChange }
 * @param {Function} props.onEdit - Callback when edit button clicked
 * @param {Function} props.onDelete - Callback when delete confirmed
 */
export function ShopItemTable({ items, loading, pagination, onEdit, onDelete }) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const openDeleteDialog = (item) => {
    setSelectedItem(item);
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    
    setDeleting(true);
    try {
      await onDelete(selectedItem);
      setShowDeleteDialog(false);
      setSelectedItem(null);
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      label: 'ID',
      key: 'id',
      render: (value) => <span className="text-muted-foreground">#{value}</span>,
    },
    {
      label: '类型',
      key: 'type',
      render: (value) => (
        <div className="flex items-center gap-2">
          <ItemTypeIcon type={value} className="h-4 w-4" />
          <span>{getItemTypeLabel(value)}</span>
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
      render: (value) => (
        <span className="font-semibold text-yellow-600">{value}</span>
      ),
    },
    {
      label: '库存',
      key: 'stock',
      render: (value) => (
        <span>
          {value === null ? (
            <Badge variant="secondary">不限</Badge>
          ) : (
            <Badge variant={value > 10 ? 'default' : 'destructive'}>
              {value}
            </Badge>
          )}
        </span>
      ),
    },
    {
      label: '状态',
      key: 'isActive',
      render: (value) => (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? '上架' : '下架'}
        </Badge>
      ),
    },
    {
      label: '排序',
      key: 'displayOrder',
      render: (value) => (
        <span className="text-muted-foreground">{value || 0}</span>
      ),
    },
    {
      label: '操作',
      key: 'operation',
      align: 'right',
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(row)}
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
    <>
      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        pagination={pagination}
      />

      {/* Delete Confirmation Dialog */}
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
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? (
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
    </>
  );
}
