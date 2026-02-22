'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { smsConfigApi } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, Check, X, MessageSquareText } from 'lucide-react';
import { ConfigProviderCard } from './ConfigProviderCard';
import { Loading } from '@/components/common/Loading';

export function SmsSettings() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProvider, setEditingProvider] = useState(null);

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const data = await smsConfigApi.getAllProviders();
      setProviders(data.items || []);
    } catch (error) {
      console.error('Failed to fetch SMS providers:', error);
      toast.error('获取短信服务配置失败');
    } finally {
      setLoading(false);
    }
  };

  const updateProvider = (providerName, updates) => {
    setProviders((prev) =>
      prev.map((p) => {
        // 如果当前更新启用了某个 provider，则禁用其他 provider
        if (updates.isEnabled && p.provider !== providerName) {
          return { ...p, isEnabled: false };
        }
        if (p.provider === providerName) {
          return { ...p, ...updates };
        }
        return p;
      })
    );
  };

  if (loading) {
    return <Loading text='加载中...' className='min-h-[200px]' />;
  }

  if (providers.length === 0) {
    return (
      <div className='text-center py-8 text-muted-foreground'>
        <p>暂无短信服务提供商配置</p>
        <p className='text-sm mt-2'>请先运行初始化脚本添加提供商</p>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {providers.map((provider) => (
        <SmsProviderCard
          key={provider.id}
          provider={provider}
          onUpdate={updateProvider}
          editingProvider={editingProvider}
          setEditingProvider={setEditingProvider}
        />
      ))}
    </div>
  );
}



function SmsProviderCard({ 
  provider, 
  onUpdate, 
  editingProvider, 
  setEditingProvider,
}) {
  const config = provider.config || {};
  
  const [formData, setFormData] = useState({
    isEnabled: provider.isEnabled,
    // 阿里云配置
    accessKeyId: config.accessKeyId || '',
    accessKeySecret: config.accessKeySecret || '',
    signName: config.signName || '',
    region: config.region || 'cn-hangzhou',
    // 腾讯云配置
    secretId: config.secretId || '',
    secretKey: config.secretKey || '',
    appId: config.appId || '',
    templates: config.templates || {},
  });
  const [saving, setSaving] = useState(false);

  const isEditing = editingProvider === provider.provider;
  const isAliyun = provider.provider === 'aliyun';
  const isTencent = provider.provider === 'tencent';

  const handleSave = async () => {
    try {
      setSaving(true);
      const updatePayload = {
        isEnabled: formData.isEnabled,
        config: {
          signName: formData.signName,
          ...(isAliyun && {
            accessKeyId: formData.accessKeyId,
            accessKeySecret: formData.accessKeySecret,
            region: formData.region,
          }),
          ...(isTencent && {
            secretId: formData.secretId,
            secretKey: formData.secretKey,
            appId: formData.appId,
          }),
          templates: formData.templates,
        },
      };
      
      await smsConfigApi.updateProvider(provider.provider, updatePayload);
      toast.success(`${provider.displayName} 配置已保存`);
      setEditingProvider(null);
      onUpdate(provider.provider, {
        isEnabled: formData.isEnabled,
        config: updatePayload.config,
      });
    } catch (error) {
      console.error('Failed to update SMS provider:', error);
      toast.error('保存配置失败');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = async (checked) => {
    try {
      const payload = { isEnabled: checked };
      await smsConfigApi.updateProvider(provider.provider, payload);
      toast.success(checked ? `${provider.displayName} 已启用` : `${provider.displayName} 已禁用`);
      onUpdate(provider.provider, payload);
    } catch (error) {
      console.error('Failed to toggle SMS provider:', error);
      toast.error('操作失败');
    }
  };

  const summaryContent = config.signName ? (
    <div className='flex flex-col gap-1'>
      <div>签名: {config.signName}</div>
      {isAliyun && config.region && (
        <div className='opacity-80'>地域: {config.region}</div>
      )}
      {isTencent && config.appId && (
        <div className='opacity-80'>应用 ID: {config.appId}</div>
      )}
    </div>
  ) : null;

  return (
    <ConfigProviderCard
      title={provider.displayName}
      icon={MessageSquareText}
      isEnabled={provider.isEnabled}
      isEditing={isEditing}
      onToggleEnabled={handleToggleEnabled}
      onEditClick={() => {
        setEditingProvider(provider.provider);
        const cfg = provider.config || {};
        setFormData({
          isEnabled: provider.isEnabled,
          accessKeyId: cfg.accessKeyId || '',
          accessKeySecret: cfg.accessKeySecret || '',
          signName: cfg.signName || '',
          region: cfg.region || 'cn-hangzhou',
          secretId: cfg.secretId || '',
          secretKey: cfg.secretKey || '',
          appId: cfg.appId || '',
          templates: cfg.templates || {},
        });
      }}
      onCancelClick={() => { setEditingProvider(null); }}
      summary={summaryContent}
    >
      <div className='space-y-4 pt-2'>

        {/* 签名名称（通用） */}
        <div className='space-y-2'>
          <Label htmlFor={`${provider.provider}-signName`}>短信签名 *</Label>
          <Input
            id={`${provider.provider}-signName`}
            value={formData.signName}
            onChange={(e) => setFormData({ ...formData, signName: e.target.value })}
            placeholder='如：我的论坛'
          />
          <p className='text-xs text-muted-foreground'>
            需要在云服务商控制台申请并审核通过
          </p>
        </div>

        {/* 阿里云配置 */}
        {isAliyun && (
          <>
            <div className='space-y-2'>
              <Label htmlFor={`${provider.provider}-accessKeyId`}>AccessKey ID *</Label>
              <Input
                id={`${provider.provider}-accessKeyId`}
                value={formData.accessKeyId}
                onChange={(e) => setFormData({ ...formData, accessKeyId: e.target.value })}
                placeholder='阿里云 AccessKey ID'
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor={`${provider.provider}-accessKeySecret`}>AccessKey Secret *</Label>
              <Input
                id={`${provider.provider}-accessKeySecret`}
                type='password'
                value={formData.accessKeySecret}
                onChange={(e) => setFormData({ ...formData, accessKeySecret: e.target.value })}
                placeholder='阿里云 AccessKey Secret'
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor={`${provider.provider}-region`}>地域</Label>
              <Input
                id={`${provider.provider}-region`}
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                placeholder='cn-hangzhou'
              />
            </div>
          </>
        )}

        {/* 腾讯云配置 */}
        {isTencent && (
          <>
            <div className='space-y-2'>
              <Label htmlFor={`${provider.provider}-secretId`}>SecretId *</Label>
              <Input
                id={`${provider.provider}-secretId`}
                value={formData.secretId}
                onChange={(e) => setFormData({ ...formData, secretId: e.target.value })}
                placeholder='腾讯云 SecretId'
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor={`${provider.provider}-secretKey`}>SecretKey *</Label>
              <Input
                id={`${provider.provider}-secretKey`}
                type='password'
                value={formData.secretKey}
                onChange={(e) => setFormData({ ...formData, secretKey: e.target.value })}
                placeholder='腾讯云 SecretKey'
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor={`${provider.provider}-appId`}>应用 ID *</Label>
              <Input
                id={`${provider.provider}-appId`}
                value={formData.appId}
                onChange={(e) => setFormData({ ...formData, appId: e.target.value })}
                placeholder='短信应用 SDK AppID'
              />
            </div>
          </>
        )}

        {/* 模板映射配置 */}
        <div className='space-y-4 pt-4 border-t border-border'>
          <Label className='text-base font-semibold'>模板映射（可选）</Label>
          <p className='text-xs text-muted-foreground'>
            如果未配置，将默认使用系统预设的模板 ID（{isAliyun ? 'TemplateCode' : 'TemplateId'}）。
            如需使用自定义模板，请在此处填写对应的真实 ID。
          </p>
          
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label htmlFor={`${provider.provider}-tpl-register`} className='text-xs text-muted-foreground'>注册验证码 (SMS_REGISTER)</Label>
              <Input
                id={`${provider.provider}-tpl-register`}
                value={formData.templates?.SMS_REGISTER || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  templates: { ...formData.templates, SMS_REGISTER: e.target.value } 
                })}
                placeholder='例如: SMS_123456789'
              />
            </div>
            
            <div className='space-y-2'>
              <Label htmlFor={`${provider.provider}-tpl-login`} className='text-xs text-muted-foreground'>登录验证码 (SMS_LOGIN)</Label>
              <Input
                id={`${provider.provider}-tpl-login`}
                value={formData.templates?.SMS_LOGIN || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  templates: { ...formData.templates, SMS_LOGIN: e.target.value } 
                })}
                placeholder='例如: SMS_987654321'
              />
            </div>
            
            <div className='space-y-2'>
              <Label htmlFor={`${provider.provider}-tpl-reset`} className='text-xs text-muted-foreground'>密码重置 (SMS_PASSWORD_RESET)</Label>
              <Input
                id={`${provider.provider}-tpl-reset`}
                value={formData.templates?.SMS_PASSWORD_RESET || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  templates: { ...formData.templates, SMS_PASSWORD_RESET: e.target.value } 
                })}
              />
            </div>
            
            <div className='space-y-2'>
              <Label htmlFor={`${provider.provider}-tpl-bind`} className='text-xs text-muted-foreground'>绑定手机 (SMS_BIND)</Label>
              <Input
                id={`${provider.provider}-tpl-bind`}
                value={formData.templates?.SMS_BIND || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  templates: { ...formData.templates, SMS_BIND: e.target.value } 
                })}
              />
            </div>
            
            <div className='space-y-2'>
              <Label htmlFor={`${provider.provider}-tpl-change`} className='text-xs text-muted-foreground'>更换手机 (SMS_CHANGE)</Label>
              <Input
                id={`${provider.provider}-tpl-change`}
                value={formData.templates?.SMS_CHANGE || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  templates: { ...formData.templates, SMS_CHANGE: e.target.value } 
                })}
              />
            </div>
          </div>
        </div>

        <div className='flex items-center gap-2 pt-2'>
          <Button
            onClick={handleSave}
            disabled={saving || !formData.signName}
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
        </div>
      </div>
    </ConfigProviderCard>
  );
}
