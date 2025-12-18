import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DialogFooter } from '@/components/ui/dialog';
import { FormMessage } from './FormMessage';

export function LoginForm({
  formData,
  error,
  isLoading,
  onSubmit,
  onChange,
  onForgotPassword
}) {
  return (
    <form onSubmit={onSubmit}>
      <div className="grid gap-4 py-4">
        <FormMessage error={error} />

        <div className="grid gap-2">
          <Label htmlFor="identifier">用户名或邮箱 *</Label>
          <Input
            id="identifier"
            name="identifier"
            type="text"
            placeholder="请输入用户名或邮箱"
            value={formData.identifier}
            onChange={onChange}
            disabled={isLoading}
            required
          />
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">密码 *</Label>
            <Button
              type="button"
              variant="link"
              className="p-0 h-auto text-xs font-normal"
              onClick={onForgotPassword}
              disabled={isLoading}
            >
              忘记密码？
            </Button>
          </div>
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
        </div>
      </div>

      <DialogFooter>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? '登录中...' : '登录'}
        </Button>
      </DialogFooter>
    </form>
  );
}
