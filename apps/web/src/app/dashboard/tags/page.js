'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/common/DataTable';
import { ActionMenu } from '@/components/common/ActionMenu';
import { PageHeader } from '@/components/common/PageHeader';
import { Plus, Edit, Trash2, Tag as TagIcon } from 'lucide-react';
import { useTagManagement } from '@/hooks/dashboard/useTagManagement';
import { TagFormDialog } from './components/TagFormDialog';

export default function TagsManagement() {
  const {
    items: tags,
    loading,
    search,
    setSearch,
    page,
    total,
    limit,
    setPage,
    showDialog,
    setShowDialog,
    isEdit,
    submitting,
    formData,
    setFormData,
    openCreateDialog,
    openEditDialog,
    handleSubmit,
    handleDeleteClick,
  } = useTagManagement();

  const columns = [
    {
      key: 'name',
      label: '标签',
      width: 'w-50',
      render: (_, tag) => (
        <Badge className='text-xs'>
          <TagIcon className='h-3 w-3 mr-1' />
          {tag.name}
        </Badge>
      ),
    },
    {
      key: 'slug',
      label: 'Slug',
      width: 'w-50',
      render: (value) => (
        <code className='text-xs text-muted-foreground bg-muted px-2 py-1 rounded'>
          {value}
        </code>
      ),
    },
    {
      key: 'description',
      label: '描述',
      render: (value) => (
        <span className='text-sm text-muted-foreground'>{value || '-'}</span>
      ),
    },
    {
      key: 'topicCount',
      label: '使用次数',
      width: 'w-25',
      render: (value) => <span className='text-sm'>{value || 0}</span>,
    },
    {
      key: 'actions',
      label: '操作',
      align: 'right',
      sticky: 'right',
      render: (_, tag) => (
        <ActionMenu
          mode='inline'
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
  ];

  return (
    <div className='space-y-6'>
      <PageHeader
        title='标签管理'
        description='管理话题标签和分类标记'
        actions={
          <Button onClick={openCreateDialog}>
            <Plus className='h-4 w-4' />
            创建标签
          </Button>
        }
      />

      <DataTable
        columns={columns}
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
        emptyMessage='暂无标签'
      />

      <TagFormDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        isEdit={isEdit}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        submitting={submitting}
      />
    </div>
  );
}
