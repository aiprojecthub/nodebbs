'use client';

import { useState, useEffect } from 'react';
import { useDebounce } from '@uidotdev/usehooks';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/common/DataTable';
import UserAvatar from '@/components/forum/UserAvatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/common/AlertDialog';
import { FormDialog } from '@/components/common/FormDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Ban, ShieldCheck, UserCog, Trash2, MoreHorizontal, UserPlus, Pencil } from 'lucide-react';
import { userApi, moderationApi } from '@/lib/api';
import { toast } from 'sonner';
import Time from '@/components/forum/Time';

export default function UsersManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [showUnbanDialog, setShowUnbanDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteType, setDeleteType] = useState('soft'); // 'soft' or 'hard'
  const [newRole, setNewRole] = useState('user');
  const [submitting, setSubmitting] = useState(false);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('create'); // 'create' or 'edit'
  const [userForm, setUserForm] = useState({
    username: '',
    email: '',
    password: '',
    name: '',
    role: 'user',
    isEmailVerified: false
  });
  const limit = 20;

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

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (debouncedSearch) params.search = debouncedSearch;
      if (roleFilter !== 'all') params.role = roleFilter;
      if (statusFilter === 'banned') params.isBanned = true;
      if (statusFilter === 'active') params.isBanned = false;
      if (statusFilter === 'deleted') params.includeDeleted = true;
      
      // 如果要查看已删除用户，需要包含已删除的
      if (statusFilter === 'deleted') {
        params.includeDeleted = true;
      }

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

  const handleSearch = () => {
    setPage(1);
    fetchUsers();
  };

  const handleBan = async () => {
    setSubmitting(true);
    try {
      await moderationApi.banUser(selectedUser.id);
      toast.success(`已封禁用户 ${selectedUser.username}`);
      setShowBanDialog(false);
      fetchUsers();
    } catch (err) {
      console.error('封禁失败:', err);
      toast.error('封禁失败：' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnban = async () => {
    setSubmitting(true);
    try {
      await moderationApi.unbanUser(selectedUser.id);
      toast.success(`已解封用户 ${selectedUser.username}`);
      setShowUnbanDialog(false);
      fetchUsers();
    } catch (err) {
      console.error('解封失败:', err);
      toast.error('解封失败：' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangeRole = async () => {
    setSubmitting(true);
    try {
      await moderationApi.changeUserRole(selectedUser.id, newRole);
      toast.success(`已将 ${selectedUser.username} 的角色更改为 ${getRoleLabel(newRole)}`);
      setShowRoleDialog(false);
      fetchUsers();
    } catch (err) {
      console.error('修改角色失败:', err);
      toast.error('修改角色失败：' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openBanDialog = (user) => {
    setSelectedUser(user);
    setShowBanDialog(true);
  };

  const openUnbanDialog = (user) => {
    setSelectedUser(user);
    setShowUnbanDialog(true);
  };

  const openRoleDialog = (user) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setShowRoleDialog(true);
  };

  const openDeleteDialog = (user, type) => {
    setSelectedUser(user);
    setDeleteType(type);
    setShowDeleteDialog(true);
  };

  const openCreateDialog = () => {
    setDialogMode('create');
    setUserForm({
      username: '',
      email: '',
      password: '',
      name: '',
      role: 'user',
      isEmailVerified: false
    });
    setShowUserDialog(true);
  };

  const openEditDialog = (user) => {
    setDialogMode('edit');
    setSelectedUser(user);
    setUserForm({
      username: user.username,
      email: user.email,
      password: '', // 编辑时不需要密码
      name: user.name || '',
      role: user.role,
      isEmailVerified: user.isEmailVerified || false
    });
    setShowUserDialog(true);
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      const permanent = deleteType === 'hard';
      await userApi.deleteUser(selectedUser.id, permanent);
      toast.success(permanent ? `已彻底删除用户 ${selectedUser.username}` : `已软删除用户 ${selectedUser.username}`);
      setShowDeleteDialog(false);
      fetchUsers();
    } catch (err) {
      console.error('删除失败:', err);
      toast.error('删除失败：' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitUser = async () => {
    // 验证表单
    if (!userForm.username || !userForm.email) {
      toast.error('请填写所有必填字段');
      return;
    }

    // 创建模式下，密码是必填的
    if (dialogMode === 'create' && !userForm.password) {
      toast.error('请填写密码');
      return;
    }

    if (dialogMode === 'create' && userForm.password.length < 6) {
      toast.error('密码至少需要 6 个字符');
      return;
    }

    setSubmitting(true);
    try {
      if (dialogMode === 'create') {
        // 创建用户
        await userApi.createUser(userForm);
        toast.success(`用户 ${userForm.username} 创建成功`);
      } else {
        // 编辑用户 - 不传递密码字段
        const { password, ...updateData } = userForm;
        await userApi.updateUser(selectedUser.id, updateData);
        toast.success(`用户 ${userForm.username} 更新成功`);
      }

      setShowUserDialog(false);
      // 重置表单
      setUserForm({
        username: '',
        email: '',
        password: '',
        name: '',
        role: 'user',
        isEmailVerified: false
      });
      fetchUsers();
    } catch (err) {
      console.error(`${dialogMode === 'create' ? '创建' : '更新'}用户失败:`, err);
      toast.error(`${dialogMode === 'create' ? '创建' : '更新'}用户失败：` + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // 检查是否可以修改该用户
  const canModifyUser = (user) => {
    return !!user.canManage;
  };

  const getRoleLabel = (role) => {
    const labels = {
      user: '用户',
      vip: 'VIP',
      moderator: '版主',
      admin: '管理员',
    };
    return labels[role] || role;
  };

  const getRoleBadgeVariant = (role) => {
    const variants = {
      admin: 'destructive',
      moderator: 'default',
      vip: 'secondary',
      user: 'secondary',
    };
    return variants[role] || 'secondary';
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold mb-2">用户管理</h2>
          <p className="text-sm text-muted-foreground">
            管理用户账号、角色和权限
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <UserPlus className="h-4 w-4 mr-2" />
          创建用户
        </Button>
      </div>

      {/* Users table */}
      <DataTable
        columns={[
          {
            key: 'user',
            label: '用户',
            render: (_, user) => (
              <div className="flex items-center gap-3">
                <UserAvatar url={user.avatar} name={user.username} size="sm" />
                <div>
                  <div className="font-medium text-sm">{user.username}</div>
                  {user.name && (
                    <div className="text-xs text-muted-foreground">{user.name}</div>
                  )}
                </div>
              </div>
            ),
          },
          {
            key: 'email',
            label: '邮箱',
            width: 'w-[200px]',
            render: (value) => (
              <span className="text-sm text-muted-foreground">{value}</span>
            ),
          },
          {
            key: 'role',
            label: '角色',
            width: 'w-[100px]',
            render: (value, user) => (
              <div className="flex items-center gap-2">
                <Badge variant={getRoleBadgeVariant(value)} className="text-xs">
                  {getRoleLabel(value)}
                </Badge>
                {user.isFounder && (
                  <Badge variant="outline" className="text-xs">
                    创始人
                  </Badge>
                )}
              </div>
            ),
          },
          {
            key: 'status',
            label: '状态',
            width: 'w-[100px]',
            render: (_, user) => {
              if (user.isDeleted) {
                return (
                  <Badge variant="destructive" className="text-xs">
                    已删除
                  </Badge>
                );
              }
              if (user.isBanned) {
                return (
                  <Badge variant="destructive" className="text-xs">
                    已封禁
                  </Badge>
                );
              }
              return (
                <Badge variant="outline" className="text-xs">
                  正常
                </Badge>
              );
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
            width: 'w-[80px]',
            align: 'right',
            sticky: 'right',
            render: (_, user) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => openEditDialog(user)}
                    disabled={!canModifyUser(user)}
                  >
                    <Pencil className="h-4 w-4" />
                    编辑用户
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => openRoleDialog(user)}
                    disabled={!canModifyUser(user)}
                  >
                    <UserCog className="h-4 w-4" />
                    修改角色
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {user.isBanned ? (
                    <DropdownMenuItem
                      onClick={() => openUnbanDialog(user)}
                      className="text-green-600"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      解封用户
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onClick={() => openBanDialog(user)}
                      disabled={!canModifyUser(user)}
                      className="text-orange-600"
                    >
                      <Ban className="h-4 w-4" />
                      封禁用户
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => openDeleteDialog(user, 'soft')}
                    disabled={!canModifyUser(user)}
                    className="text-orange-600"
                  >
                    <Trash2 className="h-4 w-4" />
                    软删除
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => openDeleteDialog(user, 'hard')}
                    disabled={!canModifyUser(user)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    彻底删除
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ),
          },
        ]}
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
            { value: 'user-all', label: '用户' },
            { value: 'vip-all', label: 'VIP' },
            { value: 'moderator-all', label: '版主' },
            { value: 'admin-all', label: '管理员' },
            { value: 'all-active', label: '正常用户' },
            { value: 'all-banned', label: '已封禁' },
            { value: 'all-deleted', label: '已删除' },
          ],
        }}
        pagination={{
          page,
          total,
          limit,
          onPageChange: setPage,
        }}
        emptyMessage="暂无用户"
      />

      {/* 封禁确认对话框 */}
      <ConfirmDialog
        open={showBanDialog}
        onOpenChange={setShowBanDialog}
        title="确认封禁用户？"
        description={
            <>
              确定要封禁用户 "{selectedUser?.username}" 吗？
              <br />
              封禁后该用户将无法登录和发布内容。
              {selectedUser?.role === 'admin' && (
                <>
                  <br />
                  <span className="text-destructive font-medium">
                    注意：该用户是管理员，只有第一个管理员（创始人）可以封禁其他管理员。
                  </span>
                </>
              )}
            </>
        }
        confirmText="确认封禁"
        variant="destructive"
        onConfirm={handleBan}
        loading={submitting}
      />

      {/* 解封确认对话框 */}
      <ConfirmDialog
        open={showUnbanDialog}
        onOpenChange={setShowUnbanDialog}
        title="确认解封用户？"
        description={
            <>
              确定要解封用户 "{selectedUser?.username}" 吗？
              <br />
              解封后该用户将恢复正常使用权限。
            </>
        }
        confirmText="确认解封"
        onConfirm={handleUnban}
        loading={submitting}
      />

      {/* 修改角色对话框 - using FormDialog because it has inputs */}
      <FormDialog
         open={showRoleDialog}
         onOpenChange={setShowRoleDialog}
         title="修改用户角色"
         description={
            <>
              为用户 "{selectedUser?.username}" 设置新角色
              {selectedUser?.role === 'admin' && (
                <>
                  <br />
                  <span className="text-amber-600 font-medium">
                    注意：该用户是管理员，只有第一个管理员（创始人）可以修改其他管理员的角色。
                  </span>
                </>
              )}
            </>
         }
         submitText="确认修改"
         onSubmit={handleChangeRole}
         loading={submitting}
         // FormDialog internally wraps children in a div but we can pass Select directly
      >
          <div className="py-4">
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">用户</SelectItem>
                <SelectItem value="vip">VIP</SelectItem>
                <SelectItem value="moderator">版主</SelectItem>
                <SelectItem value="admin">管理员</SelectItem>
              </SelectContent>
            </Select>
          </div>
      </FormDialog>

      {/* 删除确认对话框 */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title={deleteType === 'hard' ? '确认彻底删除用户？' : '确认软删除用户？'}
        description={
             deleteType === 'hard' ? (
                <>
                  此操作将
                  <span className="font-semibold text-destructive">
                    彻底删除
                  </span>
                  用户 "{selectedUser?.username}"，包括所有相关数据（话题、回复、点赞等）。
                  <br />
                  <span className="font-semibold text-destructive">此操作不可恢复！</span>
                </>
              ) : (
                <>
                  此操作将软删除用户 "{selectedUser?.username}"。
                  <br />
                  软删除后用户将无法登录，但数据仍保留在数据库中。
                </>
              )
        }
        confirmText="确认删除"
        variant={deleteType === 'hard' ? 'destructive' : 'default'}
        onConfirm={handleDelete}
        loading={submitting}
      />

      {/* 创建/编辑用户对话框 */}
      <FormDialog
          open={showUserDialog}
          onOpenChange={setShowUserDialog}
          title={dialogMode === 'create' ? '创建新用户' : '编辑用户'}
          description={dialogMode === 'create'
            ? '填写用户信息以创建新账号'
            : '修改用户信息'}
          submitText={dialogMode === 'create' ? '创建用户' : '保存修改'}
          onSubmit={handleSubmitUser}
          loading={submitting}
          maxWidth="sm:max-w-[500px]"
      >
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="username">
                用户名 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="username"
                placeholder="输入用户名"
                value={userForm.username}
                onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">
                邮箱 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="输入邮箱地址"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                disabled={submitting}
              />
            </div>
            {dialogMode === 'create' && (
              <div className="space-y-2">
                <Label htmlFor="password">
                  密码 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="至少 6 个字符"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  disabled={submitting}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">显示名称</Label>
              <Input
                id="name"
                placeholder="输入显示名称（可选）"
                value={userForm.name}
                onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">角色</Label>
              <Select
                value={userForm.role}
                onValueChange={(value) => setUserForm({ ...userForm, role: value })}
                disabled={submitting}
              >
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">用户</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                  <SelectItem value="moderator">版主</SelectItem>
                  <SelectItem value="admin">管理员</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isEmailVerified"
                checked={userForm.isEmailVerified}
                onCheckedChange={(checked) =>
                  setUserForm({ ...userForm, isEmailVerified: checked })
                }
                disabled={submitting}
              />
              <Label
                htmlFor="isEmailVerified"
                className="text-sm font-normal cursor-pointer"
              >
                邮箱已验证（跳过邮箱验证流程）
              </Label>
            </div>
          </div>
      </FormDialog>
    </div>
  );
}
