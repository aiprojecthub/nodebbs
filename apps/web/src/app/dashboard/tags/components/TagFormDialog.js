import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FormDialog } from '@/components/common/FormDialog';

export function TagFormDialog({
  open,
  onOpenChange,
  isEdit,
  formData,
  setFormData,
  onSubmit,
  submitting,
}) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? '编辑标签' : '创建标签'}
      description={isEdit ? '修改标签信息' : '添加一个新的话题标签'}
      submitText={isEdit ? '保存' : '创建'}
      onSubmit={onSubmit}
      loading={submitting}
    >
      <div className='space-y-4 py-4'>
        <div className='space-y-2'>
          <Label htmlFor='name'>标签名称 *</Label>
          <Input
            id='name'
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            placeholder='例如：JavaScript'
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
          <Label htmlFor='description'>描述</Label>
          <Textarea
            id='description'
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder='标签描述'
            rows={3}
          />
        </div>
      </div>
    </FormDialog>
  );
}
