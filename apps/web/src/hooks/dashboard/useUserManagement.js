'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdminList } from './useAdminList';
import { userApi, moderationApi, rbacApi } from '@/lib/api';
import { confirm } from '@/components/common/ConfirmPopover';
import { toast } from 'sonner';

/**
 * 用户管理 Hook
 * 组合 useAdminList，添加用户 CRUD 和管理操作
 */
export function useUserManagement() {
  const list = useAdminList({
    fetchFn: async (params) => {
      const apiParams = {
        page: params.page,
        limit: params.limit,
      };
      if (params.search) apiParams.search = params.search;

      const sf = params.statusFilter;
      if (sf === 'banned') apiParams.isBanned = true;
      if (sf === 'deleted') {
        apiParams.isDeleted = true;
      }
      if (sf === 'pending_deletion') {
        apiParams.pendingDeletion = true;
      }
      delete apiParams.statusFilter;

      return userApi.getList(apiParams);
    },
    pageSize: 20,
    defaultFilters: { statusFilter: 'all' },
  });

  const { updateItem, removeItem, refreshList, filters } = list;

  // ===== 角色数据 =====
  const [availableRoles, setAvailableRoles] = useState([]);

  useEffect(() => {
    rbacApi.admin
      .getRoles()
      .then(setAvailableRoles)
      .catch((err) => console.error('获取角色列表失败:', err));
  }, []);

  // ===== 对话框状态 =====
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('create');
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ===== 对话框操作 =====
  const openCreateDialog = useCallback(() => {
    setDialogMode('create');
    setSelectedUser(null);
    setShowUserDialog(true);
  }, []);

  const openEditDialog = useCallback((user) => {
    setDialogMode('edit');
    setSelectedUser(user);
    setShowUserDialog(true);
  }, []);

  const openRoleDialog = useCallback((user) => {
    setSelectedUser(user);
    setShowRoleDialog(true);
  }, []);

  const openBanDialog = useCallback((user) => {
    setSelectedUser(user);
    setShowBanDialog(true);
  }, []);

  const shouldRemoveBannedUserFromList = useCallback(() => {
    return filters.statusFilter === 'active';
  }, [filters.statusFilter]);

  const shouldRemoveDeletedUserFromList = useCallback(() => {
    return filters.statusFilter !== 'deleted' && filters.statusFilter !== 'pending_deletion';
  }, [filters.statusFilter]);

  // ===== 行内操作 =====
  const handleUnbanClick = useCallback(
    async (e, user) => {
      const confirmed = await confirm(e, {
        title: '确认解封用户？',
        description: (
          <>
            确定要解封用户 &quot;{user.username}&quot; 吗？
            <br />
            解封后该用户将恢复正常使用权限。
          </>
        ),
        confirmText: '确认解封',
      });
      if (!confirmed) return;

      setSubmitting(true);
      try {
        await moderationApi.unbanUser(user.id);
        toast.success(`已解封用户 ${user.username}`);
        // 如果当前筛选为已封禁，则从列表中移除；否则更新状态
        if (filters.statusFilter === 'banned') {
          removeItem(user.id);
        } else {
          updateItem(user.id, { isBanned: false });
        }
      } catch (err) {
        console.error('解封失败:', err);
        toast.error(err.message || '解封失败');
      } finally {
        setSubmitting(false);
      }
    },
    [updateItem, removeItem, filters]
  );

  const handleDeleteClick = useCallback(
    async (e, user, type) => {
      const isHard = type === 'hard';
      const confirmed = await confirm(e, {
        title: isHard ? '确认彻底删除用户？' : '确认删除用户？',
        description: isHard ? (
          <>
            此操作将
            <span className='font-semibold text-destructive'> 彻底删除 </span>
            用户 &quot;{user.username}&quot;，包括所有相关数据（话题、回复、点赞等）。
            <br />
            <span className='font-semibold text-destructive'>此操作不可恢复！</span>
          </>
        ) : (
          <>
            此操作将逻辑删除用户 &quot;{user.username}&quot;。
            <br />
            删除后用户将无法登录，但数据仍保留在数据库中。
          </>
        ),
        confirmText: '确认删除',
        variant: isHard ? 'destructive' : 'default',
      });
      if (!confirmed) return;

      setSubmitting(true);
      try {
        await userApi.deleteUser(user.id, isHard);
        toast.success(
          isHard
            ? `已彻底删除用户 ${user.username}`
            : `已逻辑删除用户 ${user.username}`
        );
        if (isHard) {
          removeItem(user.id);
        } else if (shouldRemoveDeletedUserFromList()) {
          removeItem(user.id);
        } else {
          updateItem(user.id, { isDeleted: true });
        }
      } catch (err) {
        console.error('删除失败:', err);
        toast.error(err.message || '删除失败');
      } finally {
        setSubmitting(false);
      }
    },
    [updateItem, removeItem, shouldRemoveDeletedUserFromList]
  );

  const handleRestoreClick = useCallback(
    async (e, user) => {
      const confirmed = await confirm(e, {
        title: '确认恢复用户？',
        description: (
          <>
            确定要恢复用户 &quot;{user.username}&quot; 的账号吗？
            <br />
            恢复后该用户将可以正常登录使用。
          </>
        ),
        confirmText: '确认恢复',
      });
      if (!confirmed) return;

      setSubmitting(true);
      try {
        await userApi.restoreUser(user.id);
        toast.success(`已恢复用户 ${user.username}`);
        updateItem(user.id, { isDeleted: false, deletionRequestedAt: null });
        // 如果当前筛选为已删除/待注销，则从列表中移除
        if (filters.statusFilter === 'deleted' || filters.statusFilter === 'pending_deletion') {
          removeItem(user.id);
        }
      } catch (err) {
        console.error('恢复失败:', err);
        toast.error(err.message || '恢复失败');
      } finally {
        setSubmitting(false);
      }
    },
    [updateItem, removeItem, filters]
  );

  const handleAnonymizeClick = useCallback(
    async (e, user) => {
      const confirmed = await confirm(e, {
        title: '确认匿名化用户？',
        description: (
          <>
            此操作将
            <span className='font-semibold text-destructive'> 永久清除 </span>
            用户 &quot;{user.username}&quot; 的所有个人信息。
            <br />
            <span className='font-semibold text-destructive'>此操作不可恢复！</span>
          </>
        ),
        confirmText: '确认匿名化',
        variant: 'destructive',
      });
      if (!confirmed) return;

      setSubmitting(true);
      try {
        await userApi.anonymizeUser(user.id);
        toast.success(`已匿名化用户 ${user.username}`);
        refreshList();
      } catch (err) {
        console.error('匿名化失败:', err);
        toast.error(err.message || '匿名化失败');
      } finally {
        setSubmitting(false);
      }
    },
    [refreshList]
  );

  // ===== 回调 =====
  const handleUserCreated = useCallback(() => refreshList(), [refreshList]);

  const handleUserUpdated = useCallback(
    (userId, updateData, updatedRoles) => {
      updateItem(userId, { ...updateData, userRoles: updatedRoles });
    },
    [updateItem]
  );

  const handleRolesUpdated = useCallback(
    (userId, updatedRoles) => {
      updateItem(userId, { userRoles: updatedRoles });
    },
    [updateItem]
  );

  const handleBanned = useCallback(
    (userId) => {
      if (shouldRemoveBannedUserFromList()) {
        removeItem(userId);
        return;
      }

      updateItem(userId, { isBanned: true });
    },
    [updateItem, removeItem, shouldRemoveBannedUserFromList]
  );

  const canModifyUser = useCallback((user) => !!user.canManage, []);

  return {
    ...list,
    // 角色
    availableRoles,
    // 对话框状态
    selectedUser,
    showUserDialog,
    setShowUserDialog,
    dialogMode,
    showRoleDialog,
    setShowRoleDialog,
    showBanDialog,
    setShowBanDialog,
    submitting,
    // 对话框操作
    openCreateDialog,
    openEditDialog,
    openRoleDialog,
    openBanDialog,
    // 行内操作
    handleUnbanClick,
    handleDeleteClick,
    handleRestoreClick,
    handleAnonymizeClick,
    // 回调
    handleUserCreated,
    handleUserUpdated,
    handleRolesUpdated,
    handleBanned,
    canModifyUser,
  };
}
