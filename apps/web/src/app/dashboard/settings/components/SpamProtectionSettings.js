'use client';

import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';
import { SettingSection, SettingItem } from '@/components/common/SettingLayout';

export function SpamProtectionSettings({ settings, handleChange, handleInputBlur, saving }) {
  if (!settings.spam_protection_enabled) return null;

  return (
    <div className='space-y-6'>
      <SettingSection description="使用 StopForumSpam API 检测和拦截垃圾注册">
        {settings.spam_protection_enabled && (
          <SettingItem
            title="启用垃圾注册拦截"
            description={settings.spam_protection_enabled.description}
          >
            <Switch
              id='spam_protection_enabled'
              checked={settings.spam_protection_enabled.value}
              onCheckedChange={(checked) =>
                handleChange('spam_protection_enabled', checked)
              }
              disabled={saving}
            />
          </SettingItem>
        )}

        {settings.spam_protection_enabled?.value && (
          <>
            {settings.spam_protection_api_key && (
              <SettingItem
                title="API Key (可选)"
                description={
                  <span>
                    提供 API Key 提高请求限制。访问{' '}
                    <a href='https://www.stopforumspam.com/keys' target='_blank' rel='noopener noreferrer' className='text-primary hover:underline'>
                      StopForumSpam
                    </a>
                    {' '}获取。
                  </span>
                }
              >
                <Input
                  id='spam_protection_api_key'
                  type='text'
                  placeholder='留空使用默认限制'
                  defaultValue={settings.spam_protection_api_key.value}
                  onBlur={(e) => handleInputBlur('spam_protection_api_key', e)}
                  disabled={saving}
                  className='w-64 font-mono text-sm'
                />
              </SettingItem>
            )}

            {settings.spam_protection_check_ip && (
              <SettingItem
                title="检查 IP 地址"
                description="验证用户的 IP 地址是否在垃圾注册数据库中"
              >
                <Switch
                  id='spam_protection_check_ip'
                  checked={settings.spam_protection_check_ip.value}
                  onCheckedChange={(checked) =>
                    handleChange('spam_protection_check_ip', checked)
                  }
                  disabled={saving}
                />
              </SettingItem>
            )}

            {settings.spam_protection_check_email && (
              <SettingItem
                title="检查邮箱地址"
                description="验证用户的邮箱地址是否在数据库中"
              >
                <Switch
                  id='spam_protection_check_email'
                  checked={settings.spam_protection_check_email.value}
                  onCheckedChange={(checked) =>
                    handleChange('spam_protection_check_email', checked)
                  }
                  disabled={saving}
                />
              </SettingItem>
            )}

            {settings.spam_protection_check_username && (
              <SettingItem
                title="检查用户名"
                description="验证用户的用户名是否在数据库中"
              >
                <Switch
                  id='spam_protection_check_username'
                  checked={settings.spam_protection_check_username.value}
                  onCheckedChange={(checked) =>
                    handleChange('spam_protection_check_username', checked)
                  }
                  disabled={saving}
                />
              </SettingItem>
            )}

            <SettingItem layout="vertical" className="bg-transparent">
              <Alert className="bg-muted/50 w-full">
                <InfoIcon className='h-4 w-4' />
                <AlertDescription className="text-muted-foreground">
                  如果 API 调用失败或超时，系统会自动跳过检查，不会阻止正常用户注册。
                </AlertDescription>
              </Alert>
            </SettingItem>
          </>
        )}
      </SettingSection>
    </div>
  );
}
