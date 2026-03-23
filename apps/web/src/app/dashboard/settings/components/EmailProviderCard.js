'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { emailConfigApi } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, Check, Mail } from 'lucide-react';
import { ConfigProviderCard } from './ConfigProviderCard';
import { Loading } from '@/components/common/Loading';
import { useProviderSettings } from '@/hooks/dashboard/useProviderSettings';
import { useProviderCard } from '@/hooks/dashboard/useProviderCard';

const getInitialFormData = (provider) => {
  const cfg = provider.config || {};
  return {
    isEnabled: provider.isEnabled,
    // 配置字段（存储在 config JSON 中）
    smtpHost: cfg.smtpHost || '',
    smtpPort: cfg.smtpPort || 587,
    smtpSecure: cfg.smtpSecure !== undefined ? cfg.smtpSecure : true,
    smtpUser: cfg.smtpUser || '',
    smtpPassword: cfg.smtpPassword || '',
    fromEmail: cfg.fromEmail || '',
    fromName: cfg.fromName || '',
    apiKey: cfg.apiKey || '',
    apiEndpoint: cfg.apiEndpoint || '',
  };
};

const buildSavePayload = (formData, provider) => {
  const isSmtpBased = provider.provider === 'smtp' || provider.provider === 'aliyun';
  const isApiBased = provider.provider === 'sendgrid' || provider.provider === 'resend';
  return {
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
};

const testApiFn = (providerId, testEmail) =>
  emailConfigApi.testProvider(providerId, testEmail);

export function EmailSettings() {
  const {
    providers,
    loading,
    editingProvider,
    setEditingProvider,
    testingProvider,
    setTestingProvider,
    updateProvider,
  } = useProviderSettings({
    fetchFn: emailConfigApi.getAllProviders,
    exclusiveEnable: true,
    errorMessage: '获取邮件服务配置失败',
  });

  if (loading) {
    return <Loading text='加载中...' className='min-h-50' />;
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
  setTestingProvider,
}) {
  // 从 provider.config 对象中提取配置（新 API 返回已解析的 JSON）
  const config = provider.config || {};
  const [testEmail, setTestEmail] = useState('');

  const updateApiFn = useCallback(
    (id, payload) => emailConfigApi.updateProvider(id, payload),
    []
  );

  const {
    formData,
    setFormData,
    saving,
    isEditing,
    isTesting,
    handleEditClick,
    handleCancelClick,
    handleSave,
    handleToggleEnabled,
    handleTest,
  } = useProviderCard({
    provider,
    idField: 'provider',
    updateApiFn,
    onUpdate,
    getInitialFormData,
    buildSavePayload,
    editingProvider,
    setEditingProvider,
    testApiFn,
    testingProvider,
    setTestingProvider,
  });

  const isSmtpBased = provider.provider === 'smtp' || provider.provider === 'aliyun';
  const isApiBased = provider.provider === 'sendgrid' || provider.provider === 'resend';

  const onTestClick = () => {
    if (!testEmail) {
      toast.error('请输入测试邮箱地址');
      return;
    }
    handleTest(testEmail);
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
      onEditClick={handleEditClick}
      onCancelClick={handleCancelClick}
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
            onClick={onTestClick}
            disabled={isTesting || !config.fromEmail || !testEmail}
          >
            {isTesting ? (
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
