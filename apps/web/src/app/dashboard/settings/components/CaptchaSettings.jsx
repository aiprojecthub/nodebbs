'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { captchaConfigApi } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, Shield, X, Info } from 'lucide-react';
import { ConfigProviderCard } from './ConfigProviderCard';
import { Loading } from '@/components/common/Loading';

// 验证场景配置
const CAPTCHA_SCENES = [
  { key: 'register', label: '用户注册', description: '新用户注册时验证' },
  { key: 'login', label: '用户登录', description: '用户登录时验证' },
];

/**
 * CAPTCHA 设置页面
 */
export function CaptchaSettings() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProvider, setEditingProvider] = useState(null);

  // 获取提供商配置
  const fetchProviders = async () => {
    try {
      const data = await captchaConfigApi.getProviders();
      setProviders(data);
    } catch (error) {
      toast.error('获取配置失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  // 更新单个 provider
  const updateProvider = (providerName, updates) => {
    setProviders((prev) =>
      prev.map((p) => {
        // 如果当前更新设置为默认，则取消其他 provider 的默认状态
        if (updates.isDefault && p.provider !== providerName) {
          return { ...p, isDefault: false };
        }
        // 更新目标 provider
        if (p.provider === providerName) {
          return { ...p, ...updates };
        }
        return p;
      })
    );
  };

  if (loading) {
    return <Loading text="加载中..." className="min-h-[200px]" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-4">
        <Info className="h-4 w-4" />
        <span>配置人机验证服务以防止垃圾注册和恶意请求。启用后，用户需要完成验证才能进行敏感操作。</span>
      </div>

      <div className="grid gap-4">
        {providers.map((provider) => (
          <CaptchaProviderCard
            key={provider.provider}
            provider={provider}
            onUpdate={updateProvider}
            editingProvider={editingProvider}
            setEditingProvider={setEditingProvider}
          />
        ))}
      </div>
    </div>
  );
}



/**
 * 单个 CAPTCHA 提供商配置卡片
 */
function CaptchaProviderCard({
  provider,
  onUpdate,
  editingProvider,
  setEditingProvider,
}) {
  const isEditing = editingProvider === provider.provider;
  const [formData, setFormData] = useState({
    isEnabled: provider.isEnabled || false,
    isDefault: provider.isDefault || false,
    config: provider.config || {},
    enabledScenes: provider.enabledScenes || {},
  });
  const [saving, setSaving] = useState(false);

  // 重置表单数据
  useEffect(() => {
    setFormData({
      isEnabled: provider.isEnabled || false,
      isDefault: provider.isDefault || false,
      config: provider.config || {},
      enabledScenes: provider.enabledScenes || {},
    });
  }, [provider]);

  // 保存配置
  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await captchaConfigApi.updateProvider(provider.provider, formData);
      onUpdate(provider.provider, result);
      toast.success('配置已保存');
      setEditingProvider(null);
    } catch (error) {
      toast.error('保存失败');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  // 切换启用状态
  const handleToggleEnabled = async (checked) => {
    try {
      const newData = { ...formData, isEnabled: checked };
      // 如果禁用，同时取消默认
      if (!checked) {
        newData.isDefault = false;
      }
      await captchaConfigApi.updateProvider(provider.provider, newData);
      onUpdate(provider.provider, newData);
      setFormData(newData);
      toast.success(checked ? '已启用' : '已禁用');
    } catch (error) {
      toast.error('操作失败');
      console.error(error);
    }
  };

  // 更新 config 字段
  const updateConfig = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      config: { ...prev.config, [key]: value },
    }));
  };

  // 更新 enabledScenes
  const updateScene = (scene, enabled) => {
    setFormData((prev) => ({
      ...prev,
      enabledScenes: { ...prev.enabledScenes, [scene]: enabled },
    }));
  };

  // 获取配置概览
  const getConfigSummary = () => {
    const config = provider.config || {};
    if (provider.provider === 'cap') {
      return config.apiEndpoint ? `API: ${config.apiEndpoint}` : '直接验证模式';
    }
    if (config.siteKey) {
      return `Site Key: ${config.siteKey.substring(0, 20)}...`;
    }
    return '';
  };

  const summaryContent = provider.config && getConfigSummary() ? (
    <div className="text-xs text-muted-foreground">
      {getConfigSummary()}
    </div>
  ) : null;

  const description = (
    provider.provider === 'recaptcha' ? 'Google 提供的人机验证服务' :
    provider.provider === 'hcaptcha' ? '隐私友好的人机验证服务' :
    provider.provider === 'turnstile' ? 'Cloudflare 提供的无感验证服务' :
    provider.provider === 'cap' ? '隐私优先的自托管 PoW 验证 (capjs.js.org)' : ''
  );

  return (
    <ConfigProviderCard
      title={provider.displayName}
      description={description}
      icon={Shield}
      isEnabled={provider.isEnabled}
      isDefault={provider.isDefault}
      isEditing={isEditing}
      onToggleEnabled={handleToggleEnabled}
      onEditClick={() => {
        setEditingProvider(provider.provider);
        setFormData({
          isEnabled: provider.isEnabled || false,
          isDefault: provider.isDefault || false,
          config: provider.config || {},
          enabledScenes: provider.enabledScenes || {},
        });
      }}
      onCancelClick={() => { setEditingProvider(null); setFormData(prev => ({ ...prev, isDefault: provider.isDefault })); }}
      onToggleDefault={(checked) => setFormData({ ...formData, isDefault: checked })}
      isDefaultChecked={formData.isDefault}
      summary={summaryContent}
    >
      <div className="space-y-4 pt-2">

        {/* 基础配置 - Site Key & Secret Key */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Site Key {provider.provider !== 'cap' && '*'}</Label>
            <Input
              value={formData.config.siteKey || ''}
              onChange={(e) => updateConfig('siteKey', e.target.value)}
              placeholder="输入 Site Key"
            />
          </div>
          <div className="space-y-2">
            <Label>Secret Key {provider.provider !== 'cap' && '*'}</Label>
            <Input
              type="password"
              value={formData.config.secretKey || ''}
              onChange={(e) => updateConfig('secretKey', e.target.value)}
              placeholder="输入 Secret Key"
            />
          </div>
        </div>

        {/* reCAPTCHA 特有配置 */}
        {provider.provider === 'recaptcha' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>版本</Label>
              <Select
                value={formData.config.version || 'v2'}
                onValueChange={(v) => updateConfig('version', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="v2">reCAPTCHA v2 (复选框)</SelectItem>
                  <SelectItem value="v3">reCAPTCHA v3 (隐形)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.config.version === 'v3' && (
              <div className="space-y-2">
                <Label>分数阈值 (0-1)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={formData.config.scoreThreshold || 0.5}
                  onChange={(e) => updateConfig('scoreThreshold', parseFloat(e.target.value))}
                />
              </div>
            )}
          </div>
        )}

        {/* Turnstile 特有配置 */}
        {provider.provider === 'turnstile' && (
          <div className="space-y-2">
            <Label>模式</Label>
            <Select
              value={formData.config.mode || 'managed'}
              onValueChange={(v) => updateConfig('mode', v)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="managed">受控模式</SelectItem>
                <SelectItem value="non-interactive">非交互模式</SelectItem>
                <SelectItem value="invisible">隐形模式</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Cap 特有配置 */}
        {provider.provider === 'cap' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>API 端点</Label>
              <Input
                value={formData.config.apiEndpoint || ''}
                onChange={(e) => updateConfig('apiEndpoint', e.target.value)}
                placeholder="http://localhost:3000/[SiteKey]/"
              />
              <p className="text-xs text-muted-foreground">
                
              </p>
            </div>
            <div className="space-y-2">
              <Label>PoW 难度 (4-8)</Label>
              <Input
                type="number"
                min="4"
                max="8"
                value={formData.config.difficulty || 4}
                onChange={(e) => updateConfig('difficulty', parseInt(e.target.value))}
              />
            </div>
          </div>
        )}

        {/* 启用场景 */}
        <div className="space-y-3">
          <Label>启用场景</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {CAPTCHA_SCENES.map((scene) => (
              <div
                key={scene.key}
                className="flex items-center justify-between p-2 rounded border bg-muted/30"
              >
                <div>
                  <span className="text-sm font-medium">{scene.label}</span>
                  <p className="text-xs text-muted-foreground">{scene.description}</p>
                </div>
                <Switch
                  checked={formData.enabledScenes[scene.key] || false}
                  onCheckedChange={(checked) => updateScene(scene.key, checked)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* 保存按钮 */}
        <div className="flex justify-end gap-2 pt-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            保存配置
          </Button>
        </div>
      </div>
    </ConfigProviderCard>
  );
}

export default CaptchaSettings;
