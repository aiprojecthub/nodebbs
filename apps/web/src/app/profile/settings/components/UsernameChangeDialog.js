'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormDialog } from '@/components/common/FormDialog';
import { Loader2 } from 'lucide-react';

export function UsernameChangeDialog({
  open,
  onOpenChange,
  user,
  settings,
  usernameData,
  onUsernameDataChange,
  onSubmit,
  loading,
  usernameInfo,
}) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="修改用户名"
      description={
        <span>
            {usernameInfo?.cooldownDays > 0 &&
              `修改后需等待 ${usernameInfo.cooldownDays} 天才能再次修改`}
            {usernameInfo?.remainingChanges >= 0 &&
              ` · 剩余修改次数：${usernameInfo.remainingChanges}次`}
        </span>
      }
      submitText={loading ? '修改中...' : '确认修改'}
      onSubmit={onSubmit}
      loading={loading}
      onCancel={() => {
          onOpenChange(false);
          onUsernameDataChange({ newUsername: '', password: '' });
      }}
      maxWidth="sm:max-w-[500px]"
    >
        <div className='space-y-4 py-4'>
          <div>
            <Label className='text-sm font-medium text-card-foreground block mb-2'>
              当前用户名
            </Label>
            <Input value={user?.username} disabled className='bg-muted' />
          </div>
          <div>
            <Label className='text-sm font-medium text-card-foreground block mb-2'>
              新用户名 *
            </Label>
            <Input
              value={usernameData.newUsername}
              onChange={(e) =>
                onUsernameDataChange({ ...usernameData, newUsername: e.target.value })
              }
              placeholder='输入新用户名'
              disabled={loading}
            />
          </div>
          {settings.username_change_requires_password?.value && (
            <div>
              <Label className='text-sm font-medium text-card-foreground block mb-2'>
                当前密码 *
              </Label>
              <Input
                type='password'
                value={usernameData.password}
                onChange={(e) =>
                  onUsernameDataChange({ ...usernameData, password: e.target.value })
                }
                placeholder='输入当前密码'
                disabled={loading}
              />
            </div>
          )}
        </div>
    </FormDialog>
  );
}
