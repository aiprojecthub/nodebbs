'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DialogFooter } from '@/components/ui/dialog';
import { FormDialog } from '@/components/common/FormDialog';
import { Loader2, CheckCircle2 } from 'lucide-react';

/**
 * 手机号修改对话框
 * 接收 phoneChange Hook 实例
 */
export function PhoneChangeDialog({
  open,
  onOpenChange,
  phoneChange,
}) {
  const {
    user,
    settings,
    step: phoneStep,
    setStep: onStepChange,
    formData: phoneData,
    setFormData: onPhoneDataChange,
    sendOldPhoneCode: onSendOldPhoneCode,
    sendNewPhoneCode: onSendNewPhoneCode,
    handleSubmit: onSubmitPhoneChange,
    loading,
    closeDialog,
  } = phoneChange;

  const handleClose = () => {
    closeDialog();
  };

  // 判断是否需要密码步骤
  const needsPasswordStep = settings.phone_change_requires_password?.value && user?.hasPassword;
  const totalSteps = needsPasswordStep ? 3 : 2;

  const getStepDescription = () => {
    switch (phoneStep) {
      case 1:
        return '验证您的当前手机号';
      case 2:
        return '设置新手机号并验证';
      case 3:
        return '确认修改并提交';
      default:
        return '';
    }
  };

  const getButtonText = () => {
    if (loading) {
      switch (phoneStep) {
        case 1:
          return phoneData.oldPhoneCodeSent ? '下一步' : '发送中...';
        case 2:
          return phoneData.newPhoneCodeSent ? (phoneStep === totalSteps ? '确认修改' : '下一步') : '发送中...';
        case 3:
          return '提交中...';
        default:
          return '处理中...';
      }
    }

    switch (phoneStep) {
      case 1:
        return phoneData.oldPhoneCodeSent ? '下一步' : '发送验证码';
      case 2:
        return phoneData.newPhoneCodeSent ? (phoneStep === totalSteps ? '确认修改' : '下一步') : '发送验证码';
      case 3:
        return '确认修改';
      default:
        return '继续';
    }
  };

  const handleNextStep = () => {
    switch (phoneStep) {
      case 1:
        if (!phoneData.oldPhoneCodeSent) {
          onSendOldPhoneCode();
        } else {
          if (!phoneData.oldPhoneCode.trim()) {
            return;
          }
          onStepChange(2);
        }
        break;
      case 2:
        if (!phoneData.newPhoneCodeSent) {
          onSendNewPhoneCode();
        } else {
          if (!phoneData.newPhoneCode.trim()) {
            return;
          }
          if (needsPasswordStep) {
            onStepChange(3);
          } else {
            onSubmitPhoneChange();
          }
        }
        break;
      case 3:
        onSubmitPhoneChange();
        break;
      default:
        break;
    }
  };

  const isButtonDisabled = () => {
    if (loading) return true;
    switch (phoneStep) {
      case 1:
        return phoneData.oldPhoneCodeSent && !phoneData.oldPhoneCode.trim();
      case 2:
        if (!phoneData.newPhoneCodeSent) return !phoneData.newPhone.trim();
        return !phoneData.newPhoneCode.trim();
      case 3:
        return !phoneData.password.trim();
      default:
        return false;
    }
  };

  // 格式化手机号显示（隐藏中间4位）
  const maskedPhone = user?.phone
    ? user.phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2')
    : '';

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
      title="修改手机号"
      description={getStepDescription()}
      maxWidth="sm:max-w-125"
      footer={
        <DialogFooter className="shrink-0 p-6 pt-4">
          <Button
            variant='outline'
            onClick={() => {
              if (phoneStep === 1) {
                handleClose();
              } else if (phoneStep === 2 && phoneData.newPhoneCodeSent) {
                onPhoneDataChange({
                  ...phoneData,
                  newPhoneCodeSent: false,
                  newPhoneCode: ''
                });
              } else {
                onStepChange(phoneStep - 1);
              }
            }}
            disabled={loading}
          >
            {phoneStep === 1 ? '取消' : '上一步'}
          </Button>
          <Button
            onClick={handleNextStep}
            disabled={isButtonDisabled()}
          >
            {loading ? (
              <>
                <Loader2 className='h-4 w-4 animate-spin' />
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
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
              <div key={step} className='flex items-center'>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    phoneStep === step
                      ? 'bg-primary text-primary-foreground'
                      : phoneStep > step
                      ? 'bg-green-500 text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {phoneStep > step ? <CheckCircle2 className='h-4 w-4' /> : step}
                </div>
                {step < totalSteps && (
                  <div
                    className={`w-12 h-0.5 ${
                      phoneStep > step ? 'bg-green-500' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* 步骤 1：验证旧手机号 */}
          {phoneStep === 1 && (
            <>
              <div>
                <Label className='text-sm font-medium text-card-foreground block mb-2'>
                  当前手机号
                </Label>
                <Input value={maskedPhone} disabled className='bg-muted' />
              </div>

              {!phoneData.oldPhoneCodeSent ? (
                <p className='text-sm text-muted-foreground'>
                  点击"发送验证码"按钮，我们将向您的当前手机号发送验证码
                </p>
              ) : (
                <div>
                  <Label className='text-sm font-medium text-card-foreground block mb-2'>
                    验证码 *
                  </Label>
                  <Input
                    value={phoneData.oldPhoneCode}
                    onChange={(e) =>
                      onPhoneDataChange({ ...phoneData, oldPhoneCode: e.target.value })
                    }
                    placeholder='输入6位验证码'
                    maxLength={6}
                    disabled={loading}
                    onKeyDown={(e) => e.key === 'Enter' && !isButtonDisabled() && handleNextStep()}
                  />
                  <p className='text-xs text-muted-foreground mt-1'>
                    验证码已发送到 {maskedPhone}
                  </p>
                </div>
              )}
            </>
          )}

          {/* 步骤 2：输入新手机号并验证 */}
          {phoneStep === 2 && (
            <>
              <div>
                <Label className='text-sm font-medium text-card-foreground block mb-2'>
                  新手机号 *
                </Label>
                <Input
                  type='tel'
                  value={phoneData.newPhone}
                  onChange={(e) =>
                    onPhoneDataChange({ ...phoneData, newPhone: e.target.value })
                  }
                  placeholder='输入新手机号'
                  maxLength={11}
                  disabled={loading || phoneData.newPhoneCodeSent}
                />
              </div>

              {phoneData.newPhoneCodeSent && (
                <>
                  <div className='p-4 bg-muted rounded-lg'>
                    <p className='text-sm text-muted-foreground'>
                      验证码已发送到：<span className='font-medium text-card-foreground'>{phoneData.newPhone}</span>
                    </p>
                  </div>
                  <div>
                    <Label className='text-sm font-medium text-card-foreground block mb-2'>
                      验证码 *
                    </Label>
                    <Input
                      value={phoneData.newPhoneCode}
                      onChange={(e) =>
                        onPhoneDataChange({ ...phoneData, newPhoneCode: e.target.value })
                      }
                      placeholder='输入6位验证码'
                      maxLength={6}
                      disabled={loading}
                      onKeyDown={(e) => e.key === 'Enter' && !isButtonDisabled() && handleNextStep()}
                    />
                  </div>
                </>
              )}
            </>
          )}

          {/* 步骤 3：输入密码并确认（仅当需要密码验证时） */}
          {phoneStep === 3 && (
            <>
              <div className='p-4 bg-muted rounded-lg space-y-2'>
                <p className='text-sm font-medium text-card-foreground'>确认信息</p>
                <div className='text-sm text-muted-foreground space-y-1'>
                  <p>当前手机号：{maskedPhone}</p>
                  <p>新手机号：{phoneData.newPhone}</p>
                </div>
              </div>

              <div>
                <Label className='text-sm font-medium text-card-foreground block mb-2'>
                  当前密码 *
                </Label>
                <Input
                  type='password'
                  value={phoneData.password}
                  onChange={(e) =>
                    onPhoneDataChange({ ...phoneData, password: e.target.value })
                  }
                  placeholder='输入当前密码以确认修改'
                  disabled={loading}
                  onKeyDown={(e) => e.key === 'Enter' && !isButtonDisabled() && handleNextStep()}
                />
                <p className='text-xs text-muted-foreground mt-1'>
                  为了您的账户安全，需要验证当前密码
                </p>
              </div>
            </>
          )}
        </div>
    </FormDialog>
  );
}
