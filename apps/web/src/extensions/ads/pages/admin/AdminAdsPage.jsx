'use client';

import { useState, useEffect } from 'react';
import { confirm } from '@/components/common/ConfirmPopover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/common/DatePicker';
import { DataTable } from '@/components/common/DataTable';
import { ActionMenu } from '@/components/common/ActionMenu';
import { FormDialog } from '@/components/common/FormDialog';
import { PageHeader } from '@/components/common/PageHeader';
import { Pager } from '@/components/common/Pagination';
import { Plus, Edit, Trash2, LayoutGrid, Image, Code, FileCode, Eye, MousePointer } from 'lucide-react';
import { adsApi } from '@/lib/api';
import { toast } from 'sonner';

// 广告类型配置
const AD_TYPES = {
  image: { label: '图片广告', icon: Image, color: 'bg-blue-100 text-blue-800' },
  html: { label: 'HTML 广告', icon: Code, color: 'bg-green-100 text-green-800' },
  script: { label: '脚本广告', icon: FileCode, color: 'bg-purple-100 text-purple-800' },
};

export default function AdminAdsPage() {
  const [activeTab, setActiveTab] = useState('ads');

  // 广告位状态
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [showSlotDialog, setShowSlotDialog] = useState(false);
  const [slotDialogMode, setSlotDialogMode] = useState('create');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [slotSubmitting, setSlotSubmitting] = useState(false);
  const [slotFormData, setSlotFormData] = useState({
    name: '',
    code: '',
    description: '',
    width: '',
    height: '',
    maxAds: 1,
    isActive: true,
  });

  // 广告状态
  const [ads, setAds] = useState([]);
  const [adsTotal, setAdsTotal] = useState(0);
  const [adsLoading, setAdsLoading] = useState(true);
  const [adsPage, setAdsPage] = useState(1);
  const [showAdDialog, setShowAdDialog] = useState(false);
  const [adDialogMode, setAdDialogMode] = useState('create');
  const [selectedAd, setSelectedAd] = useState(null);
  const [adSubmitting, setAdSubmitting] = useState(false);
  const [adFormData, setAdFormData] = useState({
    slotId: '',
    title: '',
    type: 'image',
    content: '',
    linkUrl: '',
    targetBlank: true,
    priority: 0,
    startAt: null,
    endAt: null,
    isActive: true,
    remark: '',
  });

  const limit = 20;

  // 获取广告位列表
  const fetchSlots = async () => {
    setSlotsLoading(true);
    try {
      const data = await adsApi.admin.slots.getAll();
      setSlots(data);
    } catch (err) {
      console.error('获取广告位失败:', err);
      toast.error('获取广告位失败');
    } finally {
      setSlotsLoading(false);
    }
  };

  // 获取广告列表
  const fetchAds = async () => {
    setAdsLoading(true);
    try {
      const data = await adsApi.admin.getAds({ page: adsPage, limit });
      setAds(data.items);
      setAdsTotal(data.total);
    } catch (err) {
      console.error('获取广告失败:', err);
      toast.error('获取广告失败');
    } finally {
      setAdsLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, []);

  useEffect(() => {
    fetchAds();
  }, [adsPage]);

  // ============ 广告位操作 ============
  const openCreateSlotDialog = () => {
    setSlotDialogMode('create');
    setSelectedSlot(null);
    setSlotFormData({
      name: '',
      code: '',
      description: '',
      width: '',
      height: '',
      maxAds: 1,
      isActive: true,
    });
    setShowSlotDialog(true);
  };

  const openEditSlotDialog = (slot) => {
    setSlotDialogMode('edit');
    setSelectedSlot(slot);
    setSlotFormData({
      name: slot.name,
      code: slot.code,
      description: slot.description || '',
      width: slot.width || '',
      height: slot.height || '',
      maxAds: slot.maxAds || 1,
      isActive: slot.isActive,
    });
    setShowSlotDialog(true);
  };

  const handleSlotSubmit = async () => {
    if (!slotFormData.name.trim()) {
      toast.error('请输入广告位名称');
      return;
    }
    if (!slotFormData.code.trim()) {
      toast.error('请输入广告位代码');
      return;
    }

    setSlotSubmitting(true);
    try {
      const submitData = {
        ...slotFormData,
        width: slotFormData.width ? parseInt(slotFormData.width) : null,
        height: slotFormData.height ? parseInt(slotFormData.height) : null,
        maxAds: parseInt(slotFormData.maxAds) || 1,
      };

      if (slotDialogMode === 'create') {
        await adsApi.admin.slots.create(submitData);
        toast.success('广告位创建成功');
      } else {
        await adsApi.admin.slots.update(selectedSlot.id, submitData);
        toast.success('广告位更新成功');
      }
      setShowSlotDialog(false);
      fetchSlots();
    } catch (err) {
      console.error(`${slotDialogMode === 'create' ? '创建' : '更新'}广告位失败:`, err);
      toast.error(`${slotDialogMode === 'create' ? '创建' : '更新'}失败：` + err.message);
    } finally {
      setSlotSubmitting(false);
    }
  };

  const handleDeleteSlot = async (e, slot) => {
    const confirmed = await confirm(e, {
      title: '确认删除',
      description: `确定要删除广告位 "${slot.name}" 吗？该广告位下的所有广告也将被删除。`,
      confirmText: '删除',
      variant: 'destructive',
    });

    if (!confirmed) return;

    try {
      await adsApi.admin.slots.delete(slot.id);
      toast.success('广告位删除成功');
      fetchSlots();
    } catch (err) {
      console.error('删除广告位失败:', err);
      toast.error('删除失败：' + err.message);
    }
  };

  const handleToggleSlotStatus = async (slot) => {
    const newStatus = !slot.isActive;
    
    // Optimistic update
    setSlots(prev => prev.map(item => 
      item.id === slot.id ? { ...item, isActive: newStatus, _updating: true } : item
    ));

    try {
      await adsApi.admin.slots.update(slot.id, { isActive: newStatus });
      toast.success(newStatus ? '广告位已启用' : '广告位已禁用');
      
      // Confirm update (clear loading state)
      setSlots(prev => prev.map(item => 
        item.id === slot.id ? { ...item, isActive: newStatus, _updating: false } : item
      ));
    } catch (err) {
      console.error('更新广告位状态失败:', err);
      toast.error('更新状态失败：' + err.message);
      // Revert on failure
      setSlots(prev => prev.map(item => 
        item.id === slot.id ? { ...item, isActive: !newStatus, _updating: false } : item
      ));
    }
  };

  // ============ 广告操作 ============
  const openCreateAdDialog = () => {
    setAdDialogMode('create');
    setSelectedAd(null);
    setAdFormData({
      slotId: slots.length > 0 ? slots[0].id.toString() : '',
      title: '',
      type: 'image',
      content: '',
      linkUrl: '',
      targetBlank: true,
      priority: 0,
      startAt: null,
      endAt: null,
      isActive: true,
      remark: '',
    });
    setShowAdDialog(true);
  };

  const openEditAdDialog = (ad) => {
    setAdDialogMode('edit');
    setSelectedAd(ad);
    setAdFormData({
      slotId: ad.slotId.toString(),
      title: ad.title,
      type: ad.type,
      content: ad.content || '',
      linkUrl: ad.linkUrl || '',
      targetBlank: ad.targetBlank,
      priority: ad.priority || 0,
      startAt: ad.startAt ? new Date(ad.startAt) : null,
      endAt: ad.endAt ? new Date(ad.endAt) : null,
      isActive: ad.isActive,
      remark: ad.remark || '',
    });
    setShowAdDialog(true);
  };

  const handleAdSubmit = async () => {
    if (!adFormData.slotId) {
      toast.error('请选择广告位');
      return;
    }
    if (!adFormData.title.trim()) {
      toast.error('请输入广告标题');
      return;
    }

    setAdSubmitting(true);
    try {
      const submitData = {
        ...adFormData,
        slotId: parseInt(adFormData.slotId),
        priority: parseInt(adFormData.priority) || 0,
        startAt: adFormData.startAt ? adFormData.startAt.toISOString() : null,
        endAt: adFormData.endAt ? adFormData.endAt.toISOString() : null,
      };

      if (adDialogMode === 'create') {
        await adsApi.admin.createAd(submitData);
        toast.success('广告创建成功');
      } else {
        await adsApi.admin.updateAd(selectedAd.id, submitData);
        toast.success('广告更新成功');
      }
      setShowAdDialog(false);
      fetchAds();
    } catch (err) {
      console.error(`${adDialogMode === 'create' ? '创建' : '更新'}广告失败:`, err);
      toast.error(`${adDialogMode === 'create' ? '创建' : '更新'}失败：` + err.message);
    } finally {
      setAdSubmitting(false);
    }
  };

  const handleDeleteAd = async (e, ad) => {
    const confirmed = await confirm(e, {
      title: '确认删除',
      description: `确定要删除广告 "${ad.title}" 吗？`,
      confirmText: '删除',
      variant: 'destructive',
    });

    if (!confirmed) return;

    try {
      await adsApi.admin.deleteAd(ad.id);
      toast.success('广告删除成功');
      fetchAds();
    } catch (err) {
      console.error('删除广告失败:', err);
      toast.error('删除失败：' + err.message);
    }
  };

  const handleToggleAdStatus = async (ad) => {
    const newStatus = !ad.isActive;
    
    // Optimistic update
    setAds(prev => prev.map(item => 
      item.id === ad.id ? { ...item, isActive: newStatus, _updating: true } : item
    ));

    try {
      await adsApi.admin.updateAd(ad.id, { isActive: newStatus });
      toast.success(newStatus ? '广告已启用' : '广告已禁用');
      
      // Confirm update
      setAds(prev => prev.map(item => 
        item.id === ad.id ? { ...item, isActive: newStatus, _updating: false } : item
      ));
    } catch (err) {
      console.error('更新广告状态失败:', err);
      toast.error('更新状态失败：' + err.message);
      // Revert on failure
      setAds(prev => prev.map(item => 
        item.id === ad.id ? { ...item, isActive: !newStatus, _updating: false } : item
      ));
    }
  };

  // 格式化日期
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="广告管理"
        description="管理论坛的广告位和广告内容"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="ads" className="gap-2">
            广告列表
            {adsTotal > 0 && <Badge variant="secondary">{adsTotal}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="slots" className="gap-2">
            广告位管理
            {slots.length > 0 && <Badge variant="secondary">{slots.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* 广告列表 Tab */}
        <TabsContent value="ads" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={openCreateAdDialog} disabled={slots.length === 0}>
              <Plus className="h-4 w-4" />
              新建广告
            </Button>
          </div>

          {slots.length === 0 && !slotsLoading && (
            <div className="text-center py-8 text-muted-foreground">
              请先创建广告位后再添加广告
            </div>
          )}

          <DataTable
            columns={[
              {
                key: 'title',
                label: '广告标题',
                render: (_, ad) => (
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{ad.title}</span>
                    {ad.slot && (
                      <span className="text-xs text-muted-foreground">
                        {ad.slot.name}
                      </span>
                    )}
                  </div>
                ),
              },
              {
                key: 'type',
                label: '类型',
                width: 'w-[100px]',
                render: (type) => {
                  const config = AD_TYPES[type];
                  const Icon = config?.icon || Image;
                  return (
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded ${config?.color || 'bg-gray-100 text-gray-800'}`}>
                      <Icon className="h-3 w-3" />
                      {config?.label || type}
                    </span>
                  );
                },
              },
              {
                key: 'isActive',
                label: '状态',
                width: 'w-[80px]',
                render: (isActive, ad) => (
                  <Badge 
                    variant={isActive ? 'default' : 'secondary'}
                    className={`cursor-pointer hover:opacity-80 transition-opacity ${ad._updating ? 'opacity-50 pointer-events-none' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleAdStatus(ad);
                    }}
                  >
                    {isActive ? '启用' : '禁用'}
                  </Badge>
                ),
              },
              {
                key: 'stats',
                label: '数据',
                width: 'w-[140px]',
                render: (_, ad) => (
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" />
                      {ad.impressions || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <MousePointer className="h-3.5 w-3.5" />
                      {ad.clicks || 0}
                    </span>
                  </div>
                ),
              },
              {
                key: 'schedule',
                label: '投放时间',
                render: (_, ad) => (
                  <div className="text-sm text-muted-foreground">
                    {ad.startAt || ad.endAt ? (
                      <>
                        <div>{formatDate(ad.startAt)} 起</div>
                        <div>{formatDate(ad.endAt)} 止</div>
                      </>
                    ) : (
                      <span>长期投放</span>
                    )}
                  </div>
                ),
              },
              {
                key: 'actions',
                label: '操作',
                align: 'right',
                sticky: 'right',
                render: (_, ad) => (
                  <ActionMenu
                    mode="inline"
                    items={[
                      {
                        label: '编辑',
                        icon: Edit,
                        onClick: () => openEditAdDialog(ad),
                      },
                      {
                        label: '删除',
                        icon: Trash2,
                        variant: 'destructive',
                        onClick: (e) => handleDeleteAd(e, ad),
                      },
                    ]}
                  />
                ),
              },
            ]}
            data={ads}
            loading={adsLoading}
            emptyMessage="暂无广告"
          />

          {adsTotal > limit && (
            <Pager
              page={adsPage}
              total={adsTotal}
              pageSize={limit}
              onPageChange={setAdsPage}
            />
          )}
        </TabsContent>

        {/* 广告位管理 Tab */}
        <TabsContent value="slots" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={openCreateSlotDialog}>
              <Plus className="h-4 w-4" />
              新建广告位
            </Button>
          </div>

          <DataTable
            columns={[
              {
                key: 'name',
                label: '名称',
                render: (_, slot) => (
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{slot.name}</span>
                    <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {slot.code}
                    </code>
                  </div>
                ),
              },
              {
                key: 'size',
                label: '建议尺寸',
                width: 'w-[120px]',
                render: (_, slot) => (
                  <span className="text-sm text-muted-foreground">
                    {slot.width && slot.height ? `${slot.width} × ${slot.height}` : '-'}
                  </span>
                ),
              },
              {
                key: 'maxAds',
                label: '最大广告数',
                width: 'w-[100px]',
                render: (value) => value || 1,
              },
              {
                key: 'isActive',
                label: '状态',
                width: 'w-[80px]',
                render: (isActive, slot) => (
                  <Badge 
                    variant={isActive ? 'default' : 'secondary'}
                    className={`cursor-pointer hover:opacity-80 transition-opacity ${slot._updating ? 'opacity-50 pointer-events-none' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleSlotStatus(slot);
                    }}
                  >
                    {isActive ? '启用' : '禁用'}
                  </Badge>
                ),
              },
              {
                key: 'description',
                label: '描述',
                render: (value) => (
                  <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
                    {value || '-'}
                  </span>
                ),
              },
              {
                key: 'actions',
                label: '操作',
                align: 'right',
                sticky: 'right',
                render: (_, slot) => (
                  <ActionMenu
                    mode="inline"
                    items={[
                      {
                        label: '编辑',
                        icon: Edit,
                        onClick: () => openEditSlotDialog(slot),
                      },
                      {
                        label: '删除',
                        icon: Trash2,
                        variant: 'destructive',
                        onClick: (e) => handleDeleteSlot(e, slot),
                      },
                    ]}
                  />
                ),
              },
            ]}
            data={slots}
            loading={slotsLoading}
            emptyMessage="暂无广告位"
          />
        </TabsContent>
      </Tabs>

      {/* 广告位表单对话框 */}
      <FormDialog
        open={showSlotDialog}
        onOpenChange={setShowSlotDialog}
        title={slotDialogMode === 'create' ? '创建广告位' : '编辑广告位'}
        description={slotDialogMode === 'create' ? '添加一个新的广告投放位置' : '修改广告位信息'}
        submitText={slotDialogMode === 'create' ? '创建' : '保存'}
        onSubmit={handleSlotSubmit}
        loading={slotSubmitting}
      >
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="slotName">广告位名称 *</Label>
            <Input
              id="slotName"
              value={slotFormData.name}
              onChange={(e) => setSlotFormData({ ...slotFormData, name: e.target.value })}
              placeholder="如：首页顶部横幅"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slotCode">广告位代码 *</Label>
            <Input
              id="slotCode"
              value={slotFormData.code}
              onChange={(e) => setSlotFormData({ ...slotFormData, code: e.target.value })}
              placeholder="如：header_banner"
              disabled={slotDialogMode === 'edit'}
            />
            <p className="text-xs text-muted-foreground">
              用于在页面中标识广告位，创建后不可修改
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="slotWidth">建议宽度 (px)</Label>
              <Input
                id="slotWidth"
                type="number"
                value={slotFormData.width}
                onChange={(e) => setSlotFormData({ ...slotFormData, width: e.target.value })}
                placeholder="如：728"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slotHeight">建议高度 (px)</Label>
              <Input
                id="slotHeight"
                type="number"
                value={slotFormData.height}
                onChange={(e) => setSlotFormData({ ...slotFormData, height: e.target.value })}
                placeholder="如：90"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxAds">最大广告数</Label>
            <Input
              id="maxAds"
              type="number"
              min="1"
              value={slotFormData.maxAds}
              onChange={(e) => setSlotFormData({ ...slotFormData, maxAds: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              该广告位最多显示的广告数量
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="slotDescription">描述</Label>
            <Textarea
              id="slotDescription"
              value={slotFormData.description}
              onChange={(e) => setSlotFormData({ ...slotFormData, description: e.target.value })}
              placeholder="广告位的用途说明"
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between space-x-2 rounded-lg border border-border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="slotIsActive" className="text-base">启用广告位</Label>
              <p className="text-sm text-muted-foreground">
                禁用后该广告位不会展示任何广告
              </p>
            </div>
            <Switch
              id="slotIsActive"
              checked={slotFormData.isActive}
              onCheckedChange={(checked) => setSlotFormData({ ...slotFormData, isActive: checked })}
            />
          </div>
        </div>
      </FormDialog>

      {/* 广告表单对话框 */}
      <FormDialog
        open={showAdDialog}
        onOpenChange={setShowAdDialog}
        title={adDialogMode === 'create' ? '创建广告' : '编辑广告'}
        description={adDialogMode === 'create' ? '添加一个新的广告' : '修改广告信息'}
        submitText={adDialogMode === 'create' ? '创建' : '保存'}
        onSubmit={handleAdSubmit}
        loading={adSubmitting}
      >
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="creativeSlotId">广告位 *</Label>
            <Select
              value={adFormData.slotId}
              onValueChange={(value) => setAdFormData({ ...adFormData, slotId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择广告位" />
              </SelectTrigger>
              <SelectContent>
                {slots.map((slot) => (
                  <SelectItem key={slot.id} value={slot.id.toString()}>
                    {slot.name} ({slot.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="creativeTitle">广告标题 *</Label>
            <Input
              id="creativeTitle"
              value={adFormData.title}
              onChange={(e) => setAdFormData({ ...adFormData, title: e.target.value })}
              placeholder="广告标题（仅管理员可见）"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="creativeType">广告类型 *</Label>
            <Select
              value={adFormData.type}
              onValueChange={(value) => setAdFormData({ ...adFormData, type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(AD_TYPES).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {config.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="creativeContent">
              {adFormData.type === 'image' ? '图片 URL' : adFormData.type === 'html' ? 'HTML 代码' : '脚本代码'}
            </Label>
            {adFormData.type === 'image' ? (
              <Input
                id="creativeContent"
                value={adFormData.content}
                onChange={(e) => setAdFormData({ ...adFormData, content: e.target.value })}
                placeholder="https://example.com/ad-banner.jpg"
              />
            ) : (
              <Textarea
                id="creativeContent"
                value={adFormData.content}
                onChange={(e) => setAdFormData({ ...adFormData, content: e.target.value })}
                placeholder={adFormData.type === 'html' ? '<div>...</div>' : '<script>...</script>'}
                rows={4}
                className="font-mono text-sm"
              />
            )}
          </div>

          {adFormData.type === 'image' && (
            <div className="space-y-2">
              <Label htmlFor="creativeLinkUrl">跳转链接</Label>
              <Input
                id="creativeLinkUrl"
                value={adFormData.linkUrl}
                onChange={(e) => setAdFormData({ ...adFormData, linkUrl: e.target.value })}
                placeholder="https://example.com"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="creativePriority">优先级</Label>
            <Input
              id="creativePriority"
              type="number"
              value={adFormData.priority}
              onChange={(e) => setAdFormData({ ...adFormData, priority: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              数值越大，展示优先级越高
            </p>
          </div>

          <div className="flex items-center justify-between space-x-2 rounded-lg border border-border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="isLongTerm" className="text-base">长期投放</Label>
              <p className="text-sm text-muted-foreground">
                开启后广告将立即生效且无结束日期
              </p>
            </div>
            <Switch
              id="isLongTerm"
              checked={!adFormData.startAt && !adFormData.endAt}
              onCheckedChange={(checked) => {
                if (checked) {
                  setAdFormData({ ...adFormData, startAt: null, endAt: null });
                } else {
                  const nextMonth = new Date();
                  nextMonth.setDate(nextMonth.getDate() + 30);
                  setAdFormData({ ...adFormData, startAt: new Date(), endAt: nextMonth });
                }
              }}
            />
          </div>

          {(adFormData.startAt || adFormData.endAt) && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="creativeStartAt">开始时间</Label>
                <DatePicker
                  id="creativeStartAt"
                  value={adFormData.startAt}
                  onChange={(date) => setAdFormData({ ...adFormData, startAt: date })}
                  placeholder="选择开始时间"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="creativeEndAt">结束时间</Label>
                <DatePicker
                  id="creativeEndAt"
                  value={adFormData.endAt}
                  onChange={(date) => setAdFormData({ ...adFormData, endAt: date })}
                  placeholder="选择结束时间"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="creativeRemark">备注</Label>
            <Textarea
              id="creativeRemark"
              value={adFormData.remark}
              onChange={(e) => setAdFormData({ ...adFormData, remark: e.target.value })}
              placeholder="备注信息（仅管理员可见）"
              rows={2}
            />
          </div>

          {adFormData.type === 'image' && (
            <div className="flex items-center justify-between space-x-2 rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="creativeTargetBlank" className="text-base">新窗口打开</Label>
                <p className="text-sm text-muted-foreground">
                  点击广告时在新标签页打开链接
                </p>
              </div>
              <Switch
                id="creativeTargetBlank"
                checked={adFormData.targetBlank}
                onCheckedChange={(checked) => setAdFormData({ ...adFormData, targetBlank: checked })}
              />
            </div>
          )}

          <div className="flex items-center justify-between space-x-2 rounded-lg border border-border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="creativeIsActive" className="text-base">启用广告</Label>
              <p className="text-sm text-muted-foreground">
                禁用后该广告不会展示
              </p>
            </div>
            <Switch
              id="creativeIsActive"
              checked={adFormData.isActive}
              onCheckedChange={(checked) => setAdFormData({ ...adFormData, isActive: checked })}
            />
          </div>
        </div>
      </FormDialog>
    </div>
  );
}
