'use client';

import { useState, useEffect } from 'react';
import { useDebounce } from '@uidotdev/usehooks';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/forum/DataTable';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/common/AlertDialog';
import { FormDialog } from '@/components/common/FormDialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { moderationApi } from '@/lib/api';
import { toast } from 'sonner';
import {
  Loader2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  MoreHorizontal,
  CheckSquare,
  XSquare,
} from 'lucide-react';
import Link from 'next/link';
import Time from '@/components/forum/Time';

export default function ReportsManagement() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [reportType, setReportType] = useState('all');
  const [status, setStatus] = useState('all');
  // 搜索
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);

  const limit = 20;

  // 处理对话框
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [resolveAction, setResolveAction] = useState('resolve');
  const [resolveNote, setResolveNote] = useState('');
  const [resolving, setResolving] = useState(false);

  // 详情对话框
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailReport, setDetailReport] = useState(null);

  // 搜索词变化时重置页码
  useEffect(() => {
    if (page !== 1) {
      setPage(1);
    }
  }, [debouncedSearch]);

  // 数据请求 - 过滤器变化时立即响应，debouncedSearch 变化也会触发 fetch
  useEffect(() => {
    fetchReports();
  }, [page, reportType, status, debouncedSearch]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await moderationApi.getReports(reportType, status, page, limit, debouncedSearch);
      setReports(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('获取举报列表失败:', err);
      toast.error('获取举报列表失败：' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedReport) return;

    setResolving(true);
    try {
      await moderationApi.resolveReport(
        selectedReport.id,
        resolveAction,
        resolveNote.trim()
      );
      toast.success(resolveAction === 'resolve' ? '举报已处理' : '举报已驳回');
      setResolveDialogOpen(false);
      setSelectedReport(null);
      setResolveNote('');
      fetchReports();
    } catch (err) {
      console.error('处理举报失败:', err);
      toast.error(err.message || '处理失败');
    } finally {
      setResolving(false);
    }
  };

  const openResolveDialog = (report, action) => {
    setSelectedReport(report);
    setResolveAction(action);
    setResolveNote('');
    setResolveDialogOpen(true);
  };

  const openDetailDialog = (report) => {
    setDetailReport(report);
    setDetailDialogOpen(true);
  };

  const getTypeText = (type) => {
    switch (type) {
      case 'topic':
        return '话题';
      case 'post':
        return '回复';
      case 'user':
        return '用户';
      default:
        return type;
    }
  };

  const getTypeBadge = (type) => {
    const variants = {
      topic: 'default',
      post: 'secondary',
      user: 'outline',
    };
    return (
      <Badge variant={variants[type] || 'secondary'} className='text-xs'>
        {getTypeText(type)}
      </Badge>
    );
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <Badge className='bg-yellow-100 text-yellow-800 text-xs'>
            <AlertTriangle className='h-3 w-3 mr-1' />
            待处理
          </Badge>
        );
      case 'resolved':
        return (
          <Badge className='bg-green-100 text-green-800 text-xs'>
            <CheckCircle className='h-3 w-3 mr-1' />
            已处理
          </Badge>
        );
      case 'dismissed':
        return (
          <Badge className='bg-gray-100 text-gray-800 text-xs'>
            <XCircle className='h-3 w-3 mr-1' />
            已驳回
          </Badge>
        );
      default:
        return <Badge variant='secondary' className='text-xs'>{status}</Badge>;
    }
  };

  const getTargetLink = (report) => {
    if (!report.targetInfo) return null;

    if (report.reportType === 'topic') {
      return `/topic/${report.targetId}`;
    } else if (report.reportType === 'post' && report.targetInfo.topicId) {
      return `/topic/${report.targetInfo.topicId}#post-${report.targetId}`;
    } else if (report.reportType === 'user') {
      return `/users/${report.targetInfo.username}`;
    }
    return null;
  };

  // 定义表格列
  const columns = [
    {
      key: 'id',
      label: 'ID',
      width: 'w-[80px]',
      render: (value) => <span className='font-mono text-xs'>#{value}</span>,
    },
    {
      key: 'reportType',
      label: '类型',
      width: 'w-[100px]',
      render: (value) => getTypeBadge(value),
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
                href={getTargetLink(row)}
                className='text-primary hover:underline line-clamp-2 text-sm'
                target='_blank'
              >
                {row.targetInfo.title}
              </Link>
            )}
            {row.reportType === 'post' && (
              <Link
                href={getTargetLink(row)}
                className='text-primary hover:underline line-clamp-2 text-sm'
                target='_blank'
              >
                {row.targetInfo.content}
              </Link>
            )}
            {row.reportType === 'user' && (
              <Link
                href={getTargetLink(row)}
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
      width: 'w-[120px]',
      render: (_, row) => (
        <span className='text-sm'>
          {row.reporterName || row.reporterUsername}
        </span>
      ),
    },
    {
      key: 'reason',
      label: '举报原因',
      width: 'w-[200px]',
      render: (value) => (
        <div className='text-sm text-muted-foreground line-clamp-2'>
          {value}
        </div>
      ),
    },
    {
      key: 'status',
      label: '状态',
      width: 'w-[120px]',
      render: (value) => getStatusBadge(value),
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
      width: 'w-[80px]',
      align: 'right',
      sticky: 'right',
      render: (_, row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='ghost' size='sm'>
              <MoreHorizontal className='h-4 w-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem onClick={() => openDetailDialog(row)}>
              <Eye className='h-4 w-4' />
              查看详情
            </DropdownMenuItem>
            {row.status === 'pending' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => openResolveDialog(row, 'resolve')}
                  className='text-green-600'
                >
                  <CheckSquare className='h-4 w-4' />
                  处理举报
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => openResolveDialog(row, 'dismiss')}
                  className='text-gray-600'
                >
                  <XSquare className='h-4 w-4' />
                  驳回举报
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  // 多个独立过滤器配置
  const filters = [
    {
      // label: '举报类型',
      value: reportType,
      onChange: (value) => {
        setReportType(value);
        setPage(1); // 过滤时重置到第一页
      },
      options: [
        { value: 'all', label: '全部类型' },
        { value: 'topic', label: '话题' },
        { value: 'post', label: '回复' },
        { value: 'user', label: '用户' },
      ],
      width: 'w-full sm:w-[150px]',
    },
    {
      // label: '处理状态',
      value: status,
      onChange: (value) => {
        setStatus(value);
        setPage(1); // 过滤时重置到第一页
      },
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
      <div className='mb-6'>
        <h1 className='text-2xl font-bold text-foreground mb-1'>举报管理</h1>
        <p className='text-sm text-muted-foreground'>
          管理用户提交的举报，处理违规内容
        </p>
      </div>

      {/* 数据表格 */}
      <DataTable
        columns={columns}
        data={reports}
        loading={loading}
        filters={filters}
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

      {/* 处理举报对话框 */}
      <FormDialog
          open={resolveDialogOpen}
          onOpenChange={setResolveDialogOpen}
          title={resolveAction === 'resolve' ? '处理举报' : '驳回举报'}
          description={selectedReport && (
                <div className='mt-2 space-y-2'>
                  <div className='flex items-center space-x-2'>
                    <span className='text-sm font-medium'>类型：</span>
                    {getTypeBadge(selectedReport.reportType)}
                  </div>
                  <div className='text-sm'>
                    <span className='font-medium'>举报原因：</span>
                    <p className='mt-1 text-muted-foreground'>
                      {selectedReport.reason}
                    </p>
                  </div>
                </div>
              )}
          submitText={resolveAction === 'resolve' ? '确认处理' : '确认驳回'}
          onSubmit={handleResolve}
          loading={resolving}
          submitClassName={resolveAction === 'resolve' ? 'bg-green-600 hover:bg-green-700' : ''}
          maxWidth='sm:max-w-[500px]'
      >
          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <Label htmlFor='resolve-note'>处理备注（可选）</Label>
              <Textarea
                id='resolve-note'
                placeholder='输入处理备注...'
                value={resolveNote}
                onChange={(e) => setResolveNote(e.target.value)}
                disabled={resolving}
                className='min-h-[100px]'
                maxLength={500}
              />
            </div>
          </div>
      </FormDialog>

      {/* 详情对话框 */}
      <FormDialog
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
          title="举报详情"
          cancelText="关闭"
          maxWidth='sm:max-w-[600px]'
          // Read-only, so no submit button
      >
          {detailReport && (
            <div className='space-y-4 py-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <Label className='text-muted-foreground'>举报ID</Label>
                  <p className='font-mono'>#{detailReport.id}</p>
                </div>
                <div>
                  <Label className='text-muted-foreground'>类型</Label>
                  <div className='mt-1'>{getTypeBadge(detailReport.reportType)}</div>
                </div>
                <div>
                  <Label className='text-muted-foreground'>状态</Label>
                  <div className='mt-1'>{getStatusBadge(detailReport.status)}</div>
                </div>
                <div>
                  <Label className='text-muted-foreground'>举报人</Label>
                  <p>{detailReport.reporterName || detailReport.reporterUsername}</p>
                </div>
              </div>

              <div>
                <Label className='text-muted-foreground'>举报时间</Label>
                <p><Time date={detailReport.createdAt} /></p>
              </div>

              <div>
                <Label className='text-muted-foreground'>举报原因</Label>
                <p className='mt-1 p-3 bg-muted rounded text-sm'>
                  {detailReport.reason}
                </p>
              </div>

              {detailReport.targetInfo && (
                <div>
                  <Label className='text-muted-foreground'>目标内容</Label>
                  <div className='mt-1 p-3 bg-muted rounded text-sm'>
                    {detailReport.reportType === 'topic' && (
                      <div>
                        <p className='font-medium'>{detailReport.targetInfo.title}</p>
                        <p className='text-xs text-muted-foreground mt-1'>
                          作者: {detailReport.targetInfo.username}
                        </p>
                      </div>
                    )}
                    {detailReport.reportType === 'post' && (
                      <div>
                        <p>{detailReport.targetInfo.content}</p>
                        <p className='text-xs text-muted-foreground mt-1'>
                          作者: {detailReport.targetInfo.username}
                        </p>
                      </div>
                    )}
                    {detailReport.reportType === 'user' && (
                      <div>
                        <p className='font-medium'>{detailReport.targetInfo.username}</p>
                        {detailReport.targetInfo.name && (
                          <p className='text-xs text-muted-foreground mt-1'>
                            {detailReport.targetInfo.name}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  {getTargetLink(detailReport) && (
                    <Link
                      href={getTargetLink(detailReport)}
                      target='_blank'
                      className='text-sm text-primary hover:underline mt-2 inline-block'
                    >
                      查看原内容 →
                    </Link>
                  )}
                </div>
              )}

              {detailReport.status !== 'pending' && (
                <>
                  <div>
                    <Label className='text-muted-foreground'>处理时间</Label>
                    <p><Time date={detailReport.resolvedAt} /></p>
                  </div>
                  {detailReport.resolverNote && (
                    <div>
                      <Label className='text-muted-foreground'>处理备注</Label>
                      <p className='mt-1 p-3 bg-muted rounded text-sm'>
                        {detailReport.resolverNote}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
      </FormDialog>
    </div>
  );
}
