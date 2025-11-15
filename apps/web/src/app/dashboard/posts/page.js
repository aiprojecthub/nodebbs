'use client';

import { useState, useEffect } from 'react';
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
import { postApi } from '@/lib/api';
import { toast } from 'sonner';
import {
  Loader2,
  MoreHorizontal,
  Trash2,
  Eye,
  Clock,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import Link from 'next/link';
import Time from '@/components/forum/Time';

export default function AdminPostsPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteType, setDeleteType] = useState('soft'); // 'soft' or 'hard'
  const [deleting, setDeleting] = useState(false);
  const limit = 20;

  // 防抖搜索词
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);

  // 搜索输入防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

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

  const handleDeleteClick = (post, type) => {
    setDeleteTarget(post);
    setDeleteType(type);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      await postApi.delete(deleteTarget.id, deleteType === 'hard');
      toast.success(deleteType === 'hard' ? '回复已彻底删除' : '回复已删除');
      setDeleteDialogOpen(false);

      // 局部更新
      setPosts((prevPosts) => {
        // 硬删除：直接从列表中移除
        if (deleteType === 'hard') {
          setTotal((prev) => Math.max(0, prev - 1));
          return prevPosts.filter((post) => post.id !== deleteTarget.id);
        }

        // 软删除：更新状态
        const updatedPosts = prevPosts.map((post) =>
          post.id === deleteTarget.id ? { ...post, isDeleted: true } : post
        );

        // 如果当前筛选不包含已删除的项，则移除
        if (statusFilter !== 'all' && statusFilter !== 'deleted') {
          setTotal((prev) => Math.max(0, prev - 1));
          return updatedPosts.filter((post) => post.id !== deleteTarget.id);
        }

        return updatedPosts;
      });

      setDeleteTarget(null);
    } catch (error) {
      toast.error('删除失败');
    } finally {
      setDeleting(false);
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
        <div className='flex flex-col gap-1'>
          <div className='text-sm line-clamp-2'>{value}</div>
          <div className='flex items-center gap-2 text-xs text-muted-foreground'>
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
            <DropdownMenuItem asChild>
              <Link href={`/topic/${row.topicId}#post-${row.id}`} target='_blank'>
                <Eye className='h-4 w-4' />
                查看回复
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {!row.isDeleted && (
              <DropdownMenuItem
                onClick={() => handleDeleteClick(row, 'soft')}
                className='text-orange-600'
              >
                <Trash2 className='h-4 w-4' />
                软删除
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => handleDeleteClick(row, 'hard')}
              className='text-destructive'
            >
              <Trash2 className='h-4 w-4' />
              彻底删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div>
      <div className='mb-6'>
        <h1 className='text-2xl font-bold text-foreground mb-1'>回复管理</h1>
        <p className='text-sm text-muted-foreground'>
          管理所有回复，支持查看和删除操作
        </p>
      </div>

      {/* 数据表格 */}
      <DataTable
        columns={columns}
        data={posts}
        loading={loading}
        search={{
          value: searchQuery,
          onChange: (value) => {
            setSearchQuery(value);
            setPage(1);
          },
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
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteType === 'hard' ? '确认彻底删除？' : '确认删除？'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteType === 'hard' ? (
                <>
                  此操作将
                  <span className='font-semibold text-destructive'>
                    彻底删除
                  </span>
                  该回复，包括所有点赞和相关数据。
                  <br />
                  <span className='font-semibold'>此操作不可恢复！</span>
                </>
              ) : (
                <>
                  此操作将软删除该回复。
                  <br />
                  软删除后回复将不再显示，但数据仍保留在数据库中。
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleting}
              className={
                deleteType === 'hard'
                  ? 'bg-destructive hover:bg-destructive/90'
                  : ''
              }
            >
              {deleting ? (
                <>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  删除中...
                </>
              ) : (
                '确认删除'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
