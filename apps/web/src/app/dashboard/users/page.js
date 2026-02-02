'use client';

import { useState, useEffect } from 'react';
import { useDebounce } from '@uidotdev/usehooks';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/common/DataTable';
import { ActionMenu } from '@/components/common/ActionMenu';
import { PageHeader } from '@/components/common/PageHeader';
import UserAvatar from '@/components/user/UserAvatar';
import { confirm } from '@/components/common/ConfirmPopover';
import { Ban, ShieldCheck, UserCog, Trash2, UserPlus, Pencil, CheckCircle2, XCircle } from 'lucide-react';
import { userApi, moderationApi, rbacApi } from '@/lib/api';
import { toast } from 'sonner';
import Time from '@/components/common/Time';
import { UserRoleBadges } from './components/UserRoleBadges';
import { UserFormDialog } from './components/UserFormDialog';
import { RoleEditDialog } from './components/RoleEditDialog';
import { BanUserDialog } from './components/BanUserDialog';
import { usePermission } from '@/hooks/usePermission';

export default function UsersManagement() {
  const { hasPermission, isAdmin } = usePermission();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [submitting, setSubmitting] = useState(false);

  // 对话框状态
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('create');
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showBanDialog, setShowBanDialog] = useState(false);

  // 动态角色数据
  const [availableRoles, setAvailableRoles] = useState([]);

  const limit = 20;

  useEffect(() => {
    fetchAvailableRoles();
  }, []);

  useEffect(() => {
    if (page === 1) {
      fetchUsers();
    } else {
      setPage(1);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter, statusFilter]);

  const fetchAvailableRoles = async () => {
    try {
      const roles = await rbacApi.admin.getRoles();
      setAvailableRoles(roles);
    } catch (err) {
      console.error('获取角色列表失败:', err);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (debouncedSearch) params.search = debouncedSearch;
      if (roleFilter !== 'all') params.role = roleFilter;
      if (statusFilter === 'banned') params.isBanned = true;
      if (statusFilter === 'active') params.isBanned = false;
      if (statusFilter === 'deleted') params.includeDeleted = true;

      const data = await userApi.getList(params);
      setUsers(data.items);
      setTotal(data.total);
    } catch (err) {
      console.error('获取用户列表失败:', err);
      toast.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  // ---- 对话框操作 ----

  const openCreateDialog = () => {
    setDialogMode('create');
    setSelectedUser(null);
    setShowUserDialog(true);
  };

  const openEditDialog = (user) => {
    setDialogMode('edit');
    setSelectedUser(user);
    setShowUserDialog(true);
  };

  const openRoleDialog = (user) => {
    setSelectedUser(user);
    setShowRoleDialog(true);
  };

  const openBanDialog = (user) => {
    setSelectedUser(user);
    setShowBanDialog(true);
  };

  // ---- 行内操作 ----

  const handleUnbanClick = async (e, user) => {
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
      setUsers(prev => prev.map(u =>
        u.id === user.id ? { ...u, isBanned: false } : u
      ));
    } catch (err) {
      console.error('解封失败:', err);
      toast.error('解封失败：' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = async (e, user, type) => {
    const isHard = type === 'hard';
    const confirmed = await confirm(e, {
      title: isHard ? '确认彻底删除用户？' : '确认删除用户？',
      description: isHard ? (
        <>
          此操作将
          <span className="font-semibold text-destructive"> 彻底删除 </span>
          用户 &quot;{user.username}&quot;，包括所有相关数据（话题、回复、点赞等）。
          <br />
          <span className="font-semibold text-destructive">此操作不可恢复！</span>
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
      toast.success(isHard ? `已彻底删除用户 ${user.username}` : `已逻辑删除用户 ${user.username}`);
      if (isHard) {
        setUsers(prev => prev.filter(u => u.id !== user.id));
        setTotal(prev => prev - 1);
      } else {
        setUsers(prev => prev.map(u =>
          u.id === user.id ? { ...u, isDeleted: true } : u
        ));
      }
    } catch (err) {
      console.error('删除失败:', err);
      toast.error('删除失败：' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ---- 回调 ----

  const handleUserCreated = () => fetchUsers();

  const handleUserUpdated = (userId, updateData, updatedRoles) => {
    setUsers(prev => prev.map(u =>
      u.id === userId ? { ...u, ...updateData, userRoles: updatedRoles } : u
    ));
  };

  const handleRolesUpdated = (userId, updatedRoles) => {
    setUsers(prev => prev.map(u =>
      u.id === userId ? { ...u, userRoles: updatedRoles } : u
    ));
  };

  const handleBanned = (userId) => {
    setUsers(prev => prev.map(u =>
      u.id === userId ? { ...u, isBanned: true } : u
    ));
  };

  const canModifyUser = (user) => !!user.canManage;

  // ---- 表格列 ----

  const columns = [
    {
      key: 'user',
      label: '用户',
      render: (_, user) => (
        <div className="flex items-center gap-3">
          <UserAvatar url={user.avatar} name={user.username} size="sm" />
          <div>
            <div className="font-medium text-sm">{user.username}</div>
            {user.name && <div className="text-xs text-muted-foreground">{user.name}</div>}
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      label: '邮箱',
      width: 'w-[200px]',
      render: (value, user) => (
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-muted-foreground">{value}</span>
          {user.isEmailVerified ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" aria-label="已验证" />
          ) : (
            <XCircle className="h-3.5 w-3.5 text-muted-foreground/50" aria-label="未验证" />
          )}
        </div>
      ),
    },
    {
      key: 'oauth',
      label: '关联账号',
      render: (_, user) => (
        <div className="flex gap-1 flex-wrap">
          {user.oauthProviders?.length > 0 ? (
            user.oauthProviders.map((provider) => (
              <Badge key={provider} variant="secondary" className="text-[10px] px-1 h-5 capitalize">
                {provider}
              </Badge>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </div>
      ),
    },
    {
      key: 'role',
      label: '角色',
      width: 'w-[180px]',
      render: (_, user) => <UserRoleBadges user={user} />,
    },
    {
      key: 'status',
      label: '状态',
      width: 'w-[100px]',
      render: (_, user) => {
        if (user.isDeleted) return <Badge variant="destructive" className="text-xs">已删除</Badge>;
        if (user.isBanned) return <Badge variant="destructive" className="text-xs">已封禁</Badge>;
        return <Badge variant="outline" className="text-xs">正常</Badge>;
      },
    },
    {
      key: 'createdAt',
      label: '注册时间',
      width: 'w-[120px]',
      render: (value) => (
        <span className="text-xs text-muted-foreground">
          <Time date={value} />
        </span>
      ),
    },
    {
      key: 'actions',
      label: '操作',
      align: 'right',
      sticky: 'right',
      render: (_, user) => (
        <ActionMenu
          items={[
            { label: '编辑用户', icon: Pencil, onClick: () => openEditDialog(user), disabled: !canModifyUser(user), hidden: !hasPermission('user.update') },
            { label: '修改角色', icon: UserCog, onClick: () => openRoleDialog(user), disabled: !canModifyUser(user), hidden: !hasPermission('user.update') },
            { separator: true },
            { label: '解封用户', icon: ShieldCheck, onClick: (e) => handleUnbanClick(e, user), hidden: !user.isBanned || !hasPermission('dashboard.users') },
            { label: '封禁用户', icon: Ban, variant: 'warning', onClick: () => openBanDialog(user), disabled: !canModifyUser(user), hidden: user.isBanned || !hasPermission('dashboard.users') },
            { separator: true, hidden: !hasPermission('user.delete') },
            { label: '删除', icon: Trash2, variant: 'warning', onClick: (e) => handleDeleteClick(e, user, 'soft'), disabled: !canModifyUser(user), hidden: !hasPermission('user.delete') },
            { label: '彻底删除', icon: Trash2, variant: 'destructive', onClick: (e) => handleDeleteClick(e, user, 'hard'), disabled: !canModifyUser(user), hidden: !isAdmin },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="用户管理"
        description="管理用户账号、角色和权限"
        actions={
          <Button onClick={openCreateDialog}>
            <UserPlus className="h-4 w-4" />
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
          value: `${roleFilter}-${statusFilter}`,
          onChange: (value) => {
            const [role, status] = value.split('-');
            setRoleFilter(role);
            setStatusFilter(status);
          },
          options: [
            { value: 'all-all', label: '全部' },
            { value: 'user-all', label: '普通用户' },
            { value: 'admin-all', label: '管理员' },
            { value: 'all-active', label: '正常用户' },
            { value: 'all-banned', label: '已封禁' },
            { value: 'all-deleted', label: '已删除' },
          ],
        }}
        pagination={{ page, total, limit, onPageChange: setPage }}
        emptyMessage="暂无用户"
      />

      {/* 创建/编辑用户 */}
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

      {/* 修改角色 */}
      {showRoleDialog && selectedUser && (
        <RoleEditDialog
          open={showRoleDialog}
          onOpenChange={setShowRoleDialog}
          user={selectedUser}
          availableRoles={availableRoles}
          onUpdated={handleRolesUpdated}
        />
      )}

      {/* 封禁用户 */}
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
