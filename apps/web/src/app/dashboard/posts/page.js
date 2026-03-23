'use client';

import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/common/DataTable';
import { ActionMenu } from '@/components/common/ActionMenu';
import { PageHeader } from '@/components/common/PageHeader';
import { Eye, Trash2 } from 'lucide-react';
import Link from '@/components/common/Link';
import Time from '@/components/common/Time';
import { usePermission } from '@/hooks/usePermission';
import { usePostManagement } from '@/hooks/dashboard/usePostManagement';

export default function AdminPostsPage() {
  const { hasPermission, hasCondition } = usePermission();
  const {
    items: posts,
    loading,
    search,
    setSearch,
    filters,
    setFilter,
    page,
    total,
    limit,
    setPage,
    handleDeleteClick,
  } = usePostManagement();

  const columns = [
    {
      key: 'id',
      label: 'ID',
      width: 'w-15',
      render: (value) => <span className='font-mono text-xs'>#{value}</span>,
    },
    {
      key: 'content',
      label: '内容',
      render: (value, row) => (
        <div className='flex flex-col gap-1 max-w-xl'>
          <div className='font-medium line-clamp-2 text-ellipsis whitespace-normal'>{value}</div>
          <div className='space-x-2 text-muted-foreground line-clamp-1 text-ellipsis'>
            <span>话题:</span>
            <Link
              href={`/topic/${row.topicId}#post-${row.id}`}
              className='hover:text-primary hover:underline'
              target='_blank'
            >
              {row.topicTitle}
            </Link>
          </div>
        </div>
      ),
    },
    {
      key: 'username',
      label: '作者',
      width: 'w-30',
      render: (value, row) => (
        <div className='flex flex-col gap-1'>
          <Link
            href={`/users/${value}`}
            className='text-sm hover:text-primary hover:underline'
            target='_blank'
          >
            {value}
          </Link>
          <Badge variant='outline' className='text-xs w-fit'>
            {row.userRole}
          </Badge>
        </div>
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
        return (
          <Badge variant='default' className='text-xs'>
            已批准
          </Badge>
        );
      },
    },
    {
      key: 'likeCount',
      label: '点赞',
      width: 'w-20',
      align: 'center',
      render: (value) => (
        <span className='text-sm text-muted-foreground'>{value}</span>
      ),
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
              label: '查看回复',
              icon: Eye,
              href: `/topic/${row.topicId}#post-${row.id}`,
              target: '_blank',
            },
            { separator: true, hidden: !hasPermission('post.delete') },
            {
              label: '删除',
              icon: Trash2,
              variant: 'warning',
              onClick: (e) => handleDeleteClick(e, row, 'soft'),
              hidden: row.isDeleted || !hasPermission('post.delete'),
            },
            {
              label: '彻底删除',
              icon: Trash2,
              variant: 'destructive',
              onClick: (e) => handleDeleteClick(e, row, 'hard'),
              hidden: !hasCondition('dashboard.posts', 'allowPermanent'),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title='回复管理'
        description='管理所有回复，支持查看和删除操作'
      />

      <DataTable
        columns={columns}
        data={posts}
        loading={loading}
        search={{
          value: search,
          onChange: (value) => setSearch(value),
          placeholder: '搜索回复内容...',
        }}
        filter={{
          value: filters.statusFilter,
          onChange: (value) => setFilter('statusFilter', value),
          options: [
            { value: 'all', label: '全部回复' },
            { value: 'pending', label: '待审核' },
            { value: 'approved', label: '已批准' },
            { value: 'rejected', label: '已拒绝' },
            { value: 'deleted', label: '已删除' },
          ],
        }}
        pagination={{
          page,
          total,
          limit,
          onPageChange: setPage,
        }}
        emptyMessage='暂无回复'
      />
    </div>
  );
}
