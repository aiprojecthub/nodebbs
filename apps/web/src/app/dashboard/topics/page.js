'use client';

import { useState, useEffect } from 'react';
import { useDebounce } from '@uidotdev/usehooks';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/common/DataTable';
import { ActionMenu } from '@/components/common/ActionMenu';
import { confirm } from '@/components/common/ConfirmPopover';
import { PageHeader } from '@/components/common/PageHeader';
import { topicApi } from '@/lib/api';
import { toast } from 'sonner';
import {
  Loader2,
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

export default function AdminTopicsPage() {
  const { hasPermission, hasCondition } = usePermission();
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const limit = 20;

  // 防抖搜索词
  const debouncedSearch = useDebounce(searchQuery, 500);

  // 搜索词变化时重置页码
  useEffect(() => {
    if (page !== 1) {
      setPage(1);
    }
  }, [debouncedSearch]);

  // 数据请求 - page 和 statusFilter 立即响应，debouncedSearch 变化也会触发（因为已经在 fetchTopics 中使用了，但这里需要确保重新获取）
  // 注意：当 debouncedSearch 变化导致的 setPage(1) 会触发这里的 useEffect (如果 page 改变了)。
  // 如果 page 本来就是 1，setPage(1) 不会触发重渲染，所以我们需要将 debouncedSearch 加入依赖。
  useEffect(() => {
    fetchTopics();
  }, [page, statusFilter, debouncedSearch]);

  const fetchTopics = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        dashboard: true,
      };

      // 添加搜索参数 - 使用防抖后的搜索词
      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }

      if (statusFilter !== 'all') {
        if (statusFilter === 'deleted') {
          params.isDeleted = true;
        } else if (statusFilter === 'pinned') {
          params.isPinned = true;
        } else if (statusFilter === 'closed') {
          params.isClosed = true;
        } else if (statusFilter === 'pending') {
          params.approvalStatus = 'pending';
        } else if (statusFilter === 'rejected') {
          params.approvalStatus = 'rejected';
        }
      }

      const data = await topicApi.getList(params);
      setTopics(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('获取话题列表失败:', err);
      toast.error(err.message || '获取话题列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePin = async (topicId, isPinned) => {
    try {
      await topicApi.update(topicId, { isPinned: !isPinned });
      toast.success(isPinned ? '已取消置顶' : '已置顶');

      // 局部更新：直接修改本地状态
      setTopics((prevTopics) => {
        const updatedTopics = prevTopics.map((topic) =>
          topic.id === topicId ? { ...topic, isPinned: !isPinned } : topic
        );

        // 如果筛选条件是 'pinned'，且取消了置顶，则移除该项
        if (statusFilter === 'pinned' && isPinned) {
          setTotal((prev) => Math.max(0, prev - 1));
          return updatedTopics.filter((topic) => topic.id !== topicId);
        }

        return updatedTopics;
      });
    } catch (err) {
      toast.error(err.message || '操作失败');
    }
  };

  const handleToggleClosed = async (topicId, isClosed) => {
    try {
      await topicApi.update(topicId, { isClosed: !isClosed });
      toast.success(isClosed ? '已重新开启' : '已关闭');

      // 局部更新：直接修改本地状态
      setTopics((prevTopics) => {
        const updatedTopics = prevTopics.map((topic) =>
          topic.id === topicId ? { ...topic, isClosed: !isClosed } : topic
        );

        // 如果筛选条件是 'closed'，且重新开启了，则移除该项
        if (statusFilter === 'closed' && isClosed) {
          setTotal((prev) => Math.max(0, prev - 1));
          return updatedTopics.filter((topic) => topic.id !== topicId);
        }

        return updatedTopics;
      });
    } catch (err) {
      toast.error(err.message || '操作失败');
    }
  };

  const handleDeleteClick = async (e, topic, type) => {
    const isHard = type === 'hard';
    const confirmed = await confirm(e, {
      title: isHard ? '确认彻底删除？' : '确认删除？',
      description: isHard
        ? `此操作将彻底删除话题 "${topic.title}"，包括所有回复和相关数据。此操作不可恢复！`
        : `此操作将逻辑删除话题 "${topic.title}"。删除后话题将不再显示，但数据仍保留在数据库中。`,
      confirmText: '确认删除',
      variant: isHard ? 'destructive' : 'default',
    });

    if (!confirmed) return;

    try {
      await topicApi.delete(topic.id, isHard);
      toast.success(isHard ? '话题已彻底删除' : '话题已删除');

      // 局部更新：直接修改本地状态
      setTopics((prevTopics) => {
        // 彻底删除：直接从列表中移除
        if (isHard) {
          setTotal((prev) => Math.max(0, prev - 1));
          return prevTopics.filter((t) => t.id !== topic.id);
        }

        // 逻辑删除：根据筛选条件决定是更新还是移除
        const updatedTopics = prevTopics.map((t) =>
          t.id === topic.id ? { ...t, isDeleted: true } : t
        );

        // 如果当前筛选不包含已删除的项，则移除
        if (statusFilter !== 'all' && statusFilter !== 'deleted') {
          setTotal((prev) => Math.max(0, prev - 1));
          return updatedTopics.filter((t) => t.id !== topic.id);
        }

        return updatedTopics;
      });
    } catch (err) {
      console.error('删除失败:', err);
      toast.error(err.message || '删除失败');
    }
  };

  // 定义表格列
  const columns = [
    {
      key: 'id',
      label: 'ID',
      width: 'w-[60px]',
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
      width: 'w-[120px]',
      render: (value) => (
        <Badge variant='secondary' className='text-xs'>
          {value}
        </Badge>
      ),
    },
    {
      key: 'username',
      label: '作者',
      width: 'w-[120px]',
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
      width: 'w-[100px]',
      render: (_, row) => {
        // 优先显示审核状态
        if (row.approvalStatus === 'pending') {
          return (
            <Badge
              variant='outline'
              className='text-chart-5 border-chart-5 text-xs'
            >
              待审核
            </Badge>
          );
        }
        if (row.approvalStatus === 'rejected') {
          return (
            <Badge
              variant='outline'
              className='text-destructive border-destructive text-xs'
            >
              已拒绝
            </Badge>
          );
        }
        // 其次显示删除和关闭状态
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
      width: 'w-[120px]',
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

      {/* 数据表格 */}
      <DataTable
        columns={columns}
        data={topics}
        loading={loading}
        search={{
          value: searchQuery,
          onChange: (value) => setSearchQuery(value),
          placeholder: '搜索话题标题...',
        }}
        filter={{
          value: statusFilter,
          onChange: setStatusFilter,
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
      />

      {/* 删除确认对话框 */}

    </div>
  );
}
