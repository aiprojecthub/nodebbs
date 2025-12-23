'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { EmailVerificationDialog } from '@/components/auth/EmailVerificationDialog';

export function SecurityTab({
  user,
  passwordData,
  onPasswordChange,
  onPasswordSubmit,
  changingPassword,
  onEmailVerified, // 邮箱验证成功后的回调
}) {
  const [showEmailVerifyDialog, setShowEmailVerifyDialog] = useState(false);

  return (
    <div className='space-y-6'>
      {/* 邮箱验证 */}
      <div className='bg-card border border-border rounded-lg overflow-hidden'>
        <div className='px-4 py-3 bg-muted border-b border-border'>
          <h3 className='text-sm font-medium text-card-foreground'>
            邮箱验证
          </h3>
        </div>
        <div className='p-6'>
          <div className='flex items-center justify-between'>
            <div className='flex-1 mr-4'>
              <div className='flex items-center space-x-2 mb-1'>
                <Mail className='h-4 w-4 text-muted-foreground' />
                <Label className='text-sm font-medium text-card-foreground'>
                  {user.email}
                </Label>
              </div>
              <p className='text-xs text-muted-foreground'>
                {user.isEmailVerified
                  ? '您的邮箱已验证'
                  : '请验证您的邮箱以使用完整功能'}
              </p>
            </div>
            {user.isEmailVerified ? (
              <Badge variant='success' className='bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'>
                已验证
              </Badge>
            ) : (
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => setShowEmailVerifyDialog(true)}
              >
                <Mail className='h-4 w-4 mr-1' />
                验证邮箱
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 邮箱验证对话框 */}
      <EmailVerificationDialog
        open={showEmailVerifyDialog}
        onOpenChange={setShowEmailVerifyDialog}
        user={user}
        onVerified={onEmailVerified}
      />

      {/* 修改密码 */}
      <form onSubmit={onPasswordSubmit} className='space-y-6'>
        <div className='bg-card border border-border rounded-lg overflow-hidden'>
          <div className='px-4 py-3 bg-muted border-b border-border'>
            <h3 className='text-sm font-medium text-card-foreground'>
              {user.hasPassword === false ? '设置密码' : '修改密码'}
            </h3>
          </div>
          <div className='p-6 space-y-4'>
            {user.hasPassword !== false && (
              <div>
                <Label className='text-sm font-medium text-card-foreground block mb-2'>
                  当前密码 *
                </Label>
                <Input
                  type='password'
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    onPasswordChange('currentPassword', e.target.value)
                  }
                  placeholder='请输入当前密码'
                />
              </div>
            )}

            <div>
              <Label className='text-sm font-medium text-card-foreground block mb-2'>
                新密码 *
              </Label>
              <Input
                type='password'
                value={passwordData.newPassword}
                onChange={(e) =>
                  onPasswordChange('newPassword', e.target.value)
                }
                placeholder='请输入新密码（至少6位）'
              />
            </div>

            <div>
              <Label className='text-sm font-medium text-card-foreground block mb-2'>
                确认新密码 *
              </Label>
              <Input
                type='password'
                value={passwordData.confirmPassword}
                onChange={(e) =>
                  onPasswordChange('confirmPassword', e.target.value)
                }
                placeholder='请再次输入新密码'
              />
            </div>
          </div>
        </div>

        <div className='flex items-center justify-end'>
          <Button type='submit' disabled={changingPassword}>
            {changingPassword ? (
              <>
                <Loader2 className='h-4 w-4 animate-spin mr-2' />
                {user.hasPassword === false ? '设置中...' : '修改中...'}
              </>
            ) : (
              <>
                <Lock className='h-4 w-4 mr-2' />
                {user.hasPassword === false ? '设置密码' : '修改密码'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
