import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import { ITEM_TYPES, getItemTypeLabel } from '../../utils/itemTypes';
import { badgesApi } from '@/features/badges/api';
import UserAvatar from '@/components/forum/UserAvatar';

/**
 * Form dialog for creating/editing shop items
 * @param {Object} props
 * @param {boolean} props.open - Dialog open state
 * @param {Function} props.onOpenChange - Callback when open state changes
 * @param {'create'|'edit'} props.mode - Form mode
 * @param {Object} props.initialData - Initial form data for edit mode
 * @param {Function} props.onSubmit - Callback when form submitted
 * @param {boolean} props.submitting - Submission in progress
 */
export function ShopItemFormDialog({ open, onOpenChange, mode, initialData, onSubmit, submitting }) {
  const [formData, setFormData] = useState({
    type: ITEM_TYPES.AVATAR_FRAME,
    name: '',
    description: '',
    price: 0,
    imageUrl: '',
    stock: null,
    displayOrder: 0,
    isActive: true,
    metadata: '',
  });

  const [badges, setBadges] = useState([]);
  const [loadingBadges, setLoadingBadges] = useState(false);

  // Fetch badges when type is badge
  useEffect(() => {
    if (open && formData.type === 'badge') {
      fetchBadges();
    }
  }, [open, formData.type]);

  const fetchBadges = async () => {
    try {
      setLoadingBadges(true);
      const data = await badgesApi.getAll();
      setBadges(data.items || []);
    } catch (error) {
      console.error('Failed to fetch badges:', error);
    } finally {
      setLoadingBadges(false);
    }
  };

  const handleBadgeSelect = (badgeId) => {
    const badge = badges.find(b => b.id.toString() === badgeId.toString());
    if (badge) {
      setFormData(prev => ({
        ...prev,
        name: badge.name,
        description: badge.description || '',
        imageUrl: badge.iconUrl,
        metadata: JSON.stringify({ badgeId: badge.id }),
      }));
    }
  };

  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setFormData({
        type: initialData.type,
        name: initialData.name,
        description: initialData.description || '',
        price: initialData.price,
        imageUrl: initialData.imageUrl || '',
        stock: initialData.stock,
        displayOrder: initialData.displayOrder || 0,
        isActive: initialData.isActive,
        metadata: initialData.metadata || '',
      });
    } else if (mode === 'create') {
      setFormData({
        type: ITEM_TYPES.AVATAR_FRAME,
        name: '',
        description: '',
        price: 0,
        imageUrl: '',
        stock: null,
        displayOrder: 0,
        isActive: true,
        metadata: '',
      });
    }
  }, [mode, initialData, open]);

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      return;
    }
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? '新建商品' : '编辑商品'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' ? '创建一个新的商城商品' : '修改商品信息'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Item Type */}
          <div className="space-y-2">
            <Label htmlFor="type">商品类型 *</Label>
            <Select
              value={formData.type}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, type: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="选择商品类型" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(ITEM_TYPES).map((type) => (
                  <SelectItem key={type} value={type}>
                    {getItemTypeLabel(type)}
                  </SelectItem>
                ))}
                {!Object.values(ITEM_TYPES).includes('badge') && (
                    <SelectItem value="badge">勋章</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Avatar Frame Preview */}
          {formData.type === ITEM_TYPES.AVATAR_FRAME && (
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg border">
              <div className="flex-1 space-y-1">
                <Label>头像框预览</Label>
                <p className="text-xs text-muted-foreground">
                  基于下方“元数据”配置的实时效果预览。
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center gap-1">
                   <UserAvatar 
                      name="Preview" 
                      size="lg" 
                      url={formData.imageUrl || undefined}
                      frameMetadata={(() => {
                        try {
                          return formData.metadata ? JSON.parse(formData.metadata) : null;
                        } catch (e) {
                          return null;
                        }
                      })()} 
                   />
                   <span className="text-xs text-muted-foreground">大图</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                   <UserAvatar 
                      name="Preview" 
                      size="md" 
                      url={formData.imageUrl || undefined}
                      frameMetadata={(() => {
                        try {
                          return formData.metadata ? JSON.parse(formData.metadata) : null;
                        } catch (e) {
                          return null;
                        }
                      })()} 
                   />
                   <span className="text-xs text-muted-foreground">中图</span>
                </div>
              </div>
            </div>
          )}

          {/* Badge Selector (Only for Badge Type) */}
          {formData.type === 'badge' && (
            <div className="space-y-2 p-4 bg-muted rounded-lg border">
              <Label>关联勋章</Label>
              <Select
                value={(() => {
                  try {
                    const meta = formData.metadata ? JSON.parse(formData.metadata) : {};
                    return meta.badgeId ? String(meta.badgeId) : undefined;
                  } catch (e) {
                    return undefined;
                  }
                })()}
                onValueChange={handleBadgeSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择一个现有勋章..." />
                </SelectTrigger>
                <SelectContent>
                   {loadingBadges ? (
                       <div className="p-2 text-center text-sm text-muted-foreground">加载中...</div>
                   ) : badges.length > 0 ? (
                       badges.map(badge => (
                           <SelectItem key={badge.id} value={badge.id.toString()}>
                               <div className="flex items-center gap-2">
                                   <img src={badge.iconUrl} className="w-4 h-4 object-contain" alt="" />
                                   <span>{badge.name}</span>
                               </div>
                           </SelectItem>
                       ))
                   ) : (
                       <div className="p-2 text-center text-sm text-muted-foreground">暂无可用勋章</div>
                   )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                选择勋章会自动填充名称、图片和元数据。
              </p>
            </div>
          )}

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">商品名称 *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="输入商品名称"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">商品描述</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="输入商品描述"
              rows={3}
            />
          </div>

          {/* Grid for Numbers */}
          <div className="grid grid-cols-3 gap-4">
            {/* Price */}
            <div className="space-y-2">
              <Label htmlFor="price">价格（积分）*</Label>
              <Input
                id="price"
                type="number"
                min="0"
                value={formData.price}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, price: e.target.value }))
                }
                placeholder="0"
              />
            </div>

            {/* Stock */}
            <div className="space-y-2">
              <Label htmlFor="stock">库存</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={formData.stock === null ? '' : formData.stock}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    stock: e.target.value === '' ? null : e.target.value,
                  }))
                }
                placeholder="不限"
              />
            </div>

            {/* Display Order */}
            <div className="space-y-2">
              <Label htmlFor="displayOrder">显示排序</Label>
              <Input
                id="displayOrder"
                type="number"
                value={formData.displayOrder}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    displayOrder: e.target.value,
                  }))
                }
                placeholder="0"
              />
            </div>
          </div>

          {/* Image URL */}
          <div className="space-y-2">
            <Label htmlFor="imageUrl">图片URL</Label>
            <div className="flex gap-4">
                <div className="flex-1">
                    <Input
                      id="imageUrl"
                      value={formData.imageUrl}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, imageUrl: e.target.value }))
                      }
                      placeholder="https://..."
                    />
                </div>
                {formData.imageUrl && (
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-muted border shrink-0">
                    <Image
                      src={formData.imageUrl}
                      alt="预览"
                      fill
                      className="object-contain"
                    />
                  </div>
                )}
            </div>
          </div>

          {/* Metadata */}
          <div className="space-y-2">
            <Label htmlFor="metadata">元数据（JSON格式）</Label>
            <Textarea
              id="metadata"
              value={formData.metadata}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, metadata: e.target.value }))
              }
              placeholder='{"border": "2px solid gold", "animation": "glow"}'
              rows={4}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              用于存储头像框样式、勋章图标等。
              {formData.type === ITEM_TYPES.AVATAR_FRAME && ' 修改此处可实时预览上方效果。'}
            </p>
          </div>

          {/* Is Active */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="isActive">是否上架</Label>
              <p className="text-xs text-muted-foreground">
                下架后用户将无法看到和购买此商品
              </p>
            </div>
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, isActive: checked }))
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !formData.name.trim()}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {mode === 'create' ? '创建中...' : '更新中...'}
              </>
            ) : mode === 'create' ? (
              '创建'
            ) : (
              '更新'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
