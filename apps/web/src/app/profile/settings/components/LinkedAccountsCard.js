'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link2, Loader2, AlertTriangle } from 'lucide-react';
import Time from '@/components/common/Time';
import { OAuthProviderIcon } from '@/components/auth/OAuthProviderIcon';
import { useLinkedAccounts } from '@/hooks/profile/useLinkedAccounts';
import { UnlinkAccountDialog } from './UnlinkAccountDialog';

/**
 * 关联账号卡片
 *
 * 关联/解绑三方登录方式。解绑前会确保账号至少还留有一种登录方式
 * （密码 / 手机验证码 / 其它三方账号），否则用户会把自己锁在门外。
 */
export function LinkedAccountsCard({ onGoToSecurity }) {
  const linkedAccounts = useLinkedAccounts();
  const { rows, loading, error, canUnlink, loginMethods, linkingProvider, refresh } =
    linkedAccounts;

  // 平台一个都没启用且没有历史关联时，整张卡片不必出现。
  // 但请求失败时 rows 同样是空的，此时要留下卡片显示错误，不能悄悄消失
  if (!loading && !error && rows.length === 0) return null;

  const hasLinked = rows.some((row) => row.account);
  // 唯一登录方式就是那个三方账号：解绑会锁死，给出解锁引导
  const lockedByLastMethod =
    hasLinked &&
    !canUnlink &&
    !loginMethods?.hasPassword &&
    !loginMethods?.hasPhoneLogin;

  return (
    <>
      <div className="bg-card border border-border rounded-lg overflow-hidden mt-6">
        <div className="px-4 py-3 bg-muted border-b border-border">
          <h3 className="text-sm font-medium text-card-foreground">关联账号</h3>
        </div>

        <div className="p-6 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-4 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-between gap-3 py-2">
              <p className="text-sm text-muted-foreground">
                关联账号加载失败，请稍后重试
              </p>
              <Button type="button" variant="outline" size="sm" onClick={refresh}>
                重试
              </Button>
            </div>
          ) : (
            <>
              {lockedByLastMethod && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-50 p-3 dark:bg-amber-900/20">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      三方账号是你当前唯一的登录方式，解绑后将无法登录。请先设置密码或绑定手机号。
                    </p>
                    {onGoToSecurity && (
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto p-0 mt-1 text-amber-700 dark:text-amber-400"
                        onClick={onGoToSecurity}
                      >
                        去设置密码
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {rows.map((row) => (
                <div
                  key={row.provider}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 flex-1 mr-4 min-w-0">
                    <OAuthProviderIcon provider={row.provider} className="h-5 w-5 shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-card-foreground truncate">
                          {row.displayName}
                        </span>
                        {row.account && (
                          <Badge
                            variant="secondary"
                            className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          >
                            已关联
                          </Badge>
                        )}
                        {!row.isEnabled && (
                          <Badge variant="outline">已停用</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {row.account ? (
                          <>
                            关联于 <Time date={row.account.createdAt} format='YYYY-MM-DD' />
                          </>
                        ) : (
                          '未关联'
                        )}
                      </p>
                    </div>
                  </div>

                  {row.account ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => linkedAccounts.openUnlinkDialog(row)}
                      disabled={!row.canUnlink}
                      title={
                        row.canUnlink
                          ? undefined
                          : '这是你唯一的登录方式，请先设置密码或绑定手机号'
                      }
                    >
                      解除关联
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => linkedAccounts.handleLink(row.provider)}
                      disabled={!!linkingProvider}
                    >
                      {linkingProvider === row.provider ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Link2 className="h-4 w-4" />
                      )}
                      关联
                    </Button>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      <UnlinkAccountDialog linkedAccounts={linkedAccounts} />
    </>
  );
}
