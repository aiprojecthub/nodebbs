import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormMessage } from './FormMessage';
import { CaptchaWidget } from '@/components/captcha/CaptchaWidget';

export function LoginForm({
  formData,
  error,
  isLoading,
  onSubmit,
  onChange,
  onForgotPassword,
  onCaptchaVerify,
  phoneLoginEnabled,
}) {
  const identifierLabel = phoneLoginEnabled ? '用户名、邮箱或手机号 *' : '用户名或邮箱 *';
  const identifierPlaceholder = phoneLoginEnabled ? '请输入用户名、邮箱或手机号' : '请输入用户名或邮箱';

  return (
    <form onSubmit={onSubmit}>
      <div className="grid gap-4 py-4">
        <FormMessage error={error} />

        <div className="grid gap-2">
          <Label htmlFor="identifier">{identifierLabel}</Label>
          <Input
            id="identifier"
            name="identifier"
            type="text"
            placeholder={identifierPlaceholder}
            value={formData.identifier}
            onChange={onChange}
            disabled={isLoading}
            required
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="password">密码 *</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="请输入密码"
            value={formData.password}
            onChange={onChange}
            disabled={isLoading}
            required
          />
          <div className="flex justify-end">
            <Button
              type="button"
              variant="link"
              className="p-0 h-auto text-xs font-normal"
              onClick={onForgotPassword}
              disabled={isLoading}
              tabIndex={-1}
            >
              忘记密码？
            </Button>
          </div>
        </div>

        {/* 人机验证 */}
        <CaptchaWidget scene="login" onVerify={onCaptchaVerify} />
      </div>

      <div className="pt-2">
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? '登录中...' : '登录'}
        </Button>
      </div>
    </form>
  );
}

