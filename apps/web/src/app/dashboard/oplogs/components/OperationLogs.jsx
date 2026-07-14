'use client';

import { useState, useEffect } from 'react';
import { useDebounce } from '@uidotdev/usehooks';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { oplogApi } from '@/lib/api';
import { toast } from 'sonner';
import {
  CheckCircle,
  XCircle,
  FileText,
  User,
  MessageSquare,
} from 'lucide-react';
import Link from '@/components/common/Link';
import { Loading } from '@/components/common/Loading';
import { Pager } from '@/components/common/Pagination';
import Time from '@/components/common/Time';
import {
  ACTION_COLORS,
  ACTION_FILTER_OPTIONS,
  getActionDescription,
  isSelfAction,
} from '@/constants/oplog';

export function OperationLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    targetType: 'all',
    action: 'all',
  });
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);

  useEffect(() => {
    if (page !== 1) {
      setPage(1);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    loadLogs();
  }, [page, pageSize, filters, debouncedSearch]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await oplogApi.getLogs({
        ...filters,
        search: debouncedSearch,
        page,
        limit: pageSize,
      });
      setLogs(data.items || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to load operation logs:', error);
      toast.error('加载操作日志失败');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
    setPage(1);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize);
    setPage(1);
  };

  return (
    <div className='space-y-4'>
      {/* 筛选器 */}
      <div className='flex flex-wrap gap-4 items-center justify-between'>
        <div className='flex items-center gap-4'>
          <div className='w-50'>
            <Input
              placeholder='搜索操作人用户名...'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className='flex items-center gap-4'>
          <div className='flex items-center gap-2'>
            <span className='text-sm text-muted-foreground'>类型:</span>
            <Select
              value={filters.targetType}
              onValueChange={(value) => handleFilterChange('targetType', value)}
            >
              <SelectTrigger className='w-35'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>全部</SelectItem>
                <SelectItem value='topic'>话题</SelectItem>
                <SelectItem value='post'>回复</SelectItem>
                <SelectItem value='user'>用户</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className='flex items-center gap-2'>
          <span className='text-sm text-muted-foreground'>操作:</span>
          <Select
            value={filters.action}
            onValueChange={(value) => handleFilterChange('action', value)}
          >
            <SelectTrigger className='w-35'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTION_FILTER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        </div>
      </div>

      {/* 日志列表 */}
      {loading ? (
        <Loading text='加载中...' className='py-12' />
      ) : logs.length === 0 ? (
        <div className='border border-border rounded-lg p-12 bg-card'>
          <div className='text-center text-muted-foreground'>
            <FileText className='h-12 w-12 mx-auto mb-4 opacity-50' />
            <p>暂无操作日志</p>
          </div>
        </div>
      ) : (
        <>
          <div className='space-y-3'>
            {logs.map((log) => {
              const actionDescription = getActionDescription(log.action, log.targetType);
              const actionColor = ACTION_COLORS[log.action] || 'text-foreground';
              const hiddenTarget = isSelfAction(log.action);

              const ActionIcon =
                {
                  approve: CheckCircle,
                  reject: XCircle,
                  topic: FileText,
                  post: MessageSquare,
                  user: User,
                }[log.targetType] || FileText;

              return (
                <div
                  key={log.id}
                  className='border border-border rounded-lg p-4 bg-card hover:border-muted-foreground/30 transition-colors'
                >
                  <div className='flex items-start gap-3'>
                    <ActionIcon className='h-5 w-5 mt-0.5 text-muted-foreground shrink-0' />
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center gap-2 flex-wrap mb-2'>
                        <span className='font-medium'>
                          {log.moderatorName || log.moderatorUsername}
                        </span>
                        <span className={actionColor}>
                          {actionDescription}
                        </span>
                        {log.targetInfo && !hiddenTarget && (
                          <>
                            {log.targetType === 'topic' &&
                              log.targetInfo.title && (
                                <Link
                                  href={`/topic/${log.targetId}`}
                                  className='text-primary hover:underline truncate'
                                >
                                  「{log.targetInfo.title}」
                                </Link>
                              )}
                            {log.targetType === 'post' &&
                              log.targetInfo.content && (
                                <>
                                  <span className='text-sm text-muted-foreground truncate'>
                                    「{log.targetInfo.content}」
                                  </span>
                                  <Link
                                    href={`/topic/${log.targetInfo.topicId}#post-${log.targetId}`}
                                    className='text-primary hover:underline truncate'
                                  >
                                    ({log.targetInfo.topicTitle})
                                  </Link>
                                </>
                              )}
                            {log.targetType === 'user' &&
                              log.targetInfo.username && (
                                <span className='text-sm font-medium'>
                                  @{log.targetInfo.username}
                                  {log.targetInfo.label && (
                                    <span className='text-muted-foreground font-normal'>
                                      {' · '}
                                      {log.targetInfo.label}
                                    </span>
                                  )}
                                </span>
                              )}
                          </>
                        )}
                      </div>
                      {log.reason && (
                        <p className='text-sm text-muted-foreground mb-2'>
                          原因: {log.reason}
                        </p>
                      )}
                      {log.previousStatus && log.newStatus && (
                        <p className='text-xs text-muted-foreground'>
                          状态: {log.previousStatus} → {log.newStatus}
                        </p>
                      )}
                      <p className='text-xs text-muted-foreground mt-2'>
                        <Time date={log.createdAt} />
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 分页 */}
          {total > 0 && (
            <Pager
              total={total}
              page={page}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              pageSizeOptions={[10, 20, 50]}
            />
          )}
        </>
      )}
    </div>
  );
}
