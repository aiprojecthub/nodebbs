'use client';

import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { SettingSection, SettingItem } from '@/components/common/SettingLayout';
import { moderationApi } from '@/lib/api';
import { toast } from 'sonner';

/**
 * 内容审核设置。
 * 主开关 + 分类型开关来自通用审核配置（moderation_config，经 /api/moderation/config 读写）；
 * 日志保留天数是通用系统设置，沿用设置页的 settings / handleInputBlur。
 */
export function ContentModerationSettings({ settings, handleInputBlur, saving }) {
  const [config, setConfig] = useState(null); // { enabled, types, availableTypes }
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const data = await moderationApi.getModerationConfig();
      setConfig(data);
    } catch (error) {
      console.error('Failed to load moderation config:', error);
      toast.error('加载审核配置失败');
    }
  };

  // 保存配置（乐观更新）
  const saveConfig = async (next) => {
    const prev = config;
    setConfig({ ...config, ...next });
    setSavingConfig(true);
    try {
      const saved = await moderationApi.setModerationConfig({
        enabled: next.enabled ?? config.enabled,
        types: next.types ?? config.types,
      });
      setConfig((c) => ({ ...c, enabled: saved.enabled, types: saved.types }));
      toast.success('审核配置已保存');
    } catch (error) {
      console.error('Failed to save moderation config:', error);
      toast.error(error.message || '保存配置失败');
      setConfig(prev); // 回滚
    } finally {
      setSavingConfig(false);
    }
  };

  const toggleMaster = (checked) => saveConfig({ enabled: checked });
  const toggleType = (type, checked) =>
    saveConfig({ types: { ...(config?.types || {}), [type]: checked } });

  return (
    <div className='space-y-6'>
      <SettingSection title='内容审核' description='配置哪些新发布的内容需要审核通过后才能公开显示'>
        <SettingItem
          title='启用内容审核'
          description='关闭时所有内容直接发布；开启后按下方分类型开关决定'
        >
          <Switch
            id='moderation-enabled'
            checked={!!config?.enabled}
            disabled={!config || savingConfig}
            onCheckedChange={toggleMaster}
          />
        </SettingItem>

        {config?.enabled && (config.availableTypes || []).length > 0 && (
          <SettingItem title='需要审核的内容类型' layout='vertical'>
            <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
              {(config.availableTypes || []).map((t) => (
                <div
                  key={t.type}
                  className='flex items-center justify-between rounded-md border p-3'
                >
                  <span className='text-sm'>{t.label}</span>
                  <Switch
                    checked={
                      typeof config.types?.[t.type] === 'boolean'
                        ? config.types[t.type]
                        : t.defaultEnabled
                    }
                    disabled={savingConfig}
                    onCheckedChange={(checked) => toggleType(t.type, checked)}
                  />
                </div>
              ))}
            </div>
          </SettingItem>
        )}

        {settings?.moderation_log_retention_days && (
          <SettingItem
            title='操作日志保留天数'
            description={settings.moderation_log_retention_days.description}
          >
            <Input
              key={`retention-${settings.moderation_log_retention_days.value}`}
              id='moderation_log_retention_days'
              type='number'
              min='0'
              className='w-32'
              defaultValue={settings.moderation_log_retention_days.value}
              onBlur={(e) => handleInputBlur('moderation_log_retention_days', e)}
              disabled={saving}
            />
          </SettingItem>
        )}
      </SettingSection>
    </div>
  );
}
