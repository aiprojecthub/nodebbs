'use client';

import { useState } from 'react';
import { FormDialog } from '@/components/common/FormDialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { MultiRoleSelect } from './MultiRoleSelect';
import { userApi } from '@/lib/api';
import { toast } from 'sonner';

function buildUserRoles(roleIds, availableRoles) {
  return roleIds
    .map(id => {
      const role = availableRoles.find(r => r.id === id);
      return role
        ? { id: role.id, slug: role.slug, name: role.name, color: role.color, icon: role.icon, priority: role.priority }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));
}

const INITIAL_FORM = {
  username: '',
  email: '',
  password: '',
  name: '',
  roleIds: [],
  isEmailVerified: false,
};

export function UserFormDialog({
  open,
  onOpenChange,
  mode = 'create',
  user = null,
  availableRoles = [],
  onCreated,
  onUpdated,
}) {
  const isCreate = mode === 'create';
  // 组件挂载时直接初始化表单（因为使用条件渲染，每次打开都是新实例）
  const [form, setForm] = useState(() =>
    isCreate
      ? INITIAL_FORM
      : {
          username: user?.username || '',
          email: user?.email || '',
          password: '',
          name: user?.name || '',
          roleIds: user?.userRoles?.map(r => r.id) || [],
          isEmailVerified: user?.isEmailVerified || false,
        }
  );
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.username || !form.email) {
      toast.error('请填写所有必填字段');
      return;
    }
    if (isCreate && !form.password) {
      toast.error('请填写密码');
      return;
    }
    if (isCreate && form.password.length < 6) {
      toast.error('密码至少需要 6 个字符');
      return;
    }

    setSubmitting(true);
    try {
      if (isCreate) {
        const { roleIds, ...createData } = form;
        const newUser = await userApi.createUser(createData);
        if (roleIds.length > 0) {
          await userApi.updateUserRoles(newUser.id, roleIds);
        }
        toast.success(`用户 ${form.username} 创建成功`);
        onCreated?.();
      } else {
        const { password, roleIds, ...updateData } = form;
        await userApi.updateUser(user.id, updateData);
        await userApi.updateUserRoles(user.id, roleIds);
        toast.success(`用户 ${form.username} 更新成功`);
        onUpdated?.(user.id, updateData, buildUserRoles(roleIds, availableRoles));
      }
      onOpenChange(false);
    } catch (err) {
      console.error(`${isCreate ? '创建' : '更新'}用户失败:`, err);
      toast.error(err.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isCreate ? '创建新用户' : '编辑用户'}
      description={isCreate ? '填写用户信息以创建新账号' : '修改用户信息'}
      submitText={isCreate ? '创建用户' : '保存修改'}
      onSubmit={handleSubmit}
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
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
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
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            disabled={submitting}
          />
        </div>
        {isCreate && (
          <div className="space-y-2">
            <Label htmlFor="password">
              密码 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="至少 6 个字符"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              disabled={submitting}
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="name">显示名称</Label>
          <Input
            id="name"
            placeholder="输入显示名称（可选）"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            disabled={submitting}
          />
        </div>
        <div className="space-y-2">
          <Label>角色</Label>
          <MultiRoleSelect
            value={form.roleIds}
            onChange={(roleIds) => setForm({ ...form, roleIds })}
            disabled={submitting}
            placeholder="选择角色（可选）"
            roles={availableRoles}
          />
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="isEmailVerified"
            checked={form.isEmailVerified}
            onCheckedChange={(checked) => setForm({ ...form, isEmailVerified: checked })}
            disabled={submitting}
          />
          <Label htmlFor="isEmailVerified" className="text-sm font-normal cursor-pointer">
            邮箱已验证（跳过邮箱验证流程）
          </Label>
        </div>
      </div>
    </FormDialog>
  );
}
