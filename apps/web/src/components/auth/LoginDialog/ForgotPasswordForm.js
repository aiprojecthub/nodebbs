'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DialogFooter } from '@/components/ui/dialog';
import { FormMessage } from './FormMessage';
import { Loader2, Mail, Lock, CheckCircle2 } from 'lucide-react';
import { authApi } from '@/lib/api';

/**
 * 找回密码表单 - 使用验证码方式
 * 步骤1：输入邮箱，发送验证码
 * 步骤2：输入验证码和新密码
 * 步骤3：提交重置
 */
export function ForgotPasswordForm({ onSuccess }) {
  const [step, setStep] = useState(1); // 1: 输入邮箱, 2: 输入验证码和密码
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 发送验证码
  const handleSendCode = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim()) {
      setError('请输入邮箱地址');
      return;
    }

    // 简单的邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('请输入有效的邮箱地址');
      return;
    }

    setIsLoading(true);

    try {
      const data = await authApi.sendCode(email, 'email_password_reset');
      setSuccess(data.message || '验证码已发送到您的邮箱');
      setStep(2); // 进入下一步
    } catch (err) {
      setError(err.message || '发送失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 重置密码
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!code.trim()) {
      setError('请输入验证码');
      return;
    }

    if (!password || !confirmPassword) {
      setError('请填写新密码');
      return;
    }

    if (password.length < 6) {
      setError('密码长度至少为6位');
      return;
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setIsLoading(true);

    try {
      const data = await authApi.resetPassword(email, code, password);
      setSuccess(data.message || '密码重置成功！');
      // 调用成功回调
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 1500);
      }
    } catch (err) {
      setError(err.message || '重置失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {/* 步骤指示器 */}
      <div className='flex items-center justify-center space-x-2 mb-6'>
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
                className={`w-16 h-0.5 ${
                  step > s ? 'bg-green-500' : 'bg-muted'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* 步骤1：输入邮箱并发送验证码 */}
      {step === 1 && (
        <form onSubmit={handleSendCode}>
          <div className='grid gap-4 py-4'>
            <FormMessage error={error} success={success} />

            <div className='grid gap-2'>
              <Label htmlFor='email'>邮箱 *</Label>
              <Input
                id='email'
                name='email'
                type='email'
                placeholder='请输入您的注册邮箱'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
              <p className='text-xs text-muted-foreground'>
                我们将向您的邮箱发送验证码
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type='submit' className='w-full' disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  发送中...
                </>
              ) : (
                <>
                  <Mail className='h-4 w-4' />
                  发送验证码
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      )}

      {/* 步骤2：输入验证码和新密码 */}
      {step === 2 && (
        <form onSubmit={handleResetPassword}>
          <div className='grid gap-4 py-4'>
            <FormMessage error={error} success={success} />

            <div className='p-3 bg-muted rounded-lg'>
              <p className='text-sm text-muted-foreground'>
                验证码已发送到：
                <span className='font-medium text-card-foreground ml-1'>
                  {email}
                </span>
              </p>
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='code'>验证码 *</Label>
              <Input
                id='code'
                type='text'
                placeholder='输入6位验证码'
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
                disabled={isLoading}
                required
              />
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='password'>新密码 *</Label>
              <Input
                id='password'
                type='password'
                placeholder='至少6位字符'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='confirmPassword'>确认新密码 *</Label>
              <Input
                id='confirmPassword'
                type='password'
                placeholder='请再次输入新密码'
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
          </div>

          <DialogFooter className='gap-2'>
            <Button
              type='button'
              variant='outline'
              onClick={() => {
                setStep(1);
                setCode('');
                setPassword('');
                setConfirmPassword('');
                setError('');
                setSuccess('');
              }}
              disabled={isLoading}
              className='flex-1'
            >
              上一步
            </Button>
            <Button
              type='submit'
              className='flex-1'
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  重置中...
                </>
              ) : (
                <>
                  <Lock className='h-4 w-4' />
                  重置密码
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      )}
    </div>
  );
}
