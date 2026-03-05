'use client';

import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { SettingSection, SettingItem } from '@/components/common/SettingLayout';

export function AuthenticationSettings({ settings, handleBooleanChange, handleNumberChange, saving }) {
  return (
    <div className='space-y-6'>
      <SettingSection title="认证方式" description="配置用户登录和认证相关功能">
        {settings.qr_login_enabled && (
          <>
            <SettingItem
              title="扫码登录功能"
              description="允许用户使用手机App扫描二维码登录"
            >
              <Switch
                id='qr_login_enabled'
                checked={settings.qr_login_enabled.value}
                onCheckedChange={(checked) =>
                  handleBooleanChange('qr_login_enabled', checked)
                }
                disabled={saving}
              />
            </SettingItem>

            {settings.qr_login_enabled.value && settings.qr_login_timeout && (
              <SettingItem
                title="二维码有效期（秒）"
                description="二维码登录请求的有效期，建议设置为 60-600 秒"
                className="pl-8 sm:pl-10"
              >
                <Input
                  id='qr_login_timeout'
                  type='number'
                  min='60'
                  max='600'
                  className='w-24'
                  value={settings.qr_login_timeout.value}
                  onChange={(e) =>
                    handleNumberChange('qr_login_timeout', e.target.value)
                  }
                  disabled={saving}
                />
              </SettingItem>
            )}
          </>
        )}

        {settings.phone_login_enabled && (
          <SettingItem
            title="手机号登录功能"
            description="允许用户使用手机号+验证码或密码登录（需先配置短信服务）"
          >
            <Switch
              id='phone_login_enabled'
              checked={settings.phone_login_enabled.value}
              onCheckedChange={(checked) =>
                handleBooleanChange('phone_login_enabled', checked)
              }
              disabled={saving}
            />
          </SettingItem>
        )}
      </SettingSection>
    </div>
  );
}
