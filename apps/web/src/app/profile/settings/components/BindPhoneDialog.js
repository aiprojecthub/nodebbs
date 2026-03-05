'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DialogFooter } from '@/components/ui/dialog';
import { FormDialog } from '@/components/common/FormDialog';
import { Loader2, CheckCircle2 } from 'lucide-react';

/**
 * 手机号绑定对话框（无手机号用户）
 * 简化为2步：输入手机号+验证码 → 可选密码确认
 */
export function BindPhoneDialog({
  open,
  onOpenChange,
  bindPhone,
}) {
  const {
    user,
    settings,
    step,
    setStep,
    formData,
    setFormData,
    sendCode,
    handleSubmit,
    loading,
    closeDialog,
  } = bindPhone;

  const requirePassword = settings.phone_change_requires_password?.value && user?.hasPassword;

  const handleClose = () => {
    closeDialog();
  };

  const getStepDescription = () => {
    switch (step) {
      case 1:
        return '输入手机号并验证';
      case 2:
        return '确认绑定并提交';
      default:
        return '';
    }
  };

  const getButtonText = () => {
    if (loading) {
      switch (step) {
        case 1:
          return formData.codeSent ? '下一步' : '发送中...';
        case 2:
          return '提交中...';
        default:
          return '处理中...';
      }
    }

    switch (step) {
      case 1:
        return formData.codeSent ? '下一步' : '发送验证码';
      case 2:
        return '确认绑定';
      default:
        return '继续';
    }
  };

  const handleNextStep = () => {
    switch (step) {
      case 1:
        if (!formData.codeSent) {
          sendCode();
        } else {
          if (!formData.code.trim()) {
            return;
          }
          setStep(2);
        }
        break;
      case 2:
        handleSubmit();
        break;
      default:
        break;
    }
  };

  const canProceedToNextStep = () => {
    switch (step) {
      case 1:
        return formData.phone.trim() && formData.codeSent && formData.code.trim();
      case 2:
        return requirePassword ? formData.password.trim() : true;
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
      title="绑定手机号"
      description={getStepDescription()}
      maxWidth="sm:max-w-125"
      footer={
        <DialogFooter className="shrink-0 p-6 pt-4">
          <Button
            variant='outline'
            onClick={() => {
              if (step === 1) {
                if (formData.codeSent) {
                  setFormData({
                    ...formData,
                    codeSent: false,
                    code: ''
                  });
                } else {
                  handleClose();
                }
              } else {
                setStep(step - 1);
              }
            }}
            disabled={loading}
          >
            {step === 1 && !formData.codeSent ? '取消' : '上一步'}
          </Button>
          <Button
            onClick={handleNextStep}
            disabled={loading || (step === 1 && formData.codeSent && !formData.code.trim())}
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
            {[1, 2].map((s) => (
              <div key={s} className='flex items-center'>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === s
                      ? 'bg-primary text-primary-foreground'
                      : step > s
                      ? 'bg-green-500 text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {step > s ? <CheckCircle2 className='h-4 w-4' /> : s}
                </div>
                {s < 2 && (
                  <div
                    className={`w-12 h-0.5 ${
                      step > s ? 'bg-green-500' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* 步骤 1：输入手机号并验证 */}
          {step === 1 && (
            <>
              <div>
                <Label className='text-sm font-medium text-card-foreground block mb-2'>
                  手机号 *
                </Label>
                <Input
                  type='tel'
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder='输入手机号'
                  disabled={loading || formData.codeSent}
                  maxLength={11}
                />
              </div>

              {formData.codeSent && (
                <>
                  <div className='p-4 bg-muted rounded-lg'>
                    <p className='text-sm text-muted-foreground'>
                      验证码已发送到：<span className='font-medium text-card-foreground'>{formData.phone}</span>
                    </p>
                  </div>
                  <div>
                    <Label className='text-sm font-medium text-card-foreground block mb-2'>
                      验证码 *
                    </Label>
                    <Input
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value })
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

          {/* 步骤 2：确认绑定 */}
          {step === 2 && (
            <>
              <div className='p-4 bg-muted rounded-lg space-y-2'>
                <p className='text-sm font-medium text-card-foreground'>确认信息</p>
                <div className='text-sm text-muted-foreground space-y-1'>
                  <p>绑定手机号：{formData.phone}</p>
                </div>
              </div>

              {requirePassword && (
                <div>
                  <Label className='text-sm font-medium text-card-foreground block mb-2'>
                    当前密码 *
                  </Label>
                  <Input
                    type='password'
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder='输入当前密码以确认绑定'
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
