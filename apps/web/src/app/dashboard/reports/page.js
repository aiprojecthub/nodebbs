'use client';

import { DataTable } from '@/components/common/DataTable';
import { ActionMenu } from '@/components/common/ActionMenu';
import { PageHeader } from '@/components/common/PageHeader';
import { Eye, CheckSquare, XSquare } from 'lucide-react';
import Link from '@/components/common/Link';
import Time from '@/components/common/Time';
import { useReportManagement } from '@/hooks/dashboard/useReportManagement';
import { ReportResolveDialog } from './components/ReportResolveDialog';
import { ReportDetailDialog } from './components/ReportDetailDialog';
import { ReportTypeBadge, ReportStatusBadge, getReportTargetLink } from './components/ReportBadges';

export default function ReportsManagement() {
  const {
    items: reports,
    loading,
    search,
    setSearch,
    filters,
    setFilter,
    page,
    total,
    limit,
    setPage,
    // 处理对话框
    resolveDialogOpen,
    setResolveDialogOpen,
    selectedReport,
    resolveAction,
    resolving,
    handleResolve,
    openResolveDialog,
    // 详情对话框
    detailDialogOpen,
    setDetailDialogOpen,
    detailReport,
    openDetailDialog,
  } = useReportManagement();

  const columns = [
    {
      key: 'id',
      label: 'ID',
      width: 'w-20',
      render: (value) => <span className='font-mono text-xs'>#{value}</span>,
    },
    {
      key: 'reportType',
      label: '类型',
      width: 'w-25',
      render: (value) => <ReportTypeBadge type={value} />,
    },
    {
      key: 'target',
      label: '目标内容',
      render: (_, row) => {
        if (!row.targetInfo) {
          return <span className='text-muted-foreground text-sm'>已删除</span>;
        }
        return (
          <div className='max-w-md'>
            {row.reportType === 'topic' && (
              <Link
                href={getReportTargetLink(row)}
                className='text-primary hover:underline line-clamp-2 text-sm'
                target='_blank'
              >
                {row.targetInfo.title}
              </Link>
            )}
            {row.reportType === 'post' && (
              <Link
                href={getReportTargetLink(row)}
                className='text-primary hover:underline line-clamp-2 text-sm'
                target='_blank'
              >
                {row.targetInfo.content}
              </Link>
            )}
            {row.reportType === 'user' && (
              <Link
                href={getReportTargetLink(row)}
                className='text-primary hover:underline text-sm'
                target='_blank'
              >
                {row.targetInfo.username}
              </Link>
            )}
          </div>
        );
      },
    },
    {
      key: 'reporter',
      label: '举报人',
      width: 'w-30',
      render: (_, row) => (
        <span className='text-sm'>
          {row.reporterName || row.reporterUsername}
        </span>
      ),
    },
    {
      key: 'reason',
      label: '举报原因',
      width: 'w-50',
      render: (value) => (
        <div className='text-sm text-muted-foreground line-clamp-2'>
          {value}
        </div>
      ),
    },
    {
      key: 'status',
      label: '状态',
      width: 'w-30',
      render: (value) => <ReportStatusBadge status={value} />,
    },
    {
      key: 'createdAt',
      label: '举报时间',
      width: 'w-[130px]',
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
              label: '查看详情',
              icon: Eye,
              onClick: () => openDetailDialog(row),
            },
            { separator: true },
            {
              label: '处理举报',
              icon: CheckSquare,
              variant: 'default',
              onClick: () => openResolveDialog(row, 'resolve'),
              hidden: row.status !== 'pending',
            },
            {
              label: '驳回举报',
              icon: XSquare,
              onClick: () => openResolveDialog(row, 'dismiss'),
              hidden: row.status !== 'pending',
            },
          ]}
        />
      ),
    },
  ];

  const tableFilters = [
    {
      value: filters.reportType,
      onChange: (value) => setFilter('reportType', value),
      options: [
        { value: 'all', label: '全部类型' },
        { value: 'topic', label: '话题' },
        { value: 'post', label: '回复' },
        { value: 'user', label: '用户' },
      ],
      width: 'w-full sm:w-[150px]',
    },
    {
      value: filters.reportStatus,
      onChange: (value) => setFilter('reportStatus', value),
      options: [
        { value: 'all', label: '全部状态' },
        { value: 'pending', label: '待处理' },
        { value: 'resolved', label: '已处理' },
        { value: 'dismissed', label: '已驳回' },
      ],
      width: 'w-full sm:w-[150px]',
    },
  ];

  return (
    <div>
      <PageHeader
        title='举报管理'
        description='管理用户提交的举报，处理违规内容'
      />

      <DataTable
        columns={columns}
        data={reports}
        loading={loading}
        filters={tableFilters}
        search={{
          value: search,
          onChange: (value) => setSearch(value),
          placeholder: '搜索举报原因...',
        }}
        pagination={{
          page,
          total,
          limit,
          onPageChange: setPage,
        }}
        emptyMessage='暂无举报记录'
      />

      <ReportResolveDialog
        open={resolveDialogOpen}
        onOpenChange={setResolveDialogOpen}
        report={selectedReport}
        action={resolveAction}
        onResolve={handleResolve}
        resolving={resolving}
      />

      <ReportDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        report={detailReport}
      />
    </div>
  );
}
