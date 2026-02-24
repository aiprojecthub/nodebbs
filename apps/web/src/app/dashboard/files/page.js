'use client';

import { useState, useEffect } from 'react';
import { useDebounce } from '@uidotdev/usehooks';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/common/DataTable';
import { ActionMenu } from '@/components/common/ActionMenu';
import { PageHeader } from '@/components/common/PageHeader';
import UserAvatar from '@/components/user/UserAvatar';
import { confirm } from '@/components/common/ConfirmPopover';
import ImagePreview from '@/components/common/ImagePreview';
import { Trash2, ExternalLink, Image, FileText, Film, Music, HardDrive, Cloud } from 'lucide-react';
import { filesApi } from '@/lib/api';
import { toast } from 'sonner';
import Time from '@/components/common/Time';
import { usePermission } from '@/hooks/usePermission';
import { getImageUrl } from '@/lib/utils';

// 文件大小格式化
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 根据 MIME 类型获取图标
function getFileIcon(mimetype) {
  if (mimetype?.startsWith('image/')) return Image;
  if (mimetype?.startsWith('video/')) return Film;
  if (mimetype?.startsWith('audio/')) return Music;
  return FileText;
}

// 分类标签颜色
const categoryColors = {
  avatars: 'bg-blue-100 text-blue-800',
  topics: 'bg-green-100 text-green-800',
  assets: 'bg-gray-100 text-gray-800',
  badges: 'bg-yellow-100 text-yellow-800',
  items: 'bg-purple-100 text-purple-800',
  frames: 'bg-pink-100 text-pink-800',
  emojis: 'bg-orange-100 text-orange-800',
};

export default function FilesManagement() {
  const { hasPermission } = usePermission();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [submitting, setSubmitting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  const limit = 20;

  useEffect(() => {
    if (page === 1) {
      fetchFiles();
    } else {
      setPage(1);
    }
  }, [debouncedSearch, categoryFilter]);

  useEffect(() => {
    fetchFiles();
  }, [page]);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (debouncedSearch) params.search = debouncedSearch;
      if (categoryFilter !== 'all') params.category = categoryFilter;

      const data = await filesApi.getList(params);
      setFiles(data.items);
      setTotal(data.total);
    } catch (err) {
      console.error('获取文件列表失败:', err);
      toast.error('获取文件列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = async (e, file) => {
    const confirmed = await confirm(e, {
      title: '确认删除文件？',
      description: (
        <>
          确定要删除文件 &quot;{file.originalName || file.filename}&quot; 吗？
          <br />
          <span className="text-destructive">此操作不可恢复！</span>
        </>
      ),
      confirmText: '确认删除',
      variant: 'destructive',
    });
    if (!confirmed) return;

    setSubmitting(true);
    try {
      await filesApi.delete(file.id);
      toast.success('文件已删除');
      setFiles(prev => prev.filter(f => f.id !== file.id));
      setTotal(prev => prev - 1);
    } catch (err) {
      console.error('删除失败:', err);
      toast.error(err.message || '删除失败');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'preview',
      label: '预览',
      width: 'w-[80px]',
      render: (_, file) => {
        const isImage = file.mimetype?.startsWith('image/');
        if (isImage) {
          const fullUrl = getImageUrl(file.url);
          return (
            <div
              className="w-24 h-24 rounded border overflow-hidden bg-muted cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => {
                setPreviewUrl(fullUrl);
                setPreviewOpen(true);
              }}
            >
              <img
                src={getImageUrl(file.url, 'embed,f_webp,s_200x200')}
                alt={file.originalName || file.filename}
                className="w-full h-full object-cover"
              />
            </div>
          );
        }
        const Icon = getFileIcon(file.mimetype);
        return (
          <div className="w-12 h-12 rounded border flex items-center justify-center bg-muted">
            <Icon className="w-6 h-6 text-muted-foreground" />
          </div>
        );
      },
    },
    {
      key: 'filename',
      label: '文件名',
      render: (_, file) => (
        <div className="max-w-[200px]">
          <div className="font-medium text-sm truncate" title={file.originalName || file.filename}>
            {file.originalName || file.filename}
          </div>
          {file.width && file.height && (
            <div className="text-xs text-muted-foreground">
              {file.width} × {file.height}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'category',
      label: '分类',
      width: 'w-[100px]',
      render: (value) => (
        <Badge variant="secondary" className={categoryColors[value] || ''}>
          {value}
        </Badge>
      ),
    },
    {
      key: 'size',
      label: '大小',
      width: 'w-[100px]',
      render: (value) => (
        <span className="text-sm text-muted-foreground">
          {formatFileSize(value)}
        </span>
      ),
    },
    {
      key: 'provider',
      label: '存储',
      width: 'w-[100px]',
      render: (value) => {
        const provider = value || 'local';
        const isLocal = provider === 'local';
        const Icon = isLocal ? HardDrive : Cloud;
        return (
          <Badge variant="outline" className={`gap-1 ${
            isLocal
              ? 'border-slate-300 text-slate-600'
              : 'border-sky-300 text-sky-700'
          }`}>
            <Icon className="w-3 h-3" />
            {provider}
          </Badge>
        );
      },
    },
    {
      key: 'user',
      label: '上传者',
      width: 'w-[150px]',
      render: (user) => user ? (
        <div className="flex items-center gap-2">
          <UserAvatar url={user.avatar} name={user.username} size="xs" />
          <span className="text-sm">{user.username}</span>
        </div>
      ) : (
        <span className="text-sm text-muted-foreground">-</span>
      ),
    },
    {
      key: 'createdAt',
      label: '上传时间',
      width: 'w-[120px]',
      render: (value) => (
        <span className="text-xs text-muted-foreground">
          <Time date={value} />
        </span>
      ),
    },
    {
      key: 'actions',
      label: '操作',
      align: 'right',
      sticky: 'right',
      render: (_, file) => (
        <ActionMenu
          items={[
            {
              label: '查看',
              icon: ExternalLink,
              onClick: () => window.open(file.url, '_blank'),
            },
            { separator: true },
            {
              label: '删除',
              icon: Trash2,
              variant: 'destructive',
              onClick: (e) => handleDeleteClick(e, file),
              hidden: !hasPermission('dashboard.files'),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="文件管理"
        description="管理用户上传的文件"
      />

      <DataTable
        columns={columns}
        data={files}
        loading={loading}
        search={{
          value: search,
          onChange: (value) => setSearch(value),
          placeholder: '搜索文件名...',
        }}
        filter={{
          value: categoryFilter,
          onChange: setCategoryFilter,
          options: [
            { value: 'all', label: '全部分类' },
            { value: 'avatars', label: '头像' },
            { value: 'topics', label: '话题' },
            { value: 'assets', label: '资源' },
            { value: 'badges', label: '勋章' },
            { value: 'items', label: '商品' },
            { value: 'frames', label: '头像框' },
            { value: 'emojis', label: '表情' },
          ],
        }}
        pagination={{ page, total, limit, onPageChange: setPage }}
        emptyMessage="暂无文件"
      />

      <ImagePreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        images={[previewUrl]}
      />
    </div>
  );
}
