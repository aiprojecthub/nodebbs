import React from 'react';
import { DataTable } from '@/components/common/DataTable';
import { ActionMenu } from '@/components/common/ActionMenu';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2 } from 'lucide-react';

export function BadgeTable({ items, loading, onEdit, onDelete }) {
  const columns = [
    {
      key: 'iconUrl',
      label: '图标',
      render: (value, item) => (
        <img 
          src={value} 
          alt={item.name} 
          className="w-24 h-24 object-contain"
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
      render: (value) => <div className="max-w-50 truncate">{value || '-'}</div>,
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
      sticky: 'right',
      render: (_, item) => (
        <ActionMenu
          mode="inline"
          items={[
            {
              label: '编辑',
              icon: Edit,
              onClick: () => onEdit(item),
            },
            {
              label: '删除',
              icon: Trash2,
              onClick: (e) => onDelete(e, item),
              variant: 'destructive',
            },
          ]}
        />
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
