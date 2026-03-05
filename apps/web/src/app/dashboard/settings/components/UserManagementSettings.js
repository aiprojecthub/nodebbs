'use client';

import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { SettingSection, SettingItem } from '@/components/common/SettingLayout';

export function UserManagementSettings({ settings, handleBooleanChange, handleNumberChange, saving }) {
  // blur 时保存
  const handleBlur = (key, e, originalValue) => {
    const value = e.target.value.trim();
    if (value === '') {
      // 恢复原值
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
      <SettingSection title="用户名修改" description="控制用户修改其唯一用户名的频率和权限">
        {settings.allow_username_change && (
          <SettingItem
            title="允许修改用户名"
            description={settings.allow_username_change.description}
          >
            <Switch
              id='allow_username_change'
              checked={settings.allow_username_change.value}
              onCheckedChange={(checked) =>
                handleBooleanChange('allow_username_change', checked)
              }
              disabled={saving}
            />
          </SettingItem>
        )}

        {settings.username_change_cooldown_days && (
          <SettingItem
            title="修改冷却期（天）"
            description={settings.username_change_cooldown_days.description}
          >
            <Input
              key={`cooldown-${settings.username_change_cooldown_days.value}`}
              id='username_change_cooldown_days'
              type='number'
              min='0'
              className='w-32'
              defaultValue={settings.username_change_cooldown_days.value}
              onBlur={(e) =>
                handleBlur(
                  'username_change_cooldown_days',
                  e,
                  settings.username_change_cooldown_days.value
                )
              }
              disabled={saving}
            />
          </SettingItem>
        )}

        {settings.username_change_limit && (
          <SettingItem
            title="修改次数限制"
            description="0 表示无限制"
          >
            <Input
              key={`limit-${settings.username_change_limit.value}`}
              id='username_change_limit'
              type='number'
              min='0'
              className='w-32'
              defaultValue={settings.username_change_limit.value}
              onBlur={(e) =>
                handleBlur(
                  'username_change_limit',
                  e,
                  settings.username_change_limit.value
                )
              }
              disabled={saving}
            />
          </SettingItem>
        )}

        {settings.username_change_requires_password && (
          <SettingItem
            title="修改用户名需要密码验证"
            description={settings.username_change_requires_password.description}
          >
            <Switch
              id='username_change_requires_password'
              checked={settings.username_change_requires_password.value}
              onCheckedChange={(checked) =>
                handleBooleanChange('username_change_requires_password', checked)
              }
              disabled={saving}
            />
          </SettingItem>
        )}
      </SettingSection>

      <SettingSection title="邮箱修改" description="控制用户换绑联系邮箱的行为">
        {settings.allow_email_change && (
          <SettingItem
            title="允许修改邮箱"
            description={settings.allow_email_change.description}
          >
            <Switch
              id='allow_email_change'
              checked={settings.allow_email_change.value}
              onCheckedChange={(checked) =>
                handleBooleanChange('allow_email_change', checked)
              }
              disabled={saving}
            />
          </SettingItem>
        )}

        {settings.email_change_requires_password && (
          <SettingItem
            title="修改邮箱需要密码验证"
            description={settings.email_change_requires_password.description}
          >
            <Switch
              id='email_change_requires_password'
              checked={settings.email_change_requires_password.value}
              onCheckedChange={(checked) =>
                handleBooleanChange('email_change_requires_password', checked)
              }
              disabled={saving}
            />
          </SettingItem>
        )}
      </SettingSection>

      <SettingSection title="手机号修改" description="控制用户换绑手机号的行为">
        {settings.allow_phone_change && (
          <SettingItem
            title="允许修改手机号"
            description={settings.allow_phone_change.description}
          >
            <Switch
              id='allow_phone_change'
              checked={settings.allow_phone_change.value}
              onCheckedChange={(checked) =>
                handleBooleanChange('allow_phone_change', checked)
              }
              disabled={saving}
            />
          </SettingItem>
        )}

        {settings.phone_change_requires_password && (
          <SettingItem
            title="修改手机号需要密码验证"
            description={settings.phone_change_requires_password.description}
          >
            <Switch
              id='phone_change_requires_password'
              checked={settings.phone_change_requires_password.value}
              onCheckedChange={(checked) =>
                handleBooleanChange('phone_change_requires_password', checked)
              }
              disabled={saving}
            />
          </SettingItem>
        )}
      </SettingSection>
    </div>
  );
}
