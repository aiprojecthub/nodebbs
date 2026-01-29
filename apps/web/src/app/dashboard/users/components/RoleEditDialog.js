'use client';

import { useState } from 'react';
import { FormDialog } from '@/components/common/FormDialog';
import { Label } from '@/components/ui/label';
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

export function RoleEditDialog({
  open,
  onOpenChange,
  user,
  availableRoles = [],
  onUpdated,
}) {
  // 组件挂载时直接初始化（因为使用条件渲染，每次打开都是新实例）
  const [selectedRoleIds, setSelectedRoleIds] = useState(
    () => user?.userRoles?.map(r => r.id) || []
  );
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await userApi.updateUserRoles(user.id, selectedRoleIds);
      const roleNames = selectedRoleIds
        .map(id => availableRoles.find(r => r.id === id)?.name)
        .filter(Boolean)
        .join(', ');
      toast.success(`已更新 ${user.username} 的角色为：${roleNames || '无角色'}`);
      onUpdated?.(user.id, buildUserRoles(selectedRoleIds, availableRoles));
      onOpenChange(false);
    } catch (err) {
      console.error('修改角色失败:', err);
      toast.error('修改角色失败：' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="修改用户角色"
      description={
        <>
          为用户 &quot;{user?.username}&quot; 分配角色（可多选）
          {user?.userRoles?.some(r => r.slug === 'admin') && (
            <>
              <br />
              <span className="text-amber-600 font-medium">
                注意：该用户是管理员，只有创始人可以修改其他管理员的角色。
              </span>
            </>
          )}
        </>
      }
      submitText="确认修改"
      onSubmit={handleSubmit}
      loading={submitting}
    >
      <div className="py-4">
        <Label className="mb-2 block">选择角色</Label>
        <MultiRoleSelect
          value={selectedRoleIds}
          onChange={setSelectedRoleIds}
          disabled={submitting}
          placeholder="选择要分配的角色..."
          roles={availableRoles}
        />
        <p className="text-xs text-muted-foreground mt-2">
          可以选择多个角色，用户将拥有所有选中角色的权限
        </p>
      </div>
    </FormDialog>
  );
}
