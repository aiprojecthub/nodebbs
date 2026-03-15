'use client';

import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { SettingSection, SettingItem } from '@/components/common/SettingLayout';

export function SecuritySettings({ settings, handleBooleanChange, handleNumberChange, saving }) {
  const handleBlur = (key, e, originalValue) => {
    const value = e.target.value.trim();
    if (value === '') {
      e.target.value = originalValue;
      return;
    }
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue !== originalValue) {
      handleNumberChange(key, value);
    }
  };

  return (
    <div className='space-y-6'>
      <SettingSection title="安全设置" description="配置邮箱验证和内容审核等安全功能">
        {settings.email_verification_required && (
          <SettingItem
            title="邮箱验证要求"
            description={settings.email_verification_required.description}
          >
            <Switch
              id='email_verification_required'
              checked={settings.email_verification_required.value}
              onCheckedChange={(checked) =>
                handleBooleanChange('email_verification_required', checked)
              }
              disabled={saving}
            />
          </SettingItem>
        )}

        {settings.content_moderation_enabled && (
          <SettingItem
            title="内容审核"
            description={settings.content_moderation_enabled.description}
          >
            <Switch
              id='content_moderation_enabled'
              checked={settings.content_moderation_enabled.value}
              onCheckedChange={(checked) =>
                handleBooleanChange('content_moderation_enabled', checked)
              }
              disabled={saving}
            />
          </SettingItem>
        )}

        {settings.moderation_log_retention_days && (
          <SettingItem
            title="审核日志保留天数"
            description={settings.moderation_log_retention_days.description}
          >
            <Input
              key={`retention-${settings.moderation_log_retention_days.value}`}
              id='moderation_log_retention_days'
              type='number'
              min='0'
              className='w-32'
              defaultValue={settings.moderation_log_retention_days.value}
              onBlur={(e) =>
                handleBlur(
                  'moderation_log_retention_days',
                  e,
                  settings.moderation_log_retention_days.value
                )
              }
              disabled={saving}
            />
          </SettingItem>
        )}

      </SettingSection>
    </div>
  );
}
