'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { storageConfigApi } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, Check, HardDrive, Database, Server, Plus, Trash2 } from 'lucide-react';
import { ConfigProviderCard } from './ConfigProviderCard';
import { FormDialog } from '@/components/common/FormDialog';
import { confirm } from '@/components/common/ConfirmPopover';
import { Loading } from '@/components/common/Loading';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const TYPE_ICONS = {
  local: HardDrive,
  s3: Database,
};

// 可创建的存储类型（排除 local）
const STORAGE_TYPES = [
  { value: 's3', label: 'S3 兼容存储', description: 'AWS S3 / 阿里云 OSS / 腾讯云 COS / Cloudflare R2 / MinIO 等' },
];

export function StorageSettings() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingSlug, setEditingSlug] = useState(null);
  const [testingSlug, setTestingSlug] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newProvider, setNewProvider] = useState({ slug: '', type: 's3', displayName: '' });

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const data = await storageConfigApi.getAllProviders();
      setProviders(data.items || []);
    } catch (error) {
      console.error('Failed to fetch storage providers:', error);
      toast.error('获取存储服务配置失败');
    } finally {
      setLoading(false);
    }
  };

  const updateProvider = (slug, updates) => {
    setProviders((prev) =>
      prev.map((p) => {
        if (updates.isEnabled && p.slug !== slug) {
          return { ...p, isEnabled: false };
        }
        if (p.slug === slug) {
          return { ...p, ...updates };
        }
        return p;
      })
    );
  };

  const handleCreate = async () => {
    if (!newProvider.slug || !newProvider.displayName) {
      toast.error('请填写标识和显示名称');
      return;
    }

    try {
      setCreating(true);
      await storageConfigApi.createProvider({
        slug: newProvider.slug,
        type: newProvider.type,
        displayName: newProvider.displayName,
      });
      toast.success('存储服务商已创建');
      const createdSlug = newProvider.slug;
      setShowCreateForm(false);
      setNewProvider({ slug: '', type: 's3', displayName: '' });
      await fetchProviders();
      setEditingSlug(createdSlug);
    } catch (error) {
      console.error('Failed to create storage provider:', error);
      toast.error(error.message || '创建失败');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (e, slug) => {
    const confirmed = await confirm(e, {
      title: '删除存储服务商',
      description: '删除后配置将丢失，但已上传的文件不会被删除。',
      confirmText: '删除',
      variant: 'destructive',
    });
    if (!confirmed) return;

    try {
      await storageConfigApi.deleteProvider(slug);
      toast.success('存储服务商已删除');
      setProviders((prev) => prev.filter((p) => p.slug !== slug));
      if (editingSlug === slug) {
        setEditingSlug(null);
      }
    } catch (error) {
      console.error('Failed to delete storage provider:', error);
      toast.error(error.message || '删除失败');
    }
  };

  if (loading) {
    return <Loading text='加载中...' className='min-h-[200px]' />;
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-start justify-between gap-4 mb-4'>
        <div className='text-sm text-muted-foreground'>
          配置文件存储服务，用于保存用户上传的图片、附件等文件。切换服务商后，已上传的文件仍保留在原始存储位置。
        </div>
        <Button
          variant='outline'
          size='sm'
          className='shrink-0'
          onClick={() => setShowCreateForm(true)}
        >
          <Plus className='h-4 w-4' />
          添加
        </Button>
      </div>

      {providers.map((provider) => (
        <StorageProviderCard
          key={provider.id}
          provider={provider}
          onUpdate={updateProvider}
          onDelete={handleDelete}
          editingSlug={editingSlug}
          setEditingSlug={setEditingSlug}
          testingSlug={testingSlug}
          setTestingSlug={setTestingSlug}
        />
      ))}

      <FormDialog
        open={showCreateForm}
        onOpenChange={(open) => {
          setShowCreateForm(open);
          if (!open) setNewProvider({ slug: '', type: 's3', displayName: '' });
        }}
        title='添加存储服务商'
        description='创建一个新的存储服务商，创建后可在卡片中配置详细参数。'
        submitText='创建'
        onSubmit={handleCreate}
        loading={creating}
        disabled={!newProvider.slug || !newProvider.displayName}
      >
        <div className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='new-provider-type'>存储类型</Label>
            <Select
              value={newProvider.type}
              onValueChange={(value) => setNewProvider({ ...newProvider, type: value })}
            >
              <SelectTrigger id='new-provider-type'>
                <SelectValue placeholder='选择类型' />
              </SelectTrigger>
              <SelectContent>
                {STORAGE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='space-y-2'>
            <Label htmlFor='new-provider-slug'>标识 (slug)</Label>
            <Input
              id='new-provider-slug'
              value={newProvider.slug}
              onChange={(e) => setNewProvider({ ...newProvider, slug: e.target.value })}
              placeholder='如 aliyun-oss、r2、minio'
            />
            <p className='text-xs text-muted-foreground'>
              仅限小写字母、数字和连字符
            </p>
          </div>
          <div className='space-y-2'>
            <Label htmlFor='new-provider-name'>显示名称</Label>
            <Input
              id='new-provider-name'
              value={newProvider.displayName}
              onChange={(e) => setNewProvider({ ...newProvider, displayName: e.target.value })}
              placeholder='如 阿里云 OSS、Cloudflare R2'
            />
            <p />
          </div>
        </div>
      </FormDialog>
    </div>
  );
}

function StorageProviderCard({
  provider,
  onUpdate,
  onDelete,
  editingSlug,
  setEditingSlug,
  testingSlug,
  setTestingSlug,
}) {
  const config = provider.config || {};

  const getInitialFormData = (cfg) => ({
    isEnabled: provider.isEnabled,
    // S3
    accessKeyId: cfg.accessKeyId || '',
    secretAccessKey: cfg.secretAccessKey || '',
    bucket: cfg.bucket || '',
    region: cfg.region || '',
    endpoint: cfg.endpoint || '',
    customDomain: cfg.customDomain || '',
    forcePathStyle: cfg.forcePathStyle || false,
  });

  const [formData, setFormData] = useState(getInitialFormData(config));
  const [saving, setSaving] = useState(false);

  const isEditing = editingSlug === provider.slug;
  const isS3 = provider.type === 's3';

  const Icon = TYPE_ICONS[provider.type] || Server;

  const handleSave = async () => {
    try {
      setSaving(true);
      const configPayload = {};

      if (isS3) {
        configPayload.accessKeyId = formData.accessKeyId;
        configPayload.secretAccessKey = formData.secretAccessKey;
        configPayload.bucket = formData.bucket;
        configPayload.region = formData.region;
        configPayload.endpoint = formData.endpoint || null;
        configPayload.forcePathStyle = formData.forcePathStyle;
        configPayload.customDomain = formData.customDomain || null;
      }

      const updatePayload = {
        isEnabled: formData.isEnabled,
        config: configPayload,
      };

      await storageConfigApi.updateProvider(provider.slug, updatePayload);
      toast.success(`${provider.displayName} 配置已保存`);
      setEditingSlug(null);
      onUpdate(provider.slug, {
        isEnabled: formData.isEnabled,
        config: configPayload,
      });
    } catch (error) {
      console.error('Failed to update storage provider:', error);
      toast.error('保存配置失败');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    try {
      setTestingSlug(provider.slug);
      const result = await storageConfigApi.testProvider(provider.slug);
      if (result.success) {
        toast.success(result.message || '连接测试成功');
      } else {
        toast.error(result.message || '连接测试失败');
      }
    } catch (error) {
      console.error('Failed to test storage provider:', error);
      toast.error('测试连接失败');
    } finally {
      setTestingSlug(null);
    }
  };

  const handleToggleEnabled = async (checked) => {
    try {
      const payload = { isEnabled: checked };
      await storageConfigApi.updateProvider(provider.slug, payload);
      toast.success(checked ? `${provider.displayName} 已启用` : `${provider.displayName} 已禁用`);
      onUpdate(provider.slug, payload);
    } catch (error) {
      console.error('Failed to toggle storage provider:', error);
      toast.error('操作失败');
    }
  };

  const getSummary = () => {
    if (isS3) {
      return config.bucket ? (
        <div className='flex flex-col gap-1'>
          <div>Bucket: {config.bucket}</div>
          <div className='opacity-80'>Region: {config.region}</div>
          {config.endpoint && <div className='opacity-80'>Endpoint: {config.endpoint}</div>}
          {config.customDomain && <div className='opacity-80'>CDN: {config.customDomain}</div>}
        </div>
      ) : null;
    }
    return null;
  };

  return (
    <ConfigProviderCard
      title={provider.displayName}
      description={isS3 ? provider.slug : null}
      icon={Icon}
      isEnabled={provider.isEnabled}
      isEditing={isEditing}
      onToggleEnabled={handleToggleEnabled}
      {...(isS3 && {
        onEditClick: () => {
          setEditingSlug(provider.slug);
          setFormData(getInitialFormData(provider.config || {}));
        },
        onCancelClick: () => { setEditingSlug(null); },
      })}
      summary={getSummary()}
    >
      {isS3 && (
        <div className='space-y-4 pt-2'>

          {/* ========== S3 兼容存储配置 ========== */}
          <div className='space-y-2'>
            <Label htmlFor={`${provider.slug}-accessKeyId`}>Access Key ID *</Label>
            <Input
              id={`${provider.slug}-accessKeyId`}
              value={formData.accessKeyId}
              onChange={(e) => setFormData({ ...formData, accessKeyId: e.target.value })}
              placeholder='Access Key ID'
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor={`${provider.slug}-secretAccessKey`}>Secret Access Key *</Label>
            <Input
              id={`${provider.slug}-secretAccessKey`}
              type='password'
              value={formData.secretAccessKey}
              onChange={(e) => setFormData({ ...formData, secretAccessKey: e.target.value })}
              placeholder='Secret Access Key'
            />
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label htmlFor={`${provider.slug}-bucket`}>Bucket *</Label>
              <Input
                id={`${provider.slug}-bucket`}
                value={formData.bucket}
                onChange={(e) => setFormData({ ...formData, bucket: e.target.value })}
                placeholder='your-bucket'
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor={`${provider.slug}-region`}>Region</Label>
              <Input
                id={`${provider.slug}-region`}
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                placeholder='us-east-1'
              />
            </div>
          </div>

          <div className='space-y-2'>
            <Label htmlFor={`${provider.slug}-endpoint`}>Endpoint</Label>
            <Input
              id={`${provider.slug}-endpoint`}
              value={formData.endpoint}
              onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
              placeholder='支持阿里云 OSS / 腾讯云 COS / Cloudflare R2 / MinIO 等'
            />
            <p className='text-xs text-muted-foreground'>
              AWS S3 可留空；阿里云 OSS 填 https://oss-cn-hangzhou.aliyuncs.com；腾讯云 COS 填 https://cos.ap-guangzhou.myqcloud.com
            </p>
          </div>

          <div className='flex items-center justify-between'>
            <div>
              <Label htmlFor={`${provider.slug}-forcePathStyle`}>Path Style 访问</Label>
              <p className='text-xs text-muted-foreground'>
                MinIO 等自托管服务通常需要开启
              </p>
            </div>
            <Switch
              id={`${provider.slug}-forcePathStyle`}
              checked={formData.forcePathStyle}
              onCheckedChange={(checked) => setFormData({ ...formData, forcePathStyle: checked })}
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor={`${provider.slug}-customDomain`}>自定义域名（CDN）</Label>
            <Input
              id={`${provider.slug}-customDomain`}
              value={formData.customDomain}
              onChange={(e) => setFormData({ ...formData, customDomain: e.target.value })}
              placeholder='https://cdn.example.com'
            />
            <p className='text-xs text-muted-foreground'>
              配置后文件 URL 将使用此域名
            </p>
          </div>

          {/* 操作按钮 */}
          <div className='flex items-center gap-2 pt-2 border-t border-border'>
            <Button
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  保存中...
                </>
              ) : (
                <>
                  <Check className='h-4 w-4' />
                  保存配置
                </>
              )}
            </Button>
            <Button
              variant='outline'
              onClick={handleTest}
              disabled={testingSlug === provider.slug}
            >
              {testingSlug === provider.slug ? (
                <>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  测试中...
                </>
              ) : (
                '测试连接'
              )}
            </Button>

            {/* 删除按钮（仅 S3 类型可删除） */}
            <Button
              variant='ghost'
              size='sm'
              className='ml-auto text-destructive hover:text-destructive hover:bg-destructive/10'
              onClick={(e) => onDelete(e, provider.slug)}
              disabled={provider.isEnabled}
              title={provider.isEnabled ? '请先切换到其他服务商后再删除' : '删除此存储服务商'}
            >
              <Trash2 className='h-4 w-4' />
              删除
            </Button>
          </div>
        </div>
      )}
    </ConfigProviderCard>
  );
}
