'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormMessage } from './FormMessage';
import { Loader2 } from 'lucide-react';
import { usePhoneLoginForm } from '@/hooks/auth/usePhoneLoginForm';

export function PhoneLoginForm({ onSuccess }) {
  const {
    phone,
    setPhone,
    code,
    setCode,
    countdown,
    isLoading,
    error,
    handleSendCode,
    handleSubmit,
  } = usePhoneLoginForm({ onSuccess });

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4 py-4">
        <FormMessage error={error} />

        <div className="grid gap-2">
          <Label htmlFor="phone">手机号 *</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="请输入手机号"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={isLoading}
            maxLength={11}
            required
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="sms-code">验证码 *</Label>
          <div className="flex gap-2">
            <Input
              id="sms-code"
              type="text"
              placeholder="输入6位验证码"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={isLoading}
              maxLength={6}
              className="flex-1"
              required
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleSendCode}
              disabled={isLoading || countdown > 0}
              className="shrink-0 w-[120px]"
            >
              {countdown > 0 ? `${countdown}s 后重发` : '发送验证码'}
            </Button>
          </div>
        </div>
      </div>

      <div className="pt-2">
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              登录中...
            </>
          ) : (
            '登录'
          )}
        </Button>
      </div>
    </form>
  );
}
