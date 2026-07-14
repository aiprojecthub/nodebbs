'use client';

import { Switch } from '@/components/ui/switch';
import { SettingSection, SettingItem } from '@/components/common/SettingLayout';

export function SecuritySettings({ settings, handleChange, saving }) {
  return (
    <div className='space-y-6'>
      <SettingSection>
        {settings.email_verification_required && (
          <SettingItem
            title="邮箱验证要求"
            description={settings.email_verification_required.description}
          >
            <Switch
              id='email_verification_required'
              checked={settings.email_verification_required.value}
              onCheckedChange={(checked) =>
                handleChange('email_verification_required', checked)
              }
              disabled={saving}
            />
          </SettingItem>
        )}
      </SettingSection>
    </div>
  );
}
