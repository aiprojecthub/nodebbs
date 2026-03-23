'use client';

import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/common/DataTable';
import { ActionMenu } from '@/components/common/ActionMenu';
import { PageHeader } from '@/components/common/PageHeader';
import {
  Trash2,
  Eye,
  Lock,
  Unlock,
  Pin,
  PinOff,
  Clock,
  AlertCircle,
} from 'lucide-react';
import Link from '@/components/common/Link';
import Time from '@/components/common/Time';
import { usePermission } from '@/hooks/usePermission';
import { useTopicManagement } from '@/hooks/dashboard/useTopicManagement';

export default function AdminTopicsPage() {
  const { hasPermission, hasCondition } = usePermission();
  const {
    items: topics,
    loading,
    search,
    setSearch,
    filters,
    setFilter,
    page,
    total,
    limit,
    setPage,
    selectedIds,
    setSelectedIds,
    batchDeleting,
    handleTogglePin,
    handleToggleClosed,
    handleDeleteClick,
    handleBatchDelete,
  } = useTopicManagement();

  const columns = [
    {
      key: 'id',
      label: 'ID',
      width: 'w-15',
      render: (value) => <span className='font-mono text-xs'>#{value}</span>,
    },
    {
      key: 'title',
      label: '标题',
      render: (value, row) => (
        <div className='flex items-center gap-2 max-w-xl [&>*:not(:first-child)]:shrink-0'>
          <Link
            href={`/topic/${row.id}`}
            className='hover:text-primary hover:underline font-medium line-clamp-2 whitespace-normal text-ellipsis'
            target='_blank'
          >
            {value}
          </Link>
          {row.isPinned && <Pin className='h-3 w-3 text-orange-500' />}
          {row.isClosed && (
            <Lock className='h-3 w-3 text-muted-foreground' />
          )}
          {row.approvalStatus === 'pending' && (
            <Clock className='h-3 w-3 text-chart-5' />
          )}
          {row.approvalStatus === 'rejected' && (
            <AlertCircle className='h-3 w-3 text-destructive' />
          )}
        </div>
      ),
    },
    {
      key: 'categoryName',
      label: '分类',
      width: 'w-30',
      render: (value) => (
        <Badge variant='secondary' className='text-xs'>
          {value}
        </Badge>
      ),
    },
    {
      key: 'username',
      label: '作者',
      width: 'w-30',
      render: (value) => (
        <Link
          href={`/users/${value}`}
          className='text-sm hover:text-primary hover:underline'
          target='_blank'
        >
          {value}
        </Link>
      ),
    },
    {
      key: 'status',
      label: '状态',
      width: 'w-25',
      render: (_, row) => {
        if (row.approvalStatus === 'pending') {
          return (
            <Badge variant='outline' className='text-chart-5 border-chart-5 text-xs'>
              待审核
            </Badge>
          );
        }
        if (row.approvalStatus === 'rejected') {
          return (
            <Badge variant='outline' className='text-destructive border-destructive text-xs'>
              已拒绝
            </Badge>
          );
        }
        if (row.isDeleted) {
          return (
            <Badge variant='destructive' className='text-xs'>
              已删除
            </Badge>
          );
        }
        if (row.isClosed) {
          return (
            <Badge variant='secondary' className='text-xs'>
              已关闭
            </Badge>
          );
        }
        return (
          <Badge variant='default' className='text-xs'>
            正常
          </Badge>
        );
      },
    },
    {
      key: 'createdAt',
      label: '创建时间',
      width: 'w-30',
      render: (value) => (
        <span className='text-xs text-muted-foreground'>
          <Time date={value} />
        </span>
      ),
    },
    {
      key: 'actions',
      label: '操作',
      align: 'right',
      sticky: 'right',
      render: (_, row) => (
        <ActionMenu
          items={[
            {
              label: '查看话题',
              icon: Eye,
              href: `/topic/${row.id}`,
              target: '_blank',
            },
            { separator: true },
            {
              label: row.isPinned ? '取消置顶' : '置顶话题',
              icon: row.isPinned ? PinOff : Pin,
              onClick: () => handleTogglePin(row.id, row.isPinned),
              hidden: !hasPermission('dashboard.topics'),
            },
            {
              label: row.isClosed ? '重新开启' : '关闭话题',
              icon: row.isClosed ? Unlock : Lock,
              onClick: () => handleToggleClosed(row.id, row.isClosed),
              hidden: !hasPermission('dashboard.topics'),
            },
            { separator: true, hidden: !hasPermission('dashboard.topics') },
            {
              label: '删除',
              icon: Trash2,
              variant: 'warning',
              onClick: (e) => handleDeleteClick(e, row, 'soft'),
              hidden: row.isDeleted || !hasPermission('dashboard.topics'),
            },
            {
              label: '彻底删除',
              icon: Trash2,
              variant: 'destructive',
              onClick: (e) => handleDeleteClick(e, row, 'hard'),
              hidden: !hasCondition('dashboard.topics', 'allowPermanent'),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title='话题管理'
        description='管理所有话题，支持置顶、关闭和删除操作'
      />

      <DataTable
        columns={columns}
        data={topics}
        loading={loading}
        search={{
          value: search,
          onChange: (value) => setSearch(value),
          placeholder: '搜索话题标题...',
        }}
        filter={{
          value: filters.statusFilter,
          onChange: (value) => setFilter('statusFilter', value),
          options: [
            { value: 'all', label: '全部话题' },
            { value: 'pending', label: '待审核' },
            { value: 'rejected', label: '已拒绝' },
            { value: 'pinned', label: '置顶话题' },
            { value: 'closed', label: '已关闭' },
            { value: 'deleted', label: '已删除' },
          ],
        }}
        pagination={{
          page,
          total,
          limit,
          onPageChange: setPage,
        }}
        emptyMessage='暂无话题'
        selection={hasPermission('dashboard.topics') ? {
          selectedIds,
          onSelectionChange: setSelectedIds,
        } : undefined}
        batchActions={[
          {
            label: '批量删除',
            icon: Trash2,
            variant: 'destructive',
            onClick: handleBatchDelete,
            loading: batchDeleting,
          },
        ]}
      />
    </div>
  );
}
