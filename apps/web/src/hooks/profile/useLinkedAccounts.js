'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/lib/api';
import { useOAuthProviders } from '@/hooks/auth/useOAuthProviders';
import { toast } from 'sonner';

/**
 * 三方账号关联 Hook
 *
 * 把「已启用的平台」（/oauth/providers）与「当前用户已关联的账号」（/oauth/accounts）
 * 合并成一份可直接渲染的行数据。平台被管理员停用后，已关联的记录仍会保留在列表里，
 * 否则用户将无从解绑。
 */
export function useLinkedAccounts() {
  const { user, refreshUser } = useAuth();
  const { oauthProviders: enabledProviders } = useOAuthProviders();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // ===== 解绑对话框状态 =====
  const [unlinkTarget, setUnlinkTarget] = useState(null);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ===== 关联中的平台（跳转前的 loading）=====
  const [linkingProvider, setLinkingProvider] = useState(null);

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const result = await authApi.getOAuthAccounts();
      setData(result);
    } catch (error) {
      console.error('获取关联账号失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  /**
   * 合并成渲染用的行：已启用平台 ∪ 已关联平台
   */
  const rows = useMemo(() => {
    const linked = data?.accounts ?? [];
    const linkable = data?.linkableProviders ?? [];
    const linkedMap = new Map(linked.map((item) => [item.provider, item]));

    const merged = new Map();

    for (const provider of enabledProviders) {
      merged.set(provider.provider, {
        provider: provider.provider,
        displayName: provider.displayName || provider.provider,
        displayOrder: provider.displayOrder ?? 0,
        isEnabled: true,
        account: linkedMap.get(provider.provider) || null,
      });
    }

    // 已关联但平台已停用（或已从启用列表移除）的，补进来以便解绑
    for (const account of linked) {
      if (merged.has(account.provider)) continue;
      merged.set(account.provider, {
        provider: account.provider,
        displayName: account.displayName || account.provider,
        displayOrder: account.displayOrder ?? 999,
        isEnabled: false,
        account,
      });
    }

    return Array.from(merged.values())
      .map((row) => ({
        ...row,
        // 平台需同时「已启用」且「后端支持 Web 关联」才给关联入口
        canLink: row.isEnabled && linkable.includes(row.provider),
        canUnlink: !!row.account && !!data?.canUnlink,
      }))
      // 未关联且不可关联的平台（如 Apple）没有任何可操作项，不必占位
      .filter((row) => row.account || row.canLink)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }, [data, enabledProviders]);

  /**
   * 发起关联：拿授权链接后整页跳转，回调落在 /auth/[provider]/callback
   */
  const handleLink = useCallback(async (provider) => {
    try {
      setLinkingProvider(provider);
      const { authorizationUri } = await authApi.getOAuthLinkUrl(provider);
      window.location.href = authorizationUri;
    } catch (error) {
      console.error('发起账号关联失败:', error);
      toast.error(error.message || '发起关联失败');
      setLinkingProvider(null);
    }
  }, []);

  // ===== 解绑对话框 =====
  const openUnlinkDialog = useCallback((row) => {
    setUnlinkTarget(row);
    setPassword('');
  }, []);

  const closeUnlinkDialog = useCallback(() => {
    setUnlinkTarget(null);
    setPassword('');
  }, []);

  const requiresPassword = !!data?.unlinkRequiresPassword;

  const handleUnlink = useCallback(async () => {
    if (!unlinkTarget) return;

    if (requiresPassword && !password) {
      toast.error('请输入当前密码');
      return;
    }

    setSubmitting(true);
    try {
      await authApi.unlinkOAuthAccount(
        unlinkTarget.provider,
        requiresPassword ? password : undefined
      );
      toast.success(`已解除 ${unlinkTarget.displayName} 关联`);
      closeUnlinkDialog();
      await Promise.all([fetchAccounts(), refreshUser()]);
    } catch (error) {
      console.error('解除关联失败:', error);
      toast.error(error.message || '解除关联失败');
    } finally {
      setSubmitting(false);
    }
  }, [
    unlinkTarget,
    requiresPassword,
    password,
    closeUnlinkDialog,
    fetchAccounts,
    refreshUser,
  ]);

  return {
    user,
    rows,
    loading,
    loginMethods: data?.loginMethods,
    // 解绑会锁死账号时给出引导文案
    canUnlink: !!data?.canUnlink,
    requiresPassword,
    linkingProvider,
    handleLink,
    unlinkTarget,
    openUnlinkDialog,
    closeUnlinkDialog,
    password,
    setPassword,
    submitting,
    handleUnlink,
    refresh: fetchAccounts,
  };
}
