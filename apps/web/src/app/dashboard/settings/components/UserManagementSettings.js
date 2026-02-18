'use client';

import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';

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
    <div className='space-y-4'>
      <div>
        <h3 className='text-lg font-semibold mb-1'>用户管理</h3>
        <p className='text-sm text-muted-foreground mb-4'>
          管理用户修改个人信息的权限和限制
        </p>
      </div>

      {/* 用户名修改设置 */}
      <div className='space-y-4'>
        <h4 className='text-sm font-semibold text-muted-foreground'>用户名修改</h4>

        {/* 允许修改用户名 */}
        {settings.allow_username_change && (
          <div className='border border-border rounded-lg bg-card'>
            <div className='px-4 py-4'>
              <div className='flex items-center justify-between'>
                <div className='space-y-1 flex-1'>
                  <Label htmlFor='allow_username_change' className='text-sm font-semibold'>
                    允许修改用户名
                  </Label>
                  <p className='text-sm text-muted-foreground'>
                    {settings.allow_username_change.description}
                  </p>
                </div>
                <Switch
                  id='allow_username_change'
                  checked={settings.allow_username_change.value}
                  onCheckedChange={(checked) =>
                    handleBooleanChange('allow_username_change', checked)
                  }
                  disabled={saving}
                />
              </div>
            </div>
          </div>
        )}

        {/* 用户名修改冷却期和次数限制 */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          {/* 冷却期 */}
          {settings.username_change_cooldown_days && (
            <div className='border border-border rounded-lg bg-card'>
              <div className='px-4 py-4'>
                <div className='space-y-3'>
                  <div className='space-y-1'>
                    <Label htmlFor='username_change_cooldown_days' className='text-sm font-semibold'>
                      修改冷却期（天）
                    </Label>
                    <p className='text-sm text-muted-foreground'>
                      {settings.username_change_cooldown_days.description}
                    </p>
                  </div>
                  <Input
                    key={`cooldown-${settings.username_change_cooldown_days.value}`}
                    id='username_change_cooldown_days'
                    type='number'
                    min='0'
                    className='w-full'
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
                </div>
              </div>
            </div>
          )}

          {/* 次数限制 */}
          {settings.username_change_limit && (
            <div className='border border-border rounded-lg bg-card'>
              <div className='px-4 py-4'>
                <div className='space-y-3'>
                  <div className='space-y-1'>
                    <Label htmlFor='username_change_limit' className='text-sm font-semibold'>
                      修改次数限制
                    </Label>
                    <p className='text-sm text-muted-foreground'>
                      0 表示无限制
                    </p>
                  </div>
                  <Input
                    key={`limit-${settings.username_change_limit.value}`}
                    id='username_change_limit'
                    type='number'
                    min='0'
                    className='w-full'
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
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 修改用户名需要密码 */}
        {settings.username_change_requires_password && (
          <div className='border border-border rounded-lg bg-card'>
            <div className='px-4 py-4'>
              <div className='flex items-center justify-between'>
                <div className='space-y-1 flex-1'>
                  <Label htmlFor='username_change_requires_password' className='text-sm font-semibold'>
                    修改用户名需要密码验证
                  </Label>
                  <p className='text-sm text-muted-foreground'>
                    {settings.username_change_requires_password.description}
                  </p>
                </div>
                <Switch
                  id='username_change_requires_password'
                  checked={settings.username_change_requires_password.value}
                  onCheckedChange={(checked) =>
                    handleBooleanChange('username_change_requires_password', checked)
                  }
                  disabled={saving}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 邮箱修改设置 */}
      <div className='space-y-4 pt-4'>
        <h4 className='text-sm font-semibold text-muted-foreground'>邮箱修改</h4>

        {/* 允许修改邮箱 */}
        {settings.allow_email_change && (
          <div className='border border-border rounded-lg bg-card'>
            <div className='px-4 py-4'>
              <div className='flex items-center justify-between'>
                <div className='space-y-1 flex-1'>
                  <Label htmlFor='allow_email_change' className='text-sm font-semibold'>
                    允许修改邮箱
                  </Label>
                  <p className='text-sm text-muted-foreground'>
                    {settings.allow_email_change.description}
                  </p>
                </div>
                <Switch
                  id='allow_email_change'
                  checked={settings.allow_email_change.value}
                  onCheckedChange={(checked) =>
                    handleBooleanChange('allow_email_change', checked)
                  }
                  disabled={saving}
                />
              </div>
            </div>
          </div>
        )}

        {/* 修改邮箱需要密码 */}
        {settings.email_change_requires_password && (
          <div className='border border-border rounded-lg bg-card'>
            <div className='px-4 py-4'>
              <div className='flex items-center justify-between'>
                <div className='space-y-1 flex-1'>
                  <Label htmlFor='email_change_requires_password' className='text-sm font-semibold'>
                    修改邮箱需要密码验证
                  </Label>
                  <p className='text-sm text-muted-foreground'>
                    {settings.email_change_requires_password.description}
                  </p>
                </div>
                <Switch
                  id='email_change_requires_password'
                  checked={settings.email_change_requires_password.value}
                  onCheckedChange={(checked) =>
                    handleBooleanChange('email_change_requires_password', checked)
                  }
                  disabled={saving}
                />
              </div>
            </div>
          </div>
        )}


      </div>
    </div>
  );
}
