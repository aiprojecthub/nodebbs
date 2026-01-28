'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DialogFooter } from '@/components/ui/dialog';
import { FormDialog } from '@/components/common/FormDialog';
import { Mail, Loader2, Send } from 'lucide-react';
import { authApi } from '@/lib/api';
import { toast } from 'sonner';

/**
 * 邮箱验证对话框 - 可复用组件
 * 用于邮箱验证流程：发送验证码 -> 输入验证码 -> 完成验证
 */
export function EmailVerificationDialog({ open, onOpenChange, user, onVerified }) {
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');

  // 发送验证码
  const handleSendCode = async () => {
    setIsSendingCode(true);

    try {
      const data = await authApi.sendCode(user.email, 'email_verify');
      toast.success(data.message || '验证码已发送到您的邮箱');
      setCodeSent(true);
    } catch (err) {
      toast.error(err.message || '发送失败，请稍后重试');
    } finally {
      setIsSendingCode(false);
    }
  };

  // 验证邮箱
  const handleVerifyEmail = async () => {
    if (!verificationCode.trim()) {
      toast.error('请输入验证码');
      return;
    }

    setIsVerifying(true);

    try {
      const data = await authApi.verifyEmail(verificationCode);
      toast.success(data.message || '邮箱验证成功');
      handleCloseDialog();
      // 调用回调通知父组件刷新用户信息
      if (onVerified) {
        onVerified();
      }
    } catch (err) {
      toast.error(err.message || '验证失败');
    } finally {
      setIsVerifying(false);
    }
  };

  // 关闭对话框时重置状态
  const handleCloseDialog = () => {
    if (onOpenChange) {
      onOpenChange(false);
    }
    setCodeSent(false);
    setVerificationCode('');
  };

  // 处理弹窗打开状态变化
  const handleOpenChange = (newOpen) => {
    // 如果已发送验证码，阻止通过点击遮罩关闭弹窗
    if (!newOpen && codeSent) {
      return;
    }
    if (onOpenChange) {
      onOpenChange(newOpen);
    }
    // 如果关闭弹窗，重置状态
    if (!newOpen) {
      setCodeSent(false);
      setVerificationCode('');
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="验证邮箱"
      description="我们将向您的邮箱发送验证码以确认邮箱所有权"
      maxWidth="sm:max-w-[425px]"
      footer={
        <DialogFooter className="shrink-0 p-6 pt-4">
          <Button
            type='button'
            variant='outline'
            onClick={handleCloseDialog}
            disabled={isSendingCode || isVerifying}
          >
            取消
          </Button>

          {!codeSent ? (
            <Button
              type='button'
              onClick={handleSendCode}
              disabled={isSendingCode}
            >
              {isSendingCode ? (
                <>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  发送中...
                </>
              ) : (
                <>
                  <Send className='h-4 w-4' />
                  发送验证码
                </>
              )}
            </Button>
          ) : (
            <div className='flex gap-2'>
              <Button
                type='button'
                variant='ghost'
                onClick={handleSendCode}
                disabled={isSendingCode}
                size='sm'
              >
                {isSendingCode ? '发送中...' : '重新发送'}
              </Button>
              <Button
                type='button'
                onClick={handleVerifyEmail}
                disabled={isVerifying || !verificationCode.trim()}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className='h-4 w-4 animate-spin' />
                    验证中...
                  </>
                ) : (
                  '验证'
                )}
              </Button>
            </div>
          )}
        </DialogFooter>
      }
    >
        <div className='space-y-4 py-4'>
          <div className='p-3 bg-muted rounded-lg'>
            <div className='flex items-center gap-2'>
              <Mail className='h-4 w-4 text-muted-foreground' />
              <p className='text-sm text-muted-foreground'>
                邮箱地址：
                <span className='font-medium text-card-foreground ml-1'>
                  {user?.email}
                </span>
              </p>
            </div>
          </div>

          {!codeSent ? (
            <p className='text-sm text-muted-foreground'>
              点击下方按钮，我们将向您的邮箱发送一个6位数字验证码
            </p>
          ) : (
            <div className='space-y-3'>
              <div className='p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg'>
                <p className='text-sm text-green-800 dark:text-green-200'>
                  验证码已发送到您的邮箱，请查收
                </p>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='verificationCode'>验证码 *</Label>
                <Input
                  id='verificationCode'
                  type='text'
                  placeholder='输入6位验证码'
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  maxLength={6}
                  disabled={isVerifying}
                />
              </div>
            </div>
          )}
        </div>
    </FormDialog>
  );
}
