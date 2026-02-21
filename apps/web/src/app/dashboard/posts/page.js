'use client';

import { useState, useEffect } from 'react';
import { useDebounce } from '@uidotdev/usehooks';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/common/DataTable';
import { ActionMenu } from '@/components/common/ActionMenu';
import { confirm } from '@/components/common/ConfirmPopover';
import { PageHeader } from '@/components/common/PageHeader';
import { postApi } from '@/lib/api';
import { toast } from 'sonner';
import {
  Loader2,
  Trash2,
  Eye,
  Clock,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import Link from '@/components/common/Link';
import Time from '@/components/common/Time';
import { usePermission } from '@/hooks/usePermission';

export default function AdminPostsPage() {
  const { hasPermission, hasCondition } = usePermission();
  const [posts, setPosts] = useState([]);
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

  // 数据请求
  useEffect(() => {
    fetchPosts();
  }, [page, statusFilter, debouncedSearch]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
      };

      // 添加搜索参数
      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }

      // 状态过滤
      if (statusFilter === 'deleted') {
        // 只显示已删除的回复
        params.isDeleted = true;
      } else if (statusFilter !== 'all') {
        // 显示特定审核状态的回复（包括已删除和未删除）
        params.approvalStatus = statusFilter;
      }
      // statusFilter === 'all' 时不传参数，使用后端默认值（显示所有）

      const data = await postApi.getAdminList(params);
      setPosts(data.items || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('获取回复列表失败:', error);
      toast.error('获取回复列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = async (e, post, type) => {
    const isHard = type === 'hard';
    const confirmed = await confirm(e, {
      title: isHard ? '确认彻底删除？' : '确认删除？',
      description: isHard
        ? '此操作将彻底删除该回复，包括所有点赞和相关数据。此操作不可恢复！'
        : '此操作将逻辑删除该回复。删除后回复将不再显示，但数据仍保留在数据库中。',
      confirmText: '确认删除',
      variant: isHard ? 'destructive' : 'default',
    });

    if (!confirmed) return;

    try {
      await postApi.delete(post.id, isHard);
      toast.success(isHard ? '回复已彻底删除' : '回复已删除');

      // 局部更新
      setPosts((prevPosts) => {
        // 彻底删除：直接从列表中移除
        if (isHard) {
          setTotal((prev) => Math.max(0, prev - 1));
          return prevPosts.filter((p) => p.id !== post.id);
        }

        // 逻辑删除：更新状态
        const updatedPosts = prevPosts.map((p) =>
          p.id === post.id ? { ...p, isDeleted: true } : p
        );

        // 如果当前筛选不包含已删除的项，则移除
        if (statusFilter !== 'all' && statusFilter !== 'deleted') {
          setTotal((prev) => Math.max(0, prev - 1));
          return updatedPosts.filter((p) => p.id !== post.id);
        }

        return updatedPosts;
      });
    } catch (error) {
      console.error('删除失败:', error);
      toast.error('删除失败');
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
      width: 'w-[120px]',
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
      width: 'w-[100px]',
      render: (_, row) => {
        // 优先显示审核状态
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
        // 其次显示删除状态
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
      width: 'w-[80px]',
      align: 'center',
      render: (value) => (
        <span className='text-sm text-muted-foreground'>{value}</span>
      ),
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

      {/* 数据表格 */}
      <DataTable
        columns={columns}
        data={posts}
        loading={loading}
        search={{
          value: searchQuery,
          onChange: (value) => setSearchQuery(value),
          placeholder: '搜索回复内容...',
        }}
        filter={{
          value: statusFilter,
          onChange: setStatusFilter,
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

      {/* 删除确认对话框 */}

    </div>
  );
}
