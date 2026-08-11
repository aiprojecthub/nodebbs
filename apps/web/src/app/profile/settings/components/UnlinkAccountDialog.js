'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormDialog } from '@/components/common/FormDialog';
import { OAuthProviderIcon } from '@/components/auth/OAuthProviderIcon';

/**
 * 解除三方账号关联确认对话框
 *
 * 站点开启「解绑需要密码验证」且当前用户有密码时，需输入密码；
 * 纯三方注册（无密码）用户不可能提供密码，后端会自动跳过验证。
 */
export function UnlinkAccountDialog({ linkedAccounts }) {
  const {
    unlinkTarget,
    closeUnlinkDialog,
    requiresPassword,
    password,
    setPassword,
    submitting,
    handleUnlink,
  } = linkedAccounts;

  const displayName = unlinkTarget?.displayName || unlinkTarget?.provider || '';

  return (
    <FormDialog
      open={!!unlinkTarget}
      onOpenChange={(open) => {
        if (!open) closeUnlinkDialog();
      }}
      title="解除关联"
      description={`解除后将无法使用 ${displayName} 登录本站，可随时重新关联。`}
      submitText="确认解除"
      submitClassName="bg-destructive text-white hover:bg-destructive/90"
      loading={submitting}
      disabled={requiresPassword && !password}
      onSubmit={handleUnlink}
    >
      <div className="space-y-4 py-2">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-3">
          <OAuthProviderIcon provider={unlinkTarget?.provider} className="h-5 w-5" />
          <span className="text-sm font-medium text-card-foreground">
            {displayName}
          </span>
        </div>

        {requiresPassword && (
          <div>
            <Label className="text-sm font-medium text-card-foreground block mb-2">
              当前密码 *
            </Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入当前密码"
              autoComplete="current-password"
            />
          </div>
        )}
      </div>
    </FormDialog>
  );
}
