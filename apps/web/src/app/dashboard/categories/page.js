'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/common/DataTable';
import { ActionMenu } from '@/components/common/ActionMenu';
import { confirm } from '@/components/common/ConfirmPopover';
import { FormDialog } from '@/components/common/FormDialog';
import { PageHeader } from '@/components/common/PageHeader';
import { Plus, Edit, Trash2, Loader2, Lock } from 'lucide-react';
import { categoryApi } from '@/lib/api';
import { toast } from 'sonner';
import CategorySelector from '@/components/topic/CategorySelector';
import { Loading } from '@/components/common/Loading';
import FeaturedCategorySortable from './components/FeaturedCategorySortable';
import Link from 'next/link';

export default function CategoriesManagement() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('create'); // 'create' or 'edit'

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'featured'
  const [reordering, setReordering] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    color: '#3B82F6',
    icon: '',
    parentId: null,
    position: 0,
    isPrivate: false,
    isFeatured: false,
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const data = await categoryApi.getAll();
      setCategories(data);
    } catch (err) {
      console.error('获取分类失败:', err);
      toast.error('获取分类失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('请输入分类名称');
      return;
    }

    setSubmitting(true);
    try {
      if (dialogMode === 'create') {
        await categoryApi.create(formData);
        toast.success('分类创建成功');
      } else {
        await categoryApi.update(selectedCategory.id, formData);
        toast.success('分类更新成功');
      }
      setShowDialog(false);
      resetForm();
      fetchCategories();
    } catch (err) {
      console.error(
        `${dialogMode === 'create' ? '创建' : '更新'}分类失败:`,
        err
      );
      toast.error(
        `${dialogMode === 'create' ? '创建' : '更新'}失败：` + err.message
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = async (e, category) => {
    const confirmed = await confirm(e, {
      title: '确认删除？',
      description: (
        <>
          确定要删除分类 "{category.name}" 吗？此操作不可撤销。
          {category.topicCount > 0 && (
            <span className='block mt-2 text-destructive'>
              注意：该分类下有 {category.topicCount} 个话题，无法删除。
            </span>
          )}
        </>
      ),
      confirmText: '删除',
      variant: 'destructive',
      confirmDisabled: category.topicCount > 0,
      className: 'w-96'
    });

    if (!confirmed) return;

    setSubmitting(true);
    try {
      await categoryApi.delete(category.id);
      toast.success('分类删除成功');
      setSelectedCategory(null);
      fetchCategories();
    } catch (err) {
      console.error('删除分类失败:', err);
      toast.error('删除失败：' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openCreateDialog = () => {
    setDialogMode('create');
    resetForm();
    setShowDialog(true);
  };

  const openEditDialog = (category) => {
    setDialogMode('edit');
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      color: category.color || '#3B82F6',
      icon: category.icon || '',
      parentId: category.parentId || null,
      position: category.position !== undefined ? category.position : 0,
      isPrivate: category.isPrivate || false,
      isFeatured: category.isFeatured || false,
    });
    setShowDialog(true);
  };



  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      color: '#3B82F6',
      icon: '',
      parentId: null,
      position: 0,
      isPrivate: false,
      isFeatured: false,
    });
    setSelectedCategory(null);
  };

  // 构建树形结构并按顺序展开分类列表
  const flattenCategories = (cats) => {
    const result = [];

    // 创建分类映射，用于快速查找和计算层级
    const categoryMap = new Map();
    cats.forEach((cat) => {
      categoryMap.set(cat.id, cat);
    });

    // 计算分类的层级深度
    const calculateLevel = (catId, visited = new Set()) => {
      if (visited.has(catId)) return 0; // 防止循环引用
      visited.add(catId);

      const cat = categoryMap.get(catId);
      if (!cat || !cat.parentId) return 0;

      const parent = categoryMap.get(cat.parentId);
      if (!parent) return 0;

      return 1 + calculateLevel(cat.parentId, visited);
    };

    // 按 name 字母排序（position 只用于精选分类）
    const sortByName = (a, b) => a.name.localeCompare(b.name);

    // 递归添加分类及其子分类
    const addCategoryAndChildren = (parentId) => {
      // 找到所有属于当前父分类的子分类
      const children = cats
        .filter((cat) => {
          if (parentId === null) {
            return cat.parentId === null || cat.parentId === undefined;
          }
          return cat.parentId === parentId;
        })
        .sort(sortByName);

      // 添加每个分类及其子分类
      children.forEach((cat) => {
        const level = calculateLevel(cat.id);
        result.push({ ...cat, level });
        // 递归添加子分类
        addCategoryAndChildren(cat.id);
      });
    };

    // 从顶级分类开始
    addCategoryAndChildren(null);

    return result;
  };

  const flatCategories = flattenCategories(categories);

  // 计算精选分类列表（按 position 排序）
  const featuredCategories = useMemo(() => 
    categories
      .filter(c => c.isFeatured)
      .sort((a, b) => (a.position || 0) - (b.position || 0)),
    [categories]
  );

  // 处理精选分类拖拽排序
  const handleReorder = async (newOrder) => {
    setReordering(true);
    try {
      const items = newOrder.map((id, index) => ({ id, position: index }));
      await categoryApi.batchReorder(items);
      toast.success('排序已保存');
      fetchCategories(); // 刷新列表
    } catch (err) {
      console.error('更新排序失败:', err);
      toast.error('排序保存失败：' + err.message);
    } finally {
      setReordering(false);
    }
  };

  // if (loading) {
  //   return <Loading text='加载中...' className='py-12' />;
  // }

  return (
    <div className='space-y-6'>
      <PageHeader
        title='分类管理'
        description='管理论坛的分类和子分类'
        actions={
          <Button onClick={openCreateDialog}>
            <Plus className='h-4 w-4' />
            创建分类
          </Button>
        }
      />

      {/* Tab 切换 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value='all'>全部分类</TabsTrigger>
          <TabsTrigger value='featured' className='gap-2'>
            精选分类
            {featuredCategories.length > 0 && (
              <Badge variant='secondary'>
                {featuredCategories.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value='all' className='mt-4'>

      {/* Categories table */}
      <DataTable
        columns={[
          {
            key: 'name',
            label: '名称',
            render: (_, category) => {
              const parentCategory = category.parentId
                ? flatCategories.find((c) => c.id === category.parentId)
                : null;

              return (
                <div className='flex flex-col gap-1'>
                  <div className='flex items-center gap-2'>
                    {/* 层级缩进 */}
                    {category.level > 0 && (
                      <span
                        className='text-muted-foreground text-xs'
                        style={{ marginLeft: `${(category.level - 1) * 20}px` }}
                      >
                        └─
                      </span>
                    )}
                    {category.icon && (
                      <span className='text-lg'>{category.icon}</span>
                    )}
                    <span className='font-medium text-sm'>{category.name}</span>
                    {category.isFeatured && (
                      <span className='px-1.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded'>
                        精选
                      </span>
                    )}
                    {category.isPrivate && (
                      <Lock
                        className='h-3.5 w-3.5 text-muted-foreground'
                        title='私有分类'
                      />
                    )}
                  </div>
                  {parentCategory && (
                    <div
                      className='text-xs text-muted-foreground'
                      style={{ marginLeft: `${category.level * 20 + 20}px` }}
                    >
                      父分类: {parentCategory.name}
                    </div>
                  )}
                </div>
              );
            },
          },
          {
            key: 'slug',
            label: 'Slug',
            width: 'w-[200px]',
            render: (value) => (
              <code className='text-xs text-muted-foreground bg-muted px-2 py-1 rounded'>
                {value}
              </code>
            ),
          },
          {
            key: 'color',
            label: '颜色',
            width: 'w-[150px]',
            render: (value) => (
              <div className='flex items-center gap-2'>
                <div
                  className='w-5 h-5 rounded border border-border'
                  style={{ backgroundColor: value }}
                />
                <span className='text-xs text-muted-foreground font-mono'>
                  {value}
                </span>
              </div>
            ),
          },
          {
            key: 'topicCount',
            label: '话题数',
            width: 'w-[100px]',
            render: (value) => <span className='text-sm'>{value || 0}</span>,
          },
          {
            key: 'actions',
            label: '操作',
            align: 'right',
            sticky: 'right',
            render: (_, category) => (
              <ActionMenu
                mode="inline"
                items={[
                  {
                    label: '编辑',
                    icon: Edit,
                    onClick: () => openEditDialog(category),
                  },
                  {
                    label: '删除',
                    icon: Trash2,
                    variant: 'destructive',
                    onClick: (e) => handleDeleteClick(e, category),
                  },
                ]}
              />
            ),
          },
        ]}
        data={flatCategories}
        loading={loading}
        emptyMessage='暂无分类'
      />
        </TabsContent>

        <TabsContent value='featured' className='mt-4'>
          <FeaturedCategorySortable
            categories={featuredCategories}
            onReorder={handleReorder}
            loading={reordering}
          />
        </TabsContent>
      </Tabs>
      <FormDialog
         open={showDialog}
         onOpenChange={setShowDialog}
         title={dialogMode === 'create' ? '创建分类' : '编辑分类'}
         description={dialogMode === 'create'
           ? '添加一个新的论坛分类'
           : '修改分类信息'}
         submitText={dialogMode === 'create' ? '创建' : '保存'}
         onSubmit={handleSubmit}
         loading={submitting}
      >
          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <Label htmlFor='name'>名称 *</Label>
              <Input
                id='name'
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder='分类名称'
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='slug'>
                Slug{dialogMode === 'create' ? '（可选）' : ''}
              </Label>
              <Input
                id='slug'
                value={formData.slug}
                onChange={(e) =>
                  setFormData({ ...formData, slug: e.target.value })
                }
                placeholder={dialogMode === 'create' ? '自动生成' : ''}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='parentId'>父分类（可选）</Label>
              <CategorySelector
                value={formData.parentId}
                onChange={(value) =>
                  setFormData({ ...formData, parentId: value })
                }
                placeholder='无（顶级分类）'
                excludeId={selectedCategory?.id}
                // onlyTopLevel={true}
              />
              <p className='text-xs text-muted-foreground mt-1'>
                选择一个父分类，使此分类成为子分类
              </p>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='description'>描述</Label>
              <Textarea
                id='description'
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder='分类描述'
                rows={3}
              />
            </div>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='color'>颜色</Label>
                <Input
                  id='color'
                  type='color'
                  value={formData.color}
                  onChange={(e) =>
                    setFormData({ ...formData, color: e.target.value })
                  }
                />
              </div>
              <div  className='space-y-2'>
                <Label htmlFor='icon'>图标（Emoji）</Label>
                <Input
                  id='icon'
                  value={formData.icon}
                  onChange={(e) =>
                    setFormData({ ...formData, icon: e.target.value })
                  }
                  placeholder='📁'
                  maxLength={2}
                />
              </div>
            </div>
            <div className='flex items-center justify-between space-x-2 rounded-lg border border-border p-4'>
              <div className='space-y-0.5'>
                <Label htmlFor='isFeatured' className='text-base'>
                  精选分类
                </Label>
                <p className='text-sm text-muted-foreground'>
                  精选分类会优先显示在列表顶部
                </p>
              </div>
              <Switch
                id='isFeatured'
                checked={formData.isFeatured}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isFeatured: checked })
                }
              />
            </div>
            <div className='flex items-center justify-between space-x-2 rounded-lg border border-border p-4'>
              <div className='space-y-0.5'>
                <Label htmlFor='isPrivate' className='text-base'>
                  私有分类
                </Label>
                <p className='text-sm text-muted-foreground'>
                  只有管理员和版主可以查看和发布
                </p>
              </div>
              <Switch
                id='isPrivate'
                checked={formData.isPrivate}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isPrivate: checked })
                }
              />
            </div>
          </div>
      </FormDialog>

      {/* 删除确认对话框 */}

    </div>
  );
}
