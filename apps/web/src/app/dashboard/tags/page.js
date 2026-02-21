'use client';

import { useState, useEffect } from 'react';
import { useDebounce } from '@uidotdev/usehooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/common/DataTable';
import { ActionMenu } from '@/components/common/ActionMenu';
import { confirm } from '@/components/common/ConfirmPopover';
import { FormDialog } from '@/components/common/FormDialog';
import { PageHeader } from '@/components/common/PageHeader';
import { Plus, Edit, Trash2, Loader2, Tag as TagIcon } from 'lucide-react';
import { tagApi } from '@/lib/api';
import { toast } from 'sonner';

export default function TagsManagement() {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [showDialog, setShowDialog] = useState(false);
  const [isEdit, setIsEdit] = useState(false);

  const [selectedTag, setSelectedTag] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const limit = 50;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
  });

  useEffect(() => {
    if (page === 1) {
      fetchTags();
    } else {
      setPage(1);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchTags();
  }, [page]);

  const fetchTags = async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (debouncedSearch) params.search = debouncedSearch;

      const data = await tagApi.getList(params);
      setTags(data.items);
      setTotal(data.total);
    } catch (err) {
      console.error('获取标签失败:', err);
      toast.error('获取标签失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchTags();
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('请输入标签名称');
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        const updatedTag = await tagApi.update(selectedTag.id, formData);
        // 局部更新：替换列表中的标签
        setTags(tags.map(tag => tag.id === selectedTag.id ? updatedTag : tag));
        toast.success('标签更新成功');
      } else {
        const newTag = await tagApi.create(formData);
        // 局部更新：添加新标签到列表开头
        setTags([newTag, ...tags]);
        setTotal(total + 1);
        toast.success('标签创建成功');
      }
      setShowDialog(false);
      resetForm();
    } catch (err) {
      console.error(`${isEdit ? '更新' : '创建'}标签失败:`, err);
      toast.error(err.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = async (e, tag) => {
    const confirmed = await confirm(e, {
      title: '确认删除？',
      description: (
        <>
          确定要删除标签 "{tag.name}" 吗？此操作不可撤销。
          {tag.topicCount > 0 && (
            <span className="block mt-2 text-orange-600">
              注意：该标签被 {tag.topicCount} 个话题使用。
            </span>
          )}
        </>
      ),
      confirmText: '删除',
      variant: 'destructive',
    });

    if (!confirmed) return;

    setSubmitting(true);
    try {
      await tagApi.delete(tag.id);
      // 局部更新：从列表中移除删除的标签
      setTags((prevTags) => prevTags.filter((t) => t.id !== tag.id));
      setTotal((prev) => prev - 1);
      toast.success('标签删除成功');
      setSelectedTag(null);
    } catch (err) {
      console.error('删除标签失败:', err);
      toast.error(err.message || '删除失败');
    } finally {
      setSubmitting(false);
    }
  };

  const openCreateDialog = () => {
    resetForm();
    setIsEdit(false);
    setShowDialog(true);
  };

  const openEditDialog = (tag) => {
    setSelectedTag(tag);
    setFormData({
      name: tag.name,
      slug: tag.slug,
      description: tag.description || '',
      color: tag.color || '#3B82F6',
    });
    setIsEdit(true);
    setShowDialog(true);
  };



  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: '#3B82F6',
    });
    setSelectedTag(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title='标签管理'
        description='管理话题标签和分类标记'
        actions={
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4" />
            创建标签
          </Button>
        }
      />

      {/* Tags table */}
      <DataTable
        columns={[
          {
            key: 'name',
            label: '标签',
            width: 'w-[200px]',
            render: (_, tag) => (
              <Badge
                style={{
                  backgroundColor: tag.color,
                  color: '#fff',
                }}
                className="text-xs"
              >
                <TagIcon className="h-3 w-3 mr-1" />
                {tag.name}
              </Badge>
            ),
          },
          {
            key: 'slug',
            label: 'Slug',
            width: 'w-[200px]',
            render: (value) => (
              <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                {value}
              </code>
            ),
          },
          {
            key: 'description',
            label: '描述',
            render: (value) => (
              <span className="text-sm text-muted-foreground">{value || '-'}</span>
            ),
          },
          {
            key: 'topicCount',
            label: '使用次数',
            width: 'w-[100px]',
            render: (value) => <span className="text-sm">{value || 0}</span>,
          },
          {
            key: 'actions',
            label: '操作',
            align: 'right',
            sticky: 'right',
            render: (_, tag) => (
              <ActionMenu
                mode="inline"
                items={[
                  {
                    label: '编辑',
                    icon: Edit,
                    onClick: () => openEditDialog(tag),
                  },
                  {
                    label: '删除',
                    icon: Trash2,
                    onClick: (e) => handleDeleteClick(e, tag),
                    variant: 'destructive',
                  },
                ]}
              />
            ),
          },
        ]}
        data={tags}
        loading={loading}
        search={{
          value: search,
          onChange: (value) => setSearch(value),
          placeholder: '搜索标签...',
        }}
        pagination={{
          page,
          total,
          limit,
          onPageChange: setPage,
        }}
        emptyMessage="暂无标签"
      />

      {/* 标签对话框 */}
      <FormDialog
          open={showDialog}
          onOpenChange={setShowDialog}
          title={isEdit ? '编辑标签' : '创建标签'}
          description={isEdit ? '修改标签信息' : '添加一个新的话题标签'}
          submitText={isEdit ? '保存' : '创建'}
          onSubmit={handleSubmit}
          loading={submitting}
      >
          <div className="space-y-4 py-4">
            <div className='space-y-2'>
              <Label htmlFor="name">标签名称 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例如：JavaScript"
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='slug'>
                Slug{isEdit ? '' : '（可选）'}
              </Label>
              <Input
                id='slug'
                value={formData.slug || ''}
                onChange={(e) =>
                  setFormData({ ...formData, slug: e.target.value })
                }
                placeholder='自动生成'
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor="description">描述</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="标签描述"
                rows={3}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor="color">颜色</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-20 h-10"
                />
                <Badge
                  style={{
                    backgroundColor: formData.color,
                    color: '#fff',
                  }}
                >
                  预览
                </Badge>
              </div>
            </div>
          </div>
      </FormDialog>

      {/* 删除确认对话框 */}

    </div>
  );
}
