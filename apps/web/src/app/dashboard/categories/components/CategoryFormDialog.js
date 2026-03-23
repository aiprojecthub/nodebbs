import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { FormDialog } from '@/components/common/FormDialog';
import CategorySelector from '@/components/topic/CategorySelector';

export function CategoryFormDialog({
  open,
  onOpenChange,
  mode,
  selectedCategory,
  formData,
  setFormData,
  onSubmit,
  submitting,
}) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={mode === 'create' ? '创建分类' : '编辑分类'}
      description={mode === 'create' ? '添加一个新的论坛分类' : '修改分类信息'}
      submitText={mode === 'create' ? '创建' : '保存'}
      onSubmit={onSubmit}
      loading={submitting}
    >
      <div className='space-y-4 py-4'>
        <div className='space-y-2'>
          <Label htmlFor='name'>名称 *</Label>
          <Input
            id='name'
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder='分类名称'
          />
        </div>
        <div className='space-y-2'>
          <Label htmlFor='slug'>
            Slug{mode === 'create' ? '（可选）' : ''}
          </Label>
          <Input
            id='slug'
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            placeholder={mode === 'create' ? '自动生成' : ''}
          />
        </div>
        <div className='space-y-2'>
          <Label htmlFor='parentId'>父分类（可选）</Label>
          <CategorySelector
            value={formData.parentId}
            onChange={(value) => setFormData({ ...formData, parentId: value })}
            placeholder='无（顶级分类）'
            excludeId={selectedCategory?.id}
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
              私有分类不会出现在前台，仅拥有管理权限的用户可以访问
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
  );
}
