import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { badgesApi } from '@/extensions/badges/api';
import UserAvatar from '@/components/forum/UserAvatar';
import { useAuth } from '@/contexts/AuthContext';
import { FormDialog } from '@/components/common/FormDialog';

/**
 * 创建/编辑商品的表单对话框
 * @param {Object} props
 * @param {boolean} props.open - 对话框打开状态
 * @param {Function} props.onOpenChange - 打开状态改变时的回调
 * @param {'create'|'edit'} props.mode - 表单模式
 * @param {Object} props.initialData - 编辑模式下的初始表单数据
 * @param {Function} props.onSubmit - 表单提交时的回调
 * @param {boolean} props.submitting - 提交进行中
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

  const { user } = useAuth();
  const [badges, setBadges] = useState([]);
  const [loadingBadges, setLoadingBadges] = useState(false);

  // 当类型为勋章时获取勋章列表
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
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={mode === 'create' ? '新建商品' : '编辑商品'}
      description={mode === 'create' ? '创建一个新的商城商品' : '修改商品信息'}
      maxWidth="max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden"
      submitText={mode === 'create' ? '创建' : '更新'}
      loading={submitting}
      onSubmit={handleSubmit}
      disabled={!formData.name.trim()}
    >
        <div className="space-y-4 py-4">
          {/* 商品类型 */}
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

          {/* 头像框预览 */}
          {formData.type === ITEM_TYPES.AVATAR_FRAME && (
            <div className="flex items-center gap-4 p-4 bg-background rounded-lg border">
              <div className="flex-1 space-y-1">
                <Label>头像框预览</Label>
                <p className="text-xs text-muted-foreground">
                  基于下方“元数据”配置的实时效果预览。
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center gap-1">
                   <UserAvatar 
                      name={user?.name || user?.username || 'Preview'} 
                      size="lg" 
                      url={user?.avatar}
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
                      name={user?.name || user?.username || 'Preview'} 
                      size="md" 
                      url={user?.avatar}
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

          {/* 勋章选择器（仅限勋章类型） */}
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
                <SelectTrigger className='bg-background'>
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

          {/* 名称 */}
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

          {/* 描述 */}
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
              className="resize-none"
            />
          </div>

          {/* 数值网格 */}
          <div className="grid grid-cols-3 gap-4">
            {/* 价格 */}
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

            {/* 库存 */}
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

            {/* 显示顺序 */}
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

          {/* 图片 URL */}
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

          {/* 元数据 */}
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
              className="font-mono text-xs resize-none break-all"
            />
            <p className="text-xs text-muted-foreground">
              用于存储头像框样式、勋章图标等。
              {formData.type === ITEM_TYPES.AVATAR_FRAME && ' 修改此处可实时预览上方效果。'}
            </p>
          </div>

          {/* 是否上架 */}
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
    </FormDialog>
  );
}
