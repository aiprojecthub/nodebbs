'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SettingSection, SettingItem } from '@/components/common/SettingLayout';

export function RegistrationSettings({ settings, handleChange, saving }) {
  if (!settings.registration_mode) return null;

  return (
    <div className='space-y-6'>
      <SettingSection>
        <SettingItem
          title="注册模式"
          description={settings.registration_mode.description}
          layout="responsive"
        >
          <Select
            value={settings.registration_mode.value}
            onValueChange={(value) => handleChange('registration_mode', value)}
            disabled={saving}
          >
            <SelectTrigger className='w-full sm:w-48'>
              <SelectValue>
                {settings.registration_mode.value === 'open' && '开放注册'}
                {settings.registration_mode.value === 'invitation' && '邀请注册'}
                {settings.registration_mode.value === 'closed' && '关闭注册'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='open'>
                <div className='flex items-center gap-2'>
                  <span>🌐</span>
                  <div>
                    <div className='font-medium'>开放注册</div>
                    <div className='text-xs text-muted-foreground'>任何人都可以注册</div>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value='invitation'>
                <div className='flex items-center gap-2'>
                  <span>🎫</span>
                  <div>
                    <div className='font-medium'>邀请码注册</div>
                    <div className='text-xs text-muted-foreground'>需要邀请码才能注册</div>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value='closed'>
                <div className='flex items-center gap-2'>
                  <span>🔒</span>
                  <div>
                    <div className='font-medium'>关闭注册</div>
                    <div className='text-xs text-muted-foreground'>暂停所有新用户注册</div>
                  </div>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </SettingItem>
      </SettingSection>
    </div>
  );
}
