'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Phone, Lock, Loader2, Edit } from 'lucide-react';
import { EmailVerificationDialog } from '@/components/auth/EmailVerificationDialog';
import { usePasswordChange } from '@/hooks/profile/usePasswordChange';
import { useEmailChange } from '@/hooks/profile/useEmailChange';
import { useBindEmail } from '@/hooks/profile/useBindEmail';
import { useBindPhone } from '@/hooks/profile/useBindPhone';
import { usePhoneChange } from '@/hooks/profile/usePhoneChange';
import { useSettings } from '@/contexts/SettingsContext';
import { EmailChangeDialog } from './EmailChangeDialog';
import { BindEmailDialog } from './BindEmailDialog';
import { BindPhoneDialog } from './BindPhoneDialog';
import { PhoneChangeDialog } from './PhoneChangeDialog';

/**
 * 安全设置 Tab
 * 邮箱管理、手机号管理、密码修改
 */
export function SecurityTab() {
  const { settings } = useSettings();
  const [showEmailVerifyDialog, setShowEmailVerifyDialog] = useState(false);

  const {
    user,
    passwordData,
    updateField,
    handleSubmit,
    onEmailVerified,
    changingPassword,
  } = usePasswordChange();

  const emailChange = useEmailChange();
  const bindEmailHook = useBindEmail();
  const bindPhoneHook = useBindPhone();
  const phoneChange = usePhoneChange();

  if (!user) return null;

  const hasEmail = !!user.email;
  const hasPhone = !!user.phone;

  return (
    <div className='space-y-6'>
      {/* 邮箱管理 */}
      <div className='bg-card border border-border rounded-lg overflow-hidden'>
        <div className='px-4 py-3 bg-muted border-b border-border'>
          <h3 className='text-sm font-medium text-card-foreground'>
            邮箱管理
          </h3>
        </div>
        <div className='p-6'>
          <div className='flex items-center justify-between'>
            <div className='flex-1 mr-4'>
              <div className='flex items-center space-x-2 mb-1'>
                <Mail className='h-4 w-4 text-muted-foreground' />
                <Label className='text-sm font-medium text-card-foreground'>
                  {hasEmail ? user.email : '未绑定邮箱'}
                </Label>
              </div>
              <p className='text-xs text-muted-foreground'>
                {hasEmail
                  ? (user.isEmailVerified
                    ? (settings.allow_email_change?.value ? '您的邮箱已验证，可修改邮箱地址' : '您的邮箱已验证')
                    : '请验证您的邮箱以使用完整功能')
                  : '绑定邮箱后可用于登录和接收通知'}
              </p>
            </div>
            <div className='flex items-center gap-2'>
              {hasEmail ? (
                <>
                  {user.isEmailVerified ? (
                    <Badge variant='success' className='bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'>
                      已验证
                    </Badge>
                  ) : (
                    <>
                      <Badge variant='warning' className='bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'>
                        未验证
                      </Badge>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={() => setShowEmailVerifyDialog(true)}
                      >
                        <Mail className='h-4 w-4' />
                        验证
                      </Button>
                    </>
                  )}
                  {settings.allow_email_change?.value && (
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={emailChange.openDialog}
                    >
                      <Edit className='h-4 w-4' />
                      修改
                    </Button>
                  )}
                </>
              ) : (
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={bindEmailHook.openDialog}
                >
                  <Mail className='h-4 w-4' />
                  绑定邮箱
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 手机号管理 */}
      {(hasPhone || settings.phone_login_enabled?.value) && (
        <div className='bg-card border border-border rounded-lg overflow-hidden'>
          <div className='px-4 py-3 bg-muted border-b border-border'>
            <h3 className='text-sm font-medium text-card-foreground'>
              手机号管理
            </h3>
          </div>
          <div className='p-6'>
            <div className='flex items-center justify-between'>
              <div className='flex-1 mr-4'>
                <div className='flex items-center space-x-2 mb-1'>
                  <Phone className='h-4 w-4 text-muted-foreground' />
                  <Label className='text-sm font-medium text-card-foreground'>
                    {hasPhone ? user.phone : '未绑定手机号'}
                  </Label>
                </div>
                <p className='text-xs text-muted-foreground'>
                  {hasPhone
                    ? (settings.allow_phone_change?.value ? '可修改手机号' : '手机号不可修改')
                    : '绑定手机号后可用于登录和接收通知'}
                </p>
              </div>
              <div className='flex items-center gap-2'>
                {hasPhone ? (
                  <>
                    {user.isPhoneVerified && (
                      <Badge variant='success' className='bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'>
                        已验证
                      </Badge>
                    )}
                    {settings.allow_phone_change?.value && (
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={phoneChange.openDialog}
                      >
                        <Edit className='h-4 w-4' />
                        修改
                      </Button>
                    )}
                  </>
                ) : (
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={bindPhoneHook.openDialog}
                  >
                    <Phone className='h-4 w-4' />
                    绑定手机号
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 修改密码 */}
      <form onSubmit={handleSubmit} className='space-y-6'>
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
                  onChange={(e) => updateField('currentPassword', e.target.value)}
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
                onChange={(e) => updateField('newPassword', e.target.value)}
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
                onChange={(e) => updateField('confirmPassword', e.target.value)}
                placeholder='请再次输入新密码'
              />
            </div>
          </div>
        </div>

        <div className='flex items-center justify-end'>
          <Button type='submit' disabled={changingPassword}>
            {changingPassword ? (
              <>
                <Loader2 className='h-4 w-4 animate-spin' />
                {user.hasPassword === false ? '设置中...' : '修改中...'}
              </>
            ) : (
              <>
                <Lock className='h-4 w-4' />
                {user.hasPassword === false ? '设置密码' : '修改密码'}
              </>
            )}
          </Button>
        </div>
      </form>

      {/* 邮箱验证对话框 */}
      {user.email && (
        <EmailVerificationDialog
          open={showEmailVerifyDialog}
          onOpenChange={setShowEmailVerifyDialog}
          user={user}
          onVerified={onEmailVerified}
        />
      )}

      {/* 邮箱修改对话框 */}
      <EmailChangeDialog
        open={emailChange.showDialog}
        onOpenChange={emailChange.setShowDialog}
        emailChange={emailChange}
      />

      {/* 邮箱绑定对话框 */}
      <BindEmailDialog
        open={bindEmailHook.showDialog}
        onOpenChange={bindEmailHook.setShowDialog}
        bindEmail={bindEmailHook}
      />

      {/* 手机号修改对话框 */}
      <PhoneChangeDialog
        open={phoneChange.showDialog}
        onOpenChange={phoneChange.setShowDialog}
        phoneChange={phoneChange}
      />

      {/* 手机号绑定对话框 */}
      <BindPhoneDialog
        open={bindPhoneHook.showDialog}
        onOpenChange={bindPhoneHook.setShowDialog}
        bindPhone={bindPhoneHook}
      />
    </div>
  );
}
