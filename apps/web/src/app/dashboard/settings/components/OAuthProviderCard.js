'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { oauthConfigApi } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, Check, X } from 'lucide-react';
import { Loading } from '@/components/common/Loading';

export function OAuthSettings() {
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
      const data = await oauthConfigApi.getAllProviders();
      setProviders(data.items || []);
    } catch (error) {
      console.error('Failed to fetch OAuth providers:', error);
      toast.error('获取 OAuth 配置失败');
    } finally {
      setLoading(false);
    }
  };

  // 局部更新单个 provider，避免重新请求接口
  const updateProvider = (providerName, updates) => {
    setProviders((prev) =>
      prev.map((p) =>
        p.provider === providerName ? { ...p, ...updates } : p
      )
    );
  };

  if (loading) {
    return <Loading text='加载中...' className='min-h-[200px]' />;
  }

  return (
    <div className='space-y-4'>
      <div className='text-sm text-muted-foreground mb-4'>
        配置第三方 OAuth 登录提供商。启用后，用户可以使用对应的第三方账号登录。
      </div>

      {providers.map((provider) => (
        <OAuthProviderCard
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

function OAuthProviderCard({ 
  provider, 
  onUpdate, 
  editingProvider, 
  setEditingProvider, 
  testingProvider, 
  setTestingProvider 
}) {
  const [formData, setFormData] = useState({
    isEnabled: provider.isEnabled,
    clientId: provider.clientId || '',
    clientSecret: provider.clientSecret || '',
    callbackUrl: provider.callbackUrl || '',
    scope: provider.scope || '',
    // 解析 additionalConfig
    ...(() => {
      try {
        const additional = provider.additionalConfig ? JSON.parse(provider.additionalConfig) : {};
        return {
          teamId: additional.teamId || '',
          keyId: additional.keyId || '',
        };
      } catch {
        return { teamId: '', keyId: '' };
      }
    })(),
  });
  const [saving, setSaving] = useState(false);

  const isEditing = editingProvider === provider.provider;

  const handleSave = async () => {
    try {
      setSaving(true);
      // 构造要保存的数据
      const savePayload = {
        isEnabled: formData.isEnabled,
        clientId: formData.clientId,
        clientSecret: formData.clientSecret,
        callbackUrl: formData.callbackUrl,
        scope: formData.scope,
      };

      // 对 Apple 特殊处理 additionalConfig
      if (provider.provider === 'apple') {
        savePayload.additionalConfig = JSON.stringify({
          teamId: formData.teamId,
          keyId: formData.keyId,
        });
      }

      await oauthConfigApi.updateProvider(provider.provider, savePayload);
      toast.success(`${provider.displayName} 配置已保存`);
      setEditingProvider(null);
      // 局部更新状态，无需重新请求接口
      onUpdate(provider.provider, savePayload);
    } catch (error) {
      console.error('Failed to update OAuth provider:', error);
      toast.error('保存配置失败');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    try {
      setTestingProvider(provider.provider);
      const result = await oauthConfigApi.testProvider(provider.provider);
      if (result.success) {
        toast.success(result.message || '配置测试通过');
      } else {
        toast.error(result.message || '配置测试失败');
      }
    } catch (error) {
      console.error('Failed to test OAuth provider:', error);
      toast.error('测试配置失败');
    } finally {
      setTestingProvider(null);
    }
  };

  const handleToggleEnabled = async (checked) => {
    try {
      await oauthConfigApi.updateProvider(provider.provider, { isEnabled: checked });
      toast.success(checked ? `${provider.displayName} 已启用` : `${provider.displayName} 已禁用`);
      // 局部更新状态，无需重新请求接口
      onUpdate(provider.provider, { isEnabled: checked });
    } catch (error) {
      console.error('Failed to toggle OAuth provider:', error);
      toast.error('操作失败');
    }
  };

  return (
    <div className='border border-border rounded-lg bg-card'>
      <div className='p-4'>
        {/* 头部：提供商名称和开关 */}
        <div className='flex items-center justify-between mb-4'>
          <div className='flex items-center gap-3'>
            <div className='text-lg font-semibold'>{provider.displayName}</div>
            {provider.isEnabled && (
              <span className='text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded'>
                已启用
              </span>
            )}
          </div>
          <div className='flex items-center gap-2'>
            <Switch
              checked={provider.isEnabled}
              onCheckedChange={handleToggleEnabled}
            />
            {!isEditing ? (
              <Button
                variant='outline'
                size='sm'
                onClick={() => {
                  setEditingProvider(provider.provider);
                  setFormData({
                    isEnabled: provider.isEnabled,
                    clientId: provider.clientId || '',
                    clientSecret: provider.clientSecret || '',
                    callbackUrl: provider.callbackUrl || '',
                    scope: provider.scope || '',
                    ...(() => {
                      try {
                        const additional = provider.additionalConfig ? JSON.parse(provider.additionalConfig) : {};
                        return {
                          teamId: additional.teamId || '',
                          keyId: additional.keyId || '',
                        };
                      } catch {
                        return { teamId: '', keyId: '' };
                      }
                    })(),
                  });
                }}
              >
                配置
              </Button>
            ) : (
              <Button
                variant='ghost'
                size='sm'
                onClick={() => setEditingProvider(null)}
              >
                <X className='h-4 w-4' />
              </Button>
            )}
          </div>
        </div>

        {/* 配置表单 */}
        {isEditing && (
          <div className='space-y-4 pt-4 border-t border-border'>
            <div className='space-y-2'>
              <Label htmlFor={`${provider.provider}-clientId`}>
                {provider.provider === 'apple' ? 'Service ID (Client ID) *' : 'Client ID *'}
              </Label>
              <Input
                id={`${provider.provider}-clientId`}
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                placeholder='输入 Client ID'
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor={`${provider.provider}-clientSecret`}>
                 {provider.provider === 'apple' ? 'Private Key (.p8 Content) *' : 'Client Secret *'}
              </Label>
              {provider.provider === 'apple' ? (
                 <Textarea
                  id={`${provider.provider}-clientSecret`}
                  value={formData.clientSecret}
                  onChange={(e) => setFormData({ ...formData, clientSecret: e.target.value })}
                  placeholder='-----BEGIN PRIVATE KEY----- ...'
                  rows={4}
                  className="font-mono text-xs"
                />
              ) : (
                <Input
                  id={`${provider.provider}-clientSecret`}
                  type='password'
                  value={formData.clientSecret}
                  onChange={(e) => setFormData({ ...formData, clientSecret: e.target.value })}
                  placeholder='输入 Client Secret'
                />
              )}
            </div>

            {provider.provider === 'apple' && (
              <div className="grid grid-cols-2 gap-4">
                 <div className='space-y-2'>
                  <Label htmlFor={`${provider.provider}-teamId`}>Team ID *</Label>
                  <Input
                    id={`${provider.provider}-teamId`}
                    value={formData.teamId}
                    onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
                    placeholder='App ID Prefix (e.g. A1B2C3D4E5)'
                  />
                </div>
                 <div className='space-y-2'>
                  <Label htmlFor={`${provider.provider}-keyId`}>Key ID *</Label>
                  <Input
                    id={`${provider.provider}-keyId`}
                    value={formData.keyId}
                    onChange={(e) => setFormData({ ...formData, keyId: e.target.value })}
                    placeholder='Key ID (e.g. ABC1234567)'
                  />
                </div>
              </div>
            )}

            <div className='space-y-2'>
              <Label htmlFor={`${provider.provider}-callbackUrl`}>回调 URL</Label>
              <Input
                id={`${provider.provider}-callbackUrl`}
                value={formData.callbackUrl}
                onChange={(e) => setFormData({ ...formData, callbackUrl: e.target.value })}
                placeholder={`例如: ${typeof window !== 'undefined' ? window.location.origin : 'http://your-domain.com'}/auth/${provider.provider}/callback`}
              />
              <p className='text-xs text-muted-foreground'>
                在 OAuth 提供商后台配置此回调地址
              </p>
            </div>

            <div className='space-y-2'>
              <Label htmlFor={`${provider.provider}-scope`}>权限范围 (Scope)</Label>
              <Textarea
                id={`${provider.provider}-scope`}
                value={formData.scope}
                onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                placeholder='JSON 数组格式，例如: ["user:email", "read:user"]'
                rows={2}
              />
            </div>

            <div className='flex items-center gap-2 pt-2'>
              <Button
                onClick={handleSave}
                disabled={saving || !formData.clientId || !formData.clientSecret}
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
                disabled={testingProvider === provider.provider || !provider.clientId}
              >
                {testingProvider === provider.provider ? (
                  <>
                    <Loader2 className='h-4 w-4 animate-spin' />
                    测试中...
                  </>
                ) : (
                  '测试配置'
                )}
              </Button>
            </div>
          </div>
        )}

        {/* 当前配置概览（非编辑状态） */}
        {!isEditing && provider.clientId && (
          <div className='text-sm text-muted-foreground space-y-1 pt-4 border-t border-border'>
            <div>Client ID: {provider.clientId.substring(0, 20)}...</div>
            {provider.callbackUrl && (
              <div className='text-xs'>回调 URL: {provider.callbackUrl}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
