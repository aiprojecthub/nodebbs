'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DialogFooter } from '@/components/ui/dialog';
import { FormDialog } from '@/components/common/FormDialog';
import { Loader2, CheckCircle2 } from 'lucide-react';

/**
 * 邮箱修改对话框
 * 接收 emailChange Hook 实例
 */
export function EmailChangeDialog({
  open,
  onOpenChange,
  emailChange,
}) {
  const {
    user,
    settings,
    step: emailStep,
    setStep: onStepChange,
    formData: emailData,
    setFormData: onEmailDataChange,
    sendOldEmailCode: onSendOldEmailCode,
    sendNewEmailCode: onSendNewEmailCode,
    handleSubmit: onSubmitEmailChange,
    loading,
    closeDialog,
  } = emailChange;

  const handleClose = () => {
    closeDialog();
  };

  const getStepDescription = () => {
    switch (emailStep) {
      case 1:
        return '验证您的当前邮箱';
      case 2:
        return '设置新邮箱并验证';
      case 3:
        return '确认修改并提交';
      default:
        return '';
    }
  };

  const getButtonText = () => {
    if (loading) {
      switch (emailStep) {
        case 1:
          return emailData.oldEmailCodeSent ? '下一步' : '发送中...';
        case 2:
          return emailData.newEmailCodeSent ? '下一步' : '发送中...';
        case 3:
          return '提交中...';
        default:
          return '处理中...';
      }
    }

    switch (emailStep) {
      case 1:
        return emailData.oldEmailCodeSent ? '下一步' : '发送验证码';
      case 2:
        return emailData.newEmailCodeSent ? '下一步' : '发送验证码';
      case 3:
        return '确认修改';
      default:
        return '继续';
    }
  };

  const handleNextStep = () => {
    switch (emailStep) {
      case 1:
        if (!emailData.oldEmailCodeSent) {
          onSendOldEmailCode();
        } else {
          if (!emailData.oldEmailCode.trim()) {
            return;
          }
          onStepChange(2);
        }
        break;
      case 2:
        if (!emailData.newEmailCodeSent) {
          onSendNewEmailCode();
        } else {
          if (!emailData.newEmailCode.trim()) {
            return;
          }
          onStepChange(3);
        }
        break;
      case 3:
        onSubmitEmailChange();
        break;
      default:
        break;
    }
  };

  const canProceedToNextStep = () => {
    switch (emailStep) {
      case 1:
        return emailData.oldEmailCodeSent && emailData.oldEmailCode.trim();
      case 2:
        return emailData.newEmail.trim() && emailData.newEmailCodeSent && emailData.newEmailCode.trim();
      case 3:
        return settings.email_change_requires_password?.value
          ? emailData.password.trim()
          : true;
      default:
        return false;
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          handleClose();
        } else {
          onOpenChange(true);
        }
      }}
      title="修改邮箱地址"
      description={getStepDescription()}
      maxWidth="sm:max-w-[500px]"
      footer={
        <DialogFooter className="shrink-0 p-6 pt-4">
          <Button
            variant='outline'
            onClick={() => {
              if (emailStep === 1) {
                handleClose();
              } else if (emailStep === 2 && emailData.newEmailCodeSent) {
                onEmailDataChange({
                  ...emailData,
                  newEmailCodeSent: false,
                  newEmailCode: ''
                });
              } else {
                onStepChange(emailStep - 1);
              }
            }}
            disabled={loading}
          >
            {emailStep === 1 ? '取消' : '上一步'}
          </Button>
          <Button
            onClick={handleNextStep}
            disabled={loading || (emailStep === 1 && emailData.oldEmailCodeSent && !emailData.oldEmailCode.trim()) || (emailStep === 2 && emailData.newEmailCodeSent && !emailData.newEmailCode.trim())}
          >
            {loading ? (
              <>
                <Loader2 className='h-4 w-4 animate-spin mr-2' />
                {getButtonText()}
              </>
            ) : (
              getButtonText()
            )}
          </Button>
        </DialogFooter>
      }
    >
        <div className='space-y-4 py-4'>
          {/* 步骤指示器 */}
          <div className='flex items-center justify-center space-x-2 pb-2'>
            {[1, 2, 3].map((step) => (
              <div key={step} className='flex items-center'>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    emailStep === step
                      ? 'bg-primary text-primary-foreground'
                      : emailStep > step
                      ? 'bg-green-500 text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {emailStep > step ? <CheckCircle2 className='h-4 w-4' /> : step}
                </div>
                {step < 3 && (
                  <div
                    className={`w-12 h-0.5 ${
                      emailStep > step ? 'bg-green-500' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* 步骤 1：验证旧邮箱 */}
          {emailStep === 1 && (
            <>
              <div>
                <Label className='text-sm font-medium text-card-foreground block mb-2'>
                  当前邮箱
                </Label>
                <Input value={user?.email} disabled className='bg-muted' />
              </div>

              {!emailData.oldEmailCodeSent ? (
                <p className='text-sm text-muted-foreground'>
                  点击"发送验证码"按钮，我们将向您的当前邮箱发送验证码
                </p>
              ) : (
                <div>
                  <Label className='text-sm font-medium text-card-foreground block mb-2'>
                    验证码 *
                  </Label>
                  <Input
                    value={emailData.oldEmailCode}
                    onChange={(e) =>
                      onEmailDataChange({ ...emailData, oldEmailCode: e.target.value })
                    }
                    placeholder='输入6位验证码'
                    maxLength={6}
                    disabled={loading}
                    onKeyPress={(e) => e.key === 'Enter' && canProceedToNextStep() && handleNextStep()}
                  />
                  <p className='text-xs text-muted-foreground mt-1'>
                    验证码已发送到 {user?.email}
                  </p>
                </div>
              )}
            </>
          )}

          {/* 步骤 2：输入新邮箱并验证 */}
          {emailStep === 2 && (
            <>
              <div>
                <Label className='text-sm font-medium text-card-foreground block mb-2'>
                  新邮箱地址 *
                </Label>
                <Input
                  type='email'
                  value={emailData.newEmail}
                  onChange={(e) =>
                    onEmailDataChange({ ...emailData, newEmail: e.target.value })
                  }
                  placeholder='输入新邮箱地址'
                  disabled={loading || emailData.newEmailCodeSent}
                />
              </div>

              {emailData.newEmailCodeSent && (
                <>
                  <div className='p-4 bg-muted rounded-lg'>
                    <p className='text-sm text-muted-foreground'>
                      验证码已发送到：<span className='font-medium text-card-foreground'>{emailData.newEmail}</span>
                    </p>
                  </div>
                  <div>
                    <Label className='text-sm font-medium text-card-foreground block mb-2'>
                      验证码 *
                    </Label>
                    <Input
                      value={emailData.newEmailCode}
                      onChange={(e) =>
                        onEmailDataChange({ ...emailData, newEmailCode: e.target.value })
                      }
                      placeholder='输入6位验证码'
                      maxLength={6}
                      disabled={loading}
                      onKeyPress={(e) => e.key === 'Enter' && canProceedToNextStep() && handleNextStep()}
                    />
                  </div>
                </>
              )}
            </>
          )}

          {/* 步骤 3：输入密码并确认 */}
          {emailStep === 3 && (
            <>
              <div className='p-4 bg-muted rounded-lg space-y-2'>
                <p className='text-sm font-medium text-card-foreground'>确认信息</p>
                <div className='text-sm text-muted-foreground space-y-1'>
                  <p>当前邮箱：{user?.email}</p>
                  <p>新邮箱：{emailData.newEmail}</p>
                </div>
              </div>

              {settings.email_change_requires_password?.value && (
                <div>
                  <Label className='text-sm font-medium text-card-foreground block mb-2'>
                    当前密码 *
                  </Label>
                  <Input
                    type='password'
                    value={emailData.password}
                    onChange={(e) =>
                      onEmailDataChange({ ...emailData, password: e.target.value })
                    }
                    placeholder='输入当前密码以确认修改'
                    disabled={loading}
                    onKeyPress={(e) => e.key === 'Enter' && canProceedToNextStep() && handleNextStep()}
                  />
                  <p className='text-xs text-muted-foreground mt-1'>
                    为了您的账户安全，需要验证当前密码
                  </p>
                </div>
              )}
            </>
          )}
        </div>
    </FormDialog>
  );
}
