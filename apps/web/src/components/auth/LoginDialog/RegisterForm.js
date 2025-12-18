import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DialogFooter } from '@/components/ui/dialog';
import { FormMessage } from './FormMessage';

export function RegisterForm({
  formData,
  error,
  isLoading,
  registrationMode,
  invitationCodeStatus,
  onSubmit,
  onChange,
  onInvitationCodeBlur
}) {
  return (
    <form onSubmit={onSubmit}>
      <div className="grid gap-4 py-4">
        <FormMessage error={error} />

        <div className="grid gap-2">
          <Label htmlFor="username">用户名 *</Label>
          <Input
            id="username"
            name="username"
            type="text"
            placeholder="请输入用户名"
            value={formData.username}
            onChange={onChange}
            disabled={isLoading}
            required
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="name">姓名</Label>
          <Input
            id="name"
            name="name"
            type="text"
            placeholder="请输入您的姓名（可选）"
            value={formData.name}
            onChange={onChange}
            disabled={isLoading}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="email">邮箱 *</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="m@example.com"
            value={formData.email}
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
            placeholder="至少6位字符"
            value={formData.password}
            onChange={onChange}
            disabled={isLoading}
            required
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="confirmPassword">确认密码 *</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="请再次输入密码"
            value={formData.confirmPassword}
            onChange={onChange}
            disabled={isLoading}
            required
          />
        </div>

        {/* 邀请码输入框（仅在邀请码注册模式下显示） */}
        {registrationMode === 'invitation' && (
          <div className="grid gap-2">
            <Label htmlFor="invitationCode">
              邀请码 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="invitationCode"
              name="invitationCode"
              type="text"
              placeholder="请输入邀请码"
              value={formData.invitationCode}
              onChange={onChange}
              onBlur={onInvitationCodeBlur}
              disabled={isLoading}
              required
            />
            {invitationCodeStatus && (
              <p
                className={`text-sm ${
                  invitationCodeStatus.valid
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {invitationCodeStatus.message}
              </p>
            )}
          </div>
        )}
      </div>

      <DialogFooter>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? '注册中...' : '注册'}
        </Button>
      </DialogFooter>
    </form>
  );
}
