import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';

export function BadgeFormDialog({ open, onOpenChange, mode, initialData, onSubmit }) {
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm({
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      iconUrl: '',
      category: 'general',
      unlockCondition: '{}',
      displayOrder: 0,
      isActive: true,
    },
  });

  useEffect(() => {
    if (open && mode === 'edit' && initialData) {
      reset({
        name: initialData.name,
        slug: initialData.slug,
        description: initialData.description || '',
        iconUrl: initialData.iconUrl,
        category: initialData.category || 'general',
        unlockCondition: initialData.unlockCondition || '{}',
        displayOrder: initialData.displayOrder || 0,
        isActive: initialData.isActive !== false,
      });
    } else if (open && mode === 'create') {
      reset({
        name: '',
        slug: '',
        description: '',
        iconUrl: '',
        category: 'general',
        unlockCondition: '{"type": "manual"}',
        displayOrder: 0,
        isActive: true,
      });
    }
  }, [open, mode, initialData, reset]);

  const onFormSubmit = async (data) => {
    try {
      // Validate JSON
      try {
        JSON.parse(data.unlockCondition);
      } catch (e) {
        toast.error('解锁条件必须是有效的 JSON 格式');
        return;
      }
      
      await onSubmit(data);
    } catch (error) {
       // handled by parent
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? '新建勋章' : '编辑勋章'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">名称</Label>
            <Input 
              id="name" 
              {...register('name', { required: '请输入勋章名称' })} 
            />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug (唯一标识)</Label>
            <Input 
              id="slug" 
              placeholder="例如: checkin-master" 
              {...register('slug', { required: '请输入唯一标识 (Slug)' })} 
            />
            {errors.slug && <p className="text-sm text-red-500">{errors.slug.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="iconUrl">图标 URL</Label>
            <Input 
              id="iconUrl" 
              placeholder="/images/badges/example.png" 
              {...register('iconUrl', { required: '请输入图标 URL' })} 
            />
            <p className="text-sm text-gray-500">建议使用 200x200 像素的 PNG 图片</p>
            {errors.iconUrl && <p className="text-sm text-red-500">{errors.iconUrl.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">分类</Label>
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择分类" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">通用 (General)</SelectItem>
                    <SelectItem value="achievement">成就 (Achievement)</SelectItem>
                    <SelectItem value="event">活动 (Event)</SelectItem>
                    <SelectItem value="manual">人工 (Manual)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">描述</Label>
            <Textarea 
              id="description" 
              {...register('description')} 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="unlockCondition">解锁条件 (JSON)</Label>
            <Textarea 
              id="unlockCondition" 
              className="font-mono text-xs" 
              rows={5}
              {...register('unlockCondition')} 
            />
            <p className="text-sm text-gray-500">
              配置自动解锁规则。例如: {'{"type": "checkin_streak", "threshold": 30}'}
            </p>
          </div>
          
          <div className="flex gap-4">
            <div className="space-y-2 flex-1">
              <Label htmlFor="displayOrder">排序权重</Label>
              <Input 
                id="displayOrder" 
                type="number" 
                {...register('displayOrder', { valueAsNumber: true })} 
              />
            </div>

            <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm flex-1 mt-6">
              <div className="space-y-0.5">
                <Label htmlFor="isActive">启用状态</Label>
              </div>
              <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                  <Switch
                    id="isActive"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="mr-2">
              取消
            </Button>
            <Button type="submit">
              {mode === 'create' ? '创建' : '保存'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
