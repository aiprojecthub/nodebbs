'use client';

import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { ActionMenu } from '@/components/common/ActionMenu';
import { FormDialog } from '@/components/common/FormDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import Time from '@/components/common/Time';
import { Check, Edit, ExternalLink, Plus, Trash2, X } from 'lucide-react';
import { usePageManagement } from '@/hooks/dashboard/usePageManagement';

function getTypeBadgeClassName(type) {
  if (type === 'text') return 'bg-slate-100 text-slate-800';
  if (type === 'html') return 'bg-emerald-100 text-emerald-800';
  if (type === 'markdown') return 'bg-blue-100 text-blue-800';
  if (type === 'json') return 'bg-amber-100 text-amber-800';
  return '';
}

function getContentPlaceholder(type) {
  if (type === 'json') {
    return '{\n  "key": "value"\n}';
  }

  if (type === 'html') {
    return '<section>\n  <h1>页面标题</h1>\n  <p>请输入 HTML 内容</p>\n</section>';
  }

  if (type === 'markdown') {
    return '# 页面标题\n\n请输入 Markdown 内容';
  }

  return '请输入页面内容';
}

function getTypeDescription(type) {
  if (type === 'text') {
    return '纯文本输出，适合 ads.txt、校验文件等文件型页面。';
  }

  if (type === 'html') {
    return '站内 HTML 页面，适合自定义落地页或静态说明页。';
  }

  if (type === 'markdown') {
    return '站内 Markdown 页面，适合文档、帮助页和说明页。';
  }

  if (type === 'json') {
    return 'JSON 原始输出，适合配置文件或接口型页面。';
  }

  return '';
}

function normalizeSlugPreview(value) {
  return String(value || '')
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .replace(/\/{2,}/g, '/')
    .toLowerCase();
}

export default function PagesManagementPage() {
  const {
    items: pages,
    loading,
    search,
    setSearch,
    filters,
    setFilter,
    page,
    total,
    limit,
    submitting,
    showDialog,
    dialogMode,
    formData,
    setFormData,
    PAGE_TYPES,
    setShowDialog,
    openCreateDialog,
    openEditDialog,
    handleTypeChange,
    handleSubmit,
    handleDelete,
    handleTogglePublished,
    setPage,
  } = usePageManagement();
  const normalizedSlug = normalizeSlugPreview(formData.slug);
  const routePreview = normalizedSlug ? `/${normalizedSlug}` : '/your-page';
  const typeDescription = getTypeDescription(formData.type);

  const columns = [
    {
      key: 'title',
      label: '页面',
      render: (_, pageItem) => (
        <div className='space-y-1'>
          <div className='font-medium text-sm'>{pageItem.title}</div>
          <div className='flex items-center gap-2 text-xs text-muted-foreground'>
            <code className='bg-muted px-2 py-0.5 rounded'>{pageItem.slug}</code>
            <a
              href={`/${pageItem.slug}`}
              target='_blank'
              rel='noreferrer'
              className='inline-flex items-center gap-1 hover:text-foreground'
            >
              访问
              <ExternalLink className='h-3 w-3' />
            </a>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      label: '类型',
      width: 'w-30',
      render: (value, pageItem) => (
        <div className='flex items-center gap-1.5'>
          <Badge variant='secondary' className={getTypeBadgeClassName(value)}>
            {value}
          </Badge>
          {pageItem.standalone && (
            <Badge variant='outline' className='text-xs'>
              独立页面
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'isPublished',
      label: '状态',
      width: 'w-30',
      render: (value) => (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? '已发布' : '草稿'}
        </Badge>
      ),
    },
    {
      key: 'updatedAt',
      label: '更新时间',
      width: 'w-45',
      render: (value) => (
        <Time date={value} format='YYYY-MM-DD HH:mm' className='text-sm text-muted-foreground' />
      ),
    },
    {
      key: 'actions',
      label: '操作',
      align: 'right',
      sticky: 'right',
      render: (_, pageItem) => (
        <ActionMenu
          items={[
            {
              label: '编辑',
              icon: Edit,
              onClick: () => openEditDialog(pageItem),
            },
            {
              label: pageItem.isPublished ? '设为草稿' : '立即发布',
              icon: pageItem.isPublished ? X : Check,
              onClick: () => handleTogglePublished(pageItem, !pageItem.isPublished),
              disabled: Boolean(pageItem._statusUpdating),
            },
            { separator: true },
            {
              label: '删除',
              icon: Trash2,
              variant: 'destructive',
              onClick: (e) => handleDelete(e, pageItem),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div className='space-y-6'>
      <PageHeader
        title='页面管理'
        description='管理 text、html、markdown、json 类型的自定义页面'
        actions={(
          <Button onClick={openCreateDialog}>
            <Plus className='h-4 w-4' />
            创建页面
          </Button>
        )}
      />

      <DataTable
        columns={columns}
        data={pages}
        loading={loading}
        emptyMessage='暂无页面'
        search={{
          value: search,
          onChange: setSearch,
          placeholder: '搜索页面标题...',
        }}
        filters={[
          {
            value: filters.typeFilter,
            onChange: (value) => setFilter('typeFilter', value),
            options: [
              { value: 'all', label: '全部类型' },
              ...PAGE_TYPES.map((type) => ({ value: type, label: type })),
            ],
          },
          {
            value: filters.statusFilter,
            onChange: (value) => setFilter('statusFilter', value),
            options: [
              { value: 'all', label: '全部状态' },
              { value: 'published', label: '已发布' },
              { value: 'draft', label: '草稿' },
            ],
          },
        ]}
        pagination={{
          page,
          total,
          limit,
          onPageChange: setPage,
        }}
      />

      <FormDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        title={dialogMode === 'create' ? '创建页面' : '编辑页面'}
        description='创建自定义页面，支持 text、html、markdown、json 类型'
        onSubmit={handleSubmit}
        loading={submitting}
        submitText={dialogMode === 'create' ? '创建' : '保存'}
        maxWidth='sm:max-w-4xl'
      >
        <div className='space-y-5 pb-2'>
          <div className='grid gap-4 md:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='title'>页面标题</Label>
              <Input
                id='title'
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder='例如：Ads 文本页'
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='slug'>页面路径</Label>
              <Input
                id='slug'
                value={formData.slug}
                onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                placeholder='例如：ads.txt 或 a/b/c'
              />
              <p className='text-xs text-muted-foreground'>
                无需输入前导 `/`，支持斜杠嵌套如 `a/b/c`
              </p>
            </div>
          </div>

          <div className='grid gap-4 md:grid-cols-2'>
            <div className='space-y-2'>
              <Label>页面类型</Label>
              <Select value={formData.type} onValueChange={handleTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <Label>访问预览</Label>
              <div className='rounded-lg border bg-muted/30 px-3 py-2.5 space-y-1.5'>
                <div className='font-mono text-sm'>{routePreview}</div>
                <p className='text-xs text-muted-foreground'>
                  {typeDescription}
                </p>
              </div>
            </div>
          </div>

          {(formData.type === 'html' || formData.type === 'markdown') && (
            <div className='flex items-center justify-between rounded-lg border px-4 py-3'>
              <div className='space-y-0.5'>
                <Label htmlFor='standalone'>独立页面模式</Label>
                <p className='text-xs text-muted-foreground'>
                  开启后页面将独立渲染，不继承站点布局和样式
                </p>
              </div>
              <Switch
                id='standalone'
                checked={formData.standalone}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, standalone: checked }))}
              />
            </div>
          )}

          <div className='space-y-2'>
            <Label htmlFor='content'>页面内容</Label>
            <Textarea
              id='content'
              value={formData.content}
              onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
              placeholder={getContentPlaceholder(formData.type)}
              className='min-h-[360px] font-mono text-sm'
            />
          </div>
        </div>
      </FormDialog>
    </div>
  );
}
