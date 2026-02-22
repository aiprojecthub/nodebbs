'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { emailConfigApi } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, Check, X, Mail } from 'lucide-react';
import { ConfigProviderCard } from './ConfigProviderCard';
import { Loading } from '@/components/common/Loading';

export function EmailSettings() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProvider, setEditingProvider] = useState(null);
  const [testingProvider, setTestingProvider] = useState(null);

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const data = await emailConfigApi.getAllProviders();
      setProviders(data.items || []);
    } catch (error) {
      console.error('Failed to fetch Email providers:', error);
      toast.error('获取邮件服务配置失败');
    } finally {
      setLoading(false);
    }
  };

  // 局部更新单个 provider，避免重新请求接口
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

  return (
    <div className='space-y-4'>
      <div className='text-sm text-muted-foreground mb-4'>
        配置邮件发送服务，用于发送邮件验证、登录验证码、注册欢迎邮件以及各种订阅推送。
      </div>

      {providers.map((provider) => (
        <EmailProviderCard
          key={provider.id}
          provider={provider}
          onUpdate={updateProvider}
          editingProvider={editingProvider}
          setEditingProvider={setEditingProvider}
          testingProvider={testingProvider}
          setTestingProvider={setTestingProvider}
        />
      ))}
    </div>
  );
}



function EmailProviderCard({ 
  provider, 
  onUpdate, 
  editingProvider, 
  setEditingProvider, 
  testingProvider, 
  setTestingProvider 
}) {
  // 从 provider.config 对象中提取配置（新 API 返回已解析的 JSON）
  const config = provider.config || {};
  
  const [formData, setFormData] = useState({
    isEnabled: provider.isEnabled,
    // 配置字段（存储在 config JSON 中）
    smtpHost: config.smtpHost || '',
    smtpPort: config.smtpPort || 587,
    smtpSecure: config.smtpSecure !== undefined ? config.smtpSecure : true,
    smtpUser: config.smtpUser || '',
    smtpPassword: config.smtpPassword || '',
    fromEmail: config.fromEmail || '',
    fromName: config.fromName || '',
    apiKey: config.apiKey || '',
    apiEndpoint: config.apiEndpoint || '',
  });
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  const isEditing = editingProvider === provider.provider;
  const isSmtpBased = provider.provider === 'smtp' || provider.provider === 'aliyun';
  const isApiBased = provider.provider === 'sendgrid' || provider.provider === 'resend';

  const handleSave = async () => {
    try {
      setSaving(true);
      // 将配置字段打包到 config 对象中
      const updatePayload = {
        isEnabled: formData.isEnabled,
        config: {
          fromEmail: formData.fromEmail,
          fromName: formData.fromName,
          ...(isSmtpBased && {
            smtpHost: formData.smtpHost,
            smtpPort: formData.smtpPort,
            smtpSecure: formData.smtpSecure,
            smtpUser: formData.smtpUser,
            smtpPassword: formData.smtpPassword,
          }),
          ...(isApiBased && {
            apiKey: formData.apiKey,
            apiEndpoint: formData.apiEndpoint,
          }),
        },
      };
      
      await emailConfigApi.updateProvider(provider.provider, updatePayload);
      toast.success(`${provider.displayName} 配置已保存`);
      setEditingProvider(null);
      // 局部更新状态
      onUpdate(provider.provider, {
        isEnabled: formData.isEnabled,
        config: updatePayload.config,
      });
    } catch (error) {
      console.error('Failed to update Email provider:', error);
      toast.error('保存配置失败');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testEmail) {
      toast.error('请输入测试邮箱地址');
      return;
    }
    try {
      setTestingProvider(provider.provider);
      const result = await emailConfigApi.testProvider(provider.provider, testEmail);
      if (result.success) {
        toast.success(result.message || '测试邮件已发送');
      } else {
        toast.error(result.message || '测试失败');
      }
    } catch (error) {
      console.error('Failed to test Email provider:', error);
      toast.error('测试配置失败');
    } finally {
      setTestingProvider(null);
    }
  };

  const handleToggleEnabled = async (checked) => {
    try {
      const payload = { isEnabled: checked };
      await emailConfigApi.updateProvider(provider.provider, payload);
      toast.success(checked ? `${provider.displayName} 已启用` : `${provider.displayName} 已禁用`);
      onUpdate(provider.provider, payload);
    } catch (error) {
      console.error('Failed to toggle Email provider:', error);
      toast.error('操作失败');
    }
  };

  const summaryContent = config.fromEmail ? (
    <div className='flex flex-col gap-1'>
      <div>发件人: {config.fromName} &lt;{config.fromEmail}&gt;</div>
      {isSmtpBased && config.smtpHost && (
        <div className='opacity-80'>SMTP: {config.smtpHost}:{config.smtpPort}</div>
      )}
      {isApiBased && config.apiKey && (
        <div className='opacity-80'>API Key: {config.apiKey.substring(0, 20)}...</div>
      )}
    </div>
  ) : null;

  return (
    <ConfigProviderCard
      title={provider.displayName}
      icon={Mail}
      isEnabled={provider.isEnabled}
      isEditing={isEditing}
      onToggleEnabled={handleToggleEnabled}
      onEditClick={() => {
        setEditingProvider(provider.provider);
        const cfg = provider.config || {};
        setFormData({
          isEnabled: provider.isEnabled,
          smtpHost: cfg.smtpHost || '',
          smtpPort: cfg.smtpPort || 587,
          smtpSecure: cfg.smtpSecure !== undefined ? cfg.smtpSecure : true,
          smtpUser: cfg.smtpUser || '',
          smtpPassword: cfg.smtpPassword || '',
          fromEmail: cfg.fromEmail || '',
          fromName: cfg.fromName || '',
          apiKey: cfg.apiKey || '',
          apiEndpoint: cfg.apiEndpoint || '',
        });
      }}
      onCancelClick={() => { setEditingProvider(null); }}
      summary={summaryContent}
    >
      <div className='space-y-4 pt-2'>

        {/* 发件人信息 */}
        <div className='space-y-2'>
          <Label htmlFor={`${provider.provider}-fromEmail`}>发件人邮箱 *</Label>
          <Input
            id={`${provider.provider}-fromEmail`}
            type='email'
            value={formData.fromEmail}
            onChange={(e) => setFormData({ ...formData, fromEmail: e.target.value })}
            placeholder='noreply@example.com'
          />
        </div>

        <div className='space-y-2'>
          <Label htmlFor={`${provider.provider}-fromName`}>发件人名称</Label>
          <Input
            id={`${provider.provider}-fromName`}
            value={formData.fromName}
            onChange={(e) => setFormData({ ...formData, fromName: e.target.value })}
            placeholder='我的论坛'
          />
        </div>

        {/* SMTP 配置 */}
        {isSmtpBased && (
          <>
            <div className='space-y-2'>
              <Label htmlFor={`${provider.provider}-smtpHost`}>SMTP 主机 *</Label>
              <Input
                id={`${provider.provider}-smtpHost`}
                value={formData.smtpHost}
                onChange={(e) => setFormData({ ...formData, smtpHost: e.target.value })}
                placeholder='smtp.example.com'
              />
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor={`${provider.provider}-smtpPort`}>SMTP 端口 *</Label>
                <Input
                  id={`${provider.provider}-smtpPort`}
                  type='number'
                  value={formData.smtpPort}
                  onChange={(e) => setFormData({ ...formData, smtpPort: parseInt(e.target.value) })}
                  placeholder='587'
                />
              </div>

              <div className='flex items-center justify-between pt-8'>
                <Label htmlFor={`${provider.provider}-smtpSecure`}>使用 SSL/TLS</Label>
                <Switch
                  id={`${provider.provider}-smtpSecure`}
                  checked={formData.smtpSecure}
                  onCheckedChange={(checked) => setFormData({ ...formData, smtpSecure: checked })}
                />
              </div>
            </div>

            <div className='space-y-2'>
              <Label htmlFor={`${provider.provider}-smtpUser`}>SMTP 用户名 *</Label>
              <Input
                id={`${provider.provider}-smtpUser`}
                value={formData.smtpUser}
                onChange={(e) => setFormData({ ...formData, smtpUser: e.target.value })}
                placeholder='用户名或邮箱'
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor={`${provider.provider}-smtpPassword`}>SMTP 密码 *</Label>
              <Input
                id={`${provider.provider}-smtpPassword`}
                type='password'
                value={formData.smtpPassword}
                onChange={(e) => setFormData({ ...formData, smtpPassword: e.target.value })}
                placeholder='密码或授权码'
              />
            </div>
          </>
        )}

        {/* API 配置 */}
        {isApiBased && (
          <>
            <div className='space-y-2'>
              <Label htmlFor={`${provider.provider}-apiKey`}>API Key *</Label>
              <Input
                id={`${provider.provider}-apiKey`}
                type='password'
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                placeholder='输入 API Key'
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor={`${provider.provider}-apiEndpoint`}>API 端点</Label>
              <Input
                id={`${provider.provider}-apiEndpoint`}
                value={formData.apiEndpoint}
                onChange={(e) => setFormData({ ...formData, apiEndpoint: e.target.value })}
                placeholder='API 端点 URL'
                disabled
              />
              <p className='text-xs text-muted-foreground'>
                默认端点，通常无需修改
              </p>
            </div>
          </>
        )}

        {/* 测试邮件 */}
        <div className='space-y-2 pt-2 border-t border-border'>
          <Label htmlFor={`${provider.provider}-testEmail`}>测试邮箱</Label>
          <Input
            id={`${provider.provider}-testEmail`}
            type='email'
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder='输入邮箱地址以接收测试邮件'
          />
        </div>

        <div className='flex items-center gap-2 pt-2'>
          <Button
            onClick={handleSave}
            disabled={saving || !formData.fromEmail}
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
            disabled={testingProvider === provider.provider || !config.fromEmail || !testEmail}
          >
            {testingProvider === provider.provider ? (
              <>
                <Loader2 className='h-4 w-4 animate-spin' />
                发送中...
              </>
            ) : (
              '发送测试邮件'
            )}
          </Button>
        </div>
      </div>
    </ConfigProviderCard>
  );
}
