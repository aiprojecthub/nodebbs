import React from 'react';
import { DataTable } from '@/components/forum/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit2, Trash2 } from 'lucide-react';
import { Edit } from 'lucide-react';

export function BadgeTable({ items, loading, onEdit, onDelete }) {
  const columns = [
    {
      key: 'iconUrl',
      label: '图标',
      render: (value, item) => (
        <img 
          src={value} 
          alt={item.name} 
          className="w-8 h-8 object-contain"
        />
      ),
    },
    {
      key: 'name',
      label: '名称',
      render: (value) => <span className="font-medium">{value}</span>,
    },
    {
      key: 'slug',
      label: 'Slug',
      render: (value) => <span className="text-gray-500 text-sm">{value}</span>,
    },
    {
      key: 'category',
      label: '分类',
      render: (value) => <Badge variant="outline">{value || 'default'}</Badge>,
    },
    {
      key: 'unlockCondition',
      label: '解锁条件',
      render: (value) => <div className="max-w-[200px] truncate">{value || '-'}</div>,
    },
    {
      key: 'isActive',
      label: '状态',
      render: (value) => (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? '启用' : '禁用'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: '操作',
      align: 'right',
      render: (_, item) => (
        <div className="flex justify-end space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(item)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={() => {
              onDelete(item.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={items}
      loading={loading}
      emptyMessage="暂无勋章"
      pagination={{
        total: items.length,
        limit: items.length, // Currently showing all
        page: 1,
        onPageChange: () => {},
      }}
    />
  );
}
