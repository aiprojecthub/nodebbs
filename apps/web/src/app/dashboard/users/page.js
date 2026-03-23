'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/common/DataTable';
import { ActionMenu } from '@/components/common/ActionMenu';
import { PageHeader } from '@/components/common/PageHeader';
import UserAvatar from '@/components/user/UserAvatar';
import { Ban, ShieldCheck, UserCog, Trash2, UserPlus, Pencil, CheckCircle2, XCircle, RotateCcw, UserX } from 'lucide-react';
import Time from '@/components/common/Time';
import { UserRoleBadges } from './components/UserRoleBadges';
import { UserFormDialog } from './components/UserFormDialog';
import { RoleEditDialog } from './components/RoleEditDialog';
import { BanUserDialog } from './components/BanUserDialog';
import { usePermission } from '@/hooks/usePermission';
import { useSettings } from '@/contexts/SettingsContext';
import { useUserManagement } from '@/hooks/dashboard/useUserManagement';

export default function UsersManagement() {
  const { hasPermission, hasCondition } = usePermission();
  const { settings } = useSettings();
  const {
    items: users,
    loading,
    search,
    setSearch,
    filters,
    setFilter,
    page,
    total,
    limit,
    setPage,
    // 角色
    availableRoles,
    // 对话框
    selectedUser,
    showUserDialog,
    setShowUserDialog,
    dialogMode,
    showRoleDialog,
    setShowRoleDialog,
    showBanDialog,
    setShowBanDialog,
    // 操作
    openCreateDialog,
    openEditDialog,
    openRoleDialog,
    openBanDialog,
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
  } = useUserManagement();

  const columns = [
    {
      key: 'user',
      label: '用户',
      render: (_, user) => (
        <div className='flex items-center gap-3'>
          <UserAvatar url={user.avatar} name={user.name || user.username} size='sm' />
          <div>
            <div className='font-medium text-sm'>{user.username}</div>
            {user.name && <div className='text-xs text-muted-foreground'>{user.name}</div>}
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      label: '邮箱',
      width: 'w-50',
      render: (value, user) => (
        <div className='flex items-center gap-1.5'>
          <span className='text-sm text-muted-foreground'>{value}</span>
          {user.isEmailVerified ? (
            <CheckCircle2 className='h-3.5 w-3.5 text-green-500' aria-label='已验证' />
          ) : (
            <XCircle className='h-3.5 w-3.5 text-muted-foreground/50' aria-label='未验证' />
          )}
        </div>
      ),
    },
    {
      key: 'oauth',
      label: '关联账号',
      render: (_, user) => (
        <div className='flex gap-1 flex-wrap'>
          {user.oauthProviders?.length > 0 ? (
            user.oauthProviders.map((provider) => (
              <Badge key={provider} variant='secondary' className='text-[10px] px-1 h-5 capitalize'>
                {provider}
              </Badge>
            ))
          ) : (
            <span className='text-xs text-muted-foreground'>-</span>
          )}
        </div>
      ),
    },
    {
      key: 'role',
      label: '角色',
      width: 'w-45',
      render: (_, user) => <UserRoleBadges user={user} />,
    },
    {
      key: 'status',
      label: '状态',
      width: 'w-25',
      render: (_, user) => {
        if (user.isDeleted && user.username?.startsWith('~deleted_')) {
          return <Badge variant='secondary' className='text-xs'>已注销</Badge>;
        }
        if (user.isDeleted && user.deletionRequestedAt) {
          const requestedAt = new Date(user.deletionRequestedAt).getTime();
          const cooldownMs = (settings.account_deletion_cooldown_days?.value || 30) * 24 * 60 * 60 * 1000;
          const expiresAt = requestedAt + cooldownMs;
          const daysRemaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / (24 * 60 * 60 * 1000)));
          return (
            <Badge variant='destructive' className='text-xs'>
              待注销 ({daysRemaining}天)
            </Badge>
          );
        }
        if (user.isDeleted) return <Badge variant='destructive' className='text-xs'>已删除</Badge>;
        if (user.isBanned) return <Badge variant='destructive' className='text-xs'>已封禁</Badge>;
        return <Badge variant='outline' className='text-xs'>正常</Badge>;
      },
    },
    {
      key: 'createdAt',
      label: '注册时间',
      width: 'w-30',
      render: (value) => (
        <span className='text-xs text-muted-foreground'>
          <Time date={value} />
        </span>
      ),
    },
    {
      key: 'lastSeenAt',
      label: '最后活跃',
      width: 'w-30',
      render: (value) => value ? (
        <span className='text-xs text-muted-foreground'>
          <Time date={value} fromNow />
        </span>
      ) : (
        <span className='text-xs text-muted-foreground'>-</span>
      ),
    },
    {
      key: 'ip',
      label: 'IP',
      width: 'w-30',
      render: (_, user) => (
        <div className='text-xs text-muted-foreground space-y-0.5'>
          {user.lastLoginIp && <div title='最近登录 IP'>{user.lastLoginIp}</div>}
          {user.registrationIp && user.registrationIp !== user.lastLoginIp && (
            <div className='text-muted-foreground/50' title='注册 IP'>{user.registrationIp}</div>
          )}
          {!user.lastLoginIp && !user.registrationIp && <span>-</span>}
        </div>
      ),
    },
    {
      key: 'actions',
      label: '操作',
      align: 'right',
      sticky: 'right',
      render: (_, user) => {
        const isAnonymized = user.isDeleted && user.username?.startsWith('~deleted_');
        return (
          <ActionMenu
            items={[
              { label: '编辑用户', icon: Pencil, onClick: () => openEditDialog(user), disabled: !canModifyUser(user), hidden: !hasPermission('user.update') },
              { label: '修改角色', icon: UserCog, onClick: () => openRoleDialog(user), disabled: !canModifyUser(user), hidden: !hasPermission('user.update') },
              { separator: true },
              { label: '解封用户', icon: ShieldCheck, onClick: (e) => handleUnbanClick(e, user), hidden: !user.isBanned || !hasPermission('dashboard.users') },
              { label: '封禁用户', icon: Ban, variant: 'warning', onClick: () => openBanDialog(user), disabled: !canModifyUser(user), hidden: user.isBanned || !hasPermission('dashboard.users') },
              { label: '恢复账号', icon: RotateCcw, onClick: (e) => handleRestoreClick(e, user), hidden: !(user.isDeleted && user.deletionRequestedAt) || isAnonymized || !hasPermission('dashboard.users') },
              { label: '匿名化', icon: UserX, variant: 'destructive', onClick: (e) => handleAnonymizeClick(e, user), hidden: !user.isDeleted || isAnonymized || !hasPermission('dashboard.users') },
              { separator: true, hidden: !hasPermission('user.delete') },
              { label: '删除', icon: Trash2, variant: 'warning', onClick: (e) => handleDeleteClick(e, user, 'soft'), disabled: !canModifyUser(user), hidden: !hasPermission('user.delete') },
              { label: '彻底删除', icon: Trash2, variant: 'destructive', onClick: (e) => handleDeleteClick(e, user, 'hard'), disabled: !canModifyUser(user), hidden: !hasCondition('dashboard.users', 'allowPermanent') },
            ]}
          />
        );
      },
    },
  ];

  return (
    <div className='space-y-6'>
      <PageHeader
        title='用户管理'
        description='管理用户账号、角色和权限'
        actions={
          <Button onClick={openCreateDialog}>
            <UserPlus className='h-4 w-4' />
            创建用户
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        search={{
          value: search,
          onChange: (value) => setSearch(value),
          placeholder: '搜索用户名、邮箱或姓名...',
        }}
        filter={{
          value: filters.statusFilter,
          onChange: (value) => setFilter('statusFilter', value),
          options: [
            { value: 'all', label: '全部' },
            { value: 'banned', label: '已封禁' },
            { value: 'deleted', label: '已删除' },
            { value: 'pending_deletion', label: '待注销' },
          ],
        }}
        pagination={{ page, total, limit, onPageChange: setPage }}
        emptyMessage='暂无用户'
      />

      {showUserDialog && (
        <UserFormDialog
          open={showUserDialog}
          onOpenChange={setShowUserDialog}
          mode={dialogMode}
          user={selectedUser}
          availableRoles={availableRoles}
          onCreated={handleUserCreated}
          onUpdated={handleUserUpdated}
        />
      )}

      {showRoleDialog && selectedUser && (
        <RoleEditDialog
          open={showRoleDialog}
          onOpenChange={setShowRoleDialog}
          user={selectedUser}
          availableRoles={availableRoles}
          onUpdated={handleRolesUpdated}
        />
      )}

      {showBanDialog && selectedUser && (
        <BanUserDialog
          open={showBanDialog}
          onOpenChange={setShowBanDialog}
          user={selectedUser}
          onBanned={handleBanned}
        />
      )}
    </div>
  );
}
