'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/common/DataTable';
import { ActionMenu } from '@/components/common/ActionMenu';
import { FormDialog } from '@/components/common/FormDialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { confirm } from '@/components/common/ConfirmPopover';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Shield, Pencil, Trash2, Plus, Key, Settings2, GitBranch } from 'lucide-react';
import { rbacApi } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// 频率周期选项
const RATE_LIMIT_PERIODS = [
  { value: 'minute', label: '每分钟' },
  { value: 'hour', label: '每小时' },
  { value: 'day', label: '每天' },
];

// 条件编辑器组件
function ConditionEditor({ conditions, permission, onChange, disabled, hasConfig, conditionTypes = [] }) {
  const [open, setOpen] = useState(false);
  const [localConditions, setLocalConditions] = useState(conditions || {});

  // 当外部 conditions 变化时同步
  useEffect(() => {
    setLocalConditions(conditions || {});
  }, [conditions]);

  const handleSave = () => {
    // 清理空值
    const cleaned = Object.entries(localConditions).reduce((acc, [key, value]) => {
      if (value !== null && value !== undefined && value !== '' && value !== false) {
        if (Array.isArray(value) && value.length === 0) return acc;
        if (key === 'rateLimit') {
          if (value.count && value.period) {
            acc[key] = value;
          }
          return acc;
        }
        if (key === 'timeRange') {
          if (value.start && value.end) {
            acc[key] = value;
          }
          return acc;
        }
        acc[key] = value;
      }
      return acc;
    }, {});

    onChange(Object.keys(cleaned).length > 0 ? cleaned : null);
    setOpen(false);
  };

  const updateCondition = (key, value) => {
    setLocalConditions(prev => ({ ...prev, [key]: value }));
  };

  // 渲染条件输入控件
  const renderConditionInput = (conditionType) => {
    const { key, label, component, description } = conditionType;

    if (component === 'switch') {
      return (
        <div key={key} className="flex items-center justify-between py-2">
          <div className="space-y-0.5">
            <Label className="text-sm">{label}</Label>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <Switch
            checked={localConditions[key] === true}
            onCheckedChange={(checked) => updateCondition(key, checked || undefined)}
          />
        </div>
      );
    }

    if (component === 'number') {
      return (
        <div key={key} className="space-y-1.5 py-2">
          <Label className="text-sm">{label}</Label>
          <Input
            type="number"
            min="0"
            placeholder="不限制"
            value={localConditions[key] || ''}
            onChange={(e) => updateCondition(key, e.target.value ? parseInt(e.target.value) : undefined)}
          />
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      );
    }

    if (component === 'rate') {
      const rateLimit = localConditions[key] || { count: '', period: 'hour' };
      return (
        <div key={key} className="space-y-1.5 py-2">
          <Label className="text-sm">{label}</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              min="1"
              placeholder="次数"
              value={rateLimit.count || ''}
              onChange={(e) => updateCondition(key, {
                ...rateLimit,
                count: e.target.value ? parseInt(e.target.value) : ''
              })}
              className="w-24"
            />
            <Select
              value={rateLimit.period || 'hour'}
              onValueChange={(value) => updateCondition(key, { ...rateLimit, period: value })}
            >
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RATE_LIMIT_PERIODS.map(p => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      );
    }

    if (component === 'time') {
      const timeRange = localConditions[key] || { start: '', end: '' };
      return (
        <div key={key} className="space-y-1.5 py-2">
          <Label className="text-sm">{label}</Label>
          <div className="flex gap-2 items-center">
            <Input
              type="time"
              value={timeRange.start || ''}
              onChange={(e) => updateCondition(key, { ...timeRange, start: e.target.value })}
            />
            <span className="text-muted-foreground">至</span>
            <Input
              type="time"
              value={timeRange.end || ''}
              onChange={(e) => updateCondition(key, { ...timeRange, end: e.target.value })}
            />
          </div>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      );
    }

    if (component === 'tags' || component === 'fields') {
      const isTags = component === 'tags';
      return (
        <div key={key} className="space-y-1.5 py-2">
          <Label className="text-sm">{label}</Label>
          <Input
            placeholder={isTags ? "如: 1,2,3" : "如: *, !passwordHash, !email"}
            defaultValue={localConditions[key]?.join(isTags ? ',' : ', ') || ''}
            onBlur={(e) => {
              const val = e.target.value;
              if (!val) {
                updateCondition(key, undefined);
              } else {
                const items = val.split(',').map(s => s.trim()).filter(Boolean);
                if (isTags) {
                  const parsed = items.map(s => {
                    const num = parseInt(s);
                    return isNaN(num) ? s : num;
                  });
                  updateCondition(key, parsed.length > 0 ? parsed : undefined);
                } else {
                  updateCondition(key, items.length > 0 ? items : undefined);
                }
              }
            }}
            className={isTags ? "" : "font-mono text-xs"}
          />
          <p className="text-xs text-muted-foreground">{description || (isTags ? '多个值用逗号分隔' : '')}</p>
        </div>
      );
    }

    return null;
  };

  return (
    <Drawer direction="right" open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn('w-7 h-7', hasConfig ? 'text-primary' : 'text-muted-foreground/30')}
          disabled={disabled}
        >
          <Settings2 className="h-3.5 w-3.5" />
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md">
          <DrawerHeader>
            <DrawerTitle>条件配置</DrawerTitle>
            <DrawerDescription>
              为 &quot;{permission.name}&quot; 设置生效条件
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4 overflow-y-auto max-h-[calc(100vh-200px)]">
            {conditionTypes.map(renderConditionInput)}
          </div>
          <DrawerFooter>
            <Button onClick={handleSave}>确定</Button>
            <DrawerClose asChild>
              <Button variant="outline">取消</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export function RolesTab() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('create');
  const [selectedRole, setSelectedRole] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // RBAC 配置（从后端获取）
  const [conditionTypes, setConditionTypes] = useState({});
  const [permissionConditions, setPermissionConditions] = useState({});
  const [moduleOptions, setModuleOptions] = useState([]);
  const [commonActions, setCommonActions] = useState([]);
  const [moduleSpecialActions, setModuleSpecialActions] = useState({});

  const actionWeightMap = useMemo(() => {
    const commonWeights = {};
    commonActions.forEach((action, index) => {
      commonWeights[action.value] = index + 1;
    });

    const moduleWeights = {};
    const offset = commonActions.length + 1;
    Object.entries(moduleSpecialActions).forEach(([module, actions]) => {
      moduleWeights[module] = {};
      actions.forEach((action, index) => {
        moduleWeights[module][action.value] = offset + index;
      });
    });

    return { common: commonWeights, modules: moduleWeights };
  }, [commonActions, moduleSpecialActions]);

  const [roleForm, setRoleForm] = useState({
    slug: '',
    name: '',
    description: '',
    color: '#000000',
    icon: '',
    parentId: null,
    isDefault: false,
    isDisplayed: true,
    priority: 0,
  });

  const [rolePermissions, setRolePermissions] = useState([]); // [{ permissionId, conditions }]
  const [inheritedPermissions, setInheritedPermissions] = useState([]); // 继承的权限ID列表

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rolesData, permsData, configData] = await Promise.all([
        rbacApi.admin.getRoles(),
        rbacApi.admin.getPermissions(),
        rbacApi.getConfig(),
      ]);
      setRoles(rolesData);
      setPermissions(permsData.permissions || []);
      setConditionTypes(configData.conditionTypes || {});
      setPermissionConditions(configData.permissionConditions || {});
      setModuleOptions(configData.modules || []);
      setCommonActions(configData.commonActions || []);
      setModuleSpecialActions(configData.moduleSpecialActions || {});
    } catch (err) {
      console.error('获取数据失败:', err);
      toast.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setDialogMode('create');
    setRoleForm({
      slug: '',
      name: '',
      description: '',
      color: '#000000',
      icon: '',
      parentId: null,
      isDefault: false,
      isDisplayed: true,
      priority: 0,
    });
    setShowRoleDialog(true);
  };

  const openEditDialog = (role) => {
    setDialogMode('edit');
    setSelectedRole(role);
    setRoleForm({
      slug: role.slug,
      name: role.name,
      description: role.description || '',
      color: role.color || '#000000',
      icon: role.icon || '',
      parentId: role.parentId || null,
      isDefault: role.isDefault,
      isDisplayed: role.isDisplayed,
      priority: role.priority,
    });
    setShowRoleDialog(true);
  };

  const openPermissionDialog = async (role) => {
    setSelectedRole(role);
    try {
      const perms = await rbacApi.admin.getRolePermissions(role.id);
      // 分离直接权限和继承权限
      const directPerms = perms.filter(p => !p.inherited);
      const inheritedPerms = perms.filter(p => p.inherited);

      // 转换为 { permissionId, conditions } 格式
      setRolePermissions(directPerms.map(p => ({
        permissionId: p.id,
        conditions: typeof p.conditions === 'string' ? JSON.parse(p.conditions) : (p.conditions || null),
      })));

      // 存储继承权限的ID列表
      setInheritedPermissions(inheritedPerms.map(p => ({
        permissionId: p.id,
        conditions: typeof p.conditions === 'string' ? JSON.parse(p.conditions) : (p.conditions || null),
      })));
    } catch (err) {
      console.error('获取角色权限失败:', err);
      setRolePermissions([]);
      setInheritedPermissions([]);
    }
    setShowPermissionDialog(true);
  };

  const handleSubmitRole = async () => {
    if (!roleForm.slug || !roleForm.name) {
      toast.error('请填写角色标识和名称');
      return;
    }

    setSubmitting(true);
    try {
      if (dialogMode === 'create') {
        await rbacApi.admin.createRole(roleForm);
        toast.success('角色创建成功');
      } else {
        await rbacApi.admin.updateRole(selectedRole.id, roleForm);
        toast.success('角色更新成功');
      }
      setShowRoleDialog(false);
      fetchData();
    } catch (err) {
      console.error('保存角色失败:', err);
      toast.error('保存失败：' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRole = async (e, role) => {
    if (role.isSystem) {
      toast.error('系统角色不能删除');
      return;
    }

    const confirmed = await confirm(e, {
      title: '确认删除角色？',
      description: `确定要删除角色 "${role.name}" 吗？此操作不可恢复。`,
      confirmText: '确认删除',
      variant: 'destructive',
    });

    if (!confirmed) return;

    try {
      await rbacApi.admin.deleteRole(role.id);
      toast.success('角色已删除');
      fetchData();
    } catch (err) {
      console.error('删除角色失败:', err);
      toast.error('删除失败：' + err.message);
    }
  };

  const handleSavePermissions = async () => {
    setSubmitting(true);
    try {
      await rbacApi.admin.setRolePermissions(
        selectedRole.id,
        rolePermissions.map(rp => ({
          permissionId: rp.permissionId,
          conditions: rp.conditions,
        }))
      );
      toast.success('权限已更新');
      setShowPermissionDialog(false);
    } catch (err) {
      console.error('保存权限失败:', err);
      toast.error('保存失败：' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const togglePermission = (permId) => {
    setRolePermissions(prev => {
      const existing = prev.find(rp => rp.permissionId === permId);
      if (existing) {
        return prev.filter(rp => rp.permissionId !== permId);
      }
      return [...prev, { permissionId: permId, conditions: null }];
    });
  };

  // 更新权限的条件
  const updatePermissionConditions = (permId, conditions) => {
    setRolePermissions(prev =>
      prev.map(rp => {
        if (rp.permissionId === permId) {
          return { ...rp, conditions };
        }
        return rp;
      })
    );
  };

  // 检查权限是否已选中（直接权限）
  const isPermissionSelected = (permId) => {
    return rolePermissions.some(rp => rp.permissionId === permId);
  };

  // 检查权限是否是继承的
  const isPermissionInherited = (permId) => {
    return inheritedPermissions.some(rp => rp.permissionId === permId);
  };

  // 获取权限的条件（优先直接权限，其次继承权限）
  const getPermissionConditions = (permId) => {
    const direct = rolePermissions.find(rp => rp.permissionId === permId);
    if (direct) return direct.conditions || null;
    const inherited = inheritedPermissions.find(rp => rp.permissionId === permId);
    return inherited?.conditions || null;
  };

  // 按模块分组权限
  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.module]) {
      acc[perm.module] = [];
    }
    acc[perm.module].push(perm);
    return acc;
  }, {});

  // 获取父角色名称
  const getParentRoleName = (parentId) => {
    if (!parentId) return null;
    const parent = roles.find(r => r.id === parentId);
    return parent ? parent.name : null;
  };

  // 获取可选的父角色（排除自身和子角色以防止循环）
  const getAvailableParentRoles = (currentRoleId) => {
    return roles.filter(r => r.id !== currentRoleId);
  };

  // 获取权限支持的条件类型列表
  const getPermissionConditionTypes = (permissionSlug) => {
    // 获取该权限支持的条件 key 列表
    const conditionKeys = permissionConditions[permissionSlug];
    if (!conditionKeys || conditionKeys.length === 0) {
      return [];
    }
    // 根据 key 列表获取完整的条件类型定义
    return conditionKeys
      .map(key => conditionTypes[key])
      .filter(Boolean);
  };

  /**
   * 排序权限列表：按照配置返回的 commonActions 和 moduleSpecialActions 顺序
   */
  const sortPermissions = (perms, module) => {
    if (!perms) return [];

    return [...perms].sort((a, b) => {
      const weightA = actionWeightMap.common[a.action] || actionWeightMap.modules[module]?.[a.action] || 999;
      const weightB = actionWeightMap.common[b.action] || actionWeightMap.modules[module]?.[b.action] || 999;

      if (weightA !== weightB) {
        return weightA - weightB;
      }

      return a.slug.localeCompare(b.slug);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          创建角色
        </Button>
      </div>

      <DataTable
        columns={[
          {
            key: 'name',
            label: '角色',
            render: (_, role) => (
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: role.color || '#e5e7eb' }}
                >
                  <Shield className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="font-medium">{role.name}</div>
                  <div className="text-xs text-muted-foreground">{role.slug}</div>
                </div>
              </div>
            ),
          },
          {
            key: 'parentId',
            label: '继承自',
            render: (value) => {
              const parentName = getParentRoleName(value);
              if (!parentName) return <span className="text-muted-foreground">-</span>;
              return (
                <div className="flex items-center gap-1 text-sm">
                  <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{parentName}</span>
                </div>
              );
            },
          },
          {
            key: 'description',
            label: '描述',
            render: (value) => (
              <span className="text-sm text-muted-foreground">
                {value || '-'}
              </span>
            ),
          },
          {
            key: 'priority',
            label: '优先级',
            width: 'w-[80px]',
            render: (value) => (
              <Badge variant="outline">{value}</Badge>
            ),
          },
          {
            key: 'flags',
            label: '标记',
            render: (_, role) => (
              <div className="flex gap-1 flex-wrap">
                {role.isSystem && (
                  <Badge variant="secondary" className="text-xs">系统</Badge>
                )}
                {role.isDefault && (
                  <Badge variant="default" className="text-xs">默认</Badge>
                )}
                {role.isDisplayed && (
                  <Badge variant="outline" className="text-xs">展示</Badge>
                )}
              </div>
            ),
          },
          {
            key: 'actions',
            label: '操作',
            align: 'right',
            sticky: 'right',
            render: (_, role) => (
              <ActionMenu
                items={[
                  {
                    label: '编辑角色',
                    icon: Pencil,
                    onClick: () => openEditDialog(role),
                  },
                  {
                    label: '配置权限',
                    icon: Key,
                    onClick: () => openPermissionDialog(role),
                  },
                  { separator: true },
                  {
                    label: '删除角色',
                    icon: Trash2,
                    variant: 'destructive',
                    onClick: (e) => handleDeleteRole(e, role),
                    disabled: role.isSystem,
                  },
                ]}
              />
            ),
          },
        ]}
        data={roles}
        loading={loading}
        emptyMessage="暂无角色"
      />

      {/* 创建/编辑角色对话框 */}
      <FormDialog
        open={showRoleDialog}
        onOpenChange={setShowRoleDialog}
        title={dialogMode === 'create' ? '创建角色' : '编辑角色'}
        description={dialogMode === 'create' ? '填写角色信息' : '修改角色信息'}
        submitText={dialogMode === 'create' ? '创建' : '保存'}
        onSubmit={handleSubmitRole}
        loading={submitting}
        maxWidth="sm:max-w-[500px]"
      >
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="slug">
                标识 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="slug"
                placeholder="如: vip"
                value={roleForm.slug}
                onChange={(e) => setRoleForm({ ...roleForm, slug: e.target.value })}
                disabled={submitting || (dialogMode === 'edit' && selectedRole?.isSystem)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">
                名称 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="如: VIP会员"
                value={roleForm.name}
                onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                disabled={submitting}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">描述</Label>
            <Textarea
              id="description"
              placeholder="角色描述..."
              value={roleForm.description}
              onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
              disabled={submitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="parentId">继承自</Label>
            <Select
              value={roleForm.parentId?.toString() || 'none'}
              onValueChange={(value) => setRoleForm({ ...roleForm, parentId: value === 'none' ? null : parseInt(value) })}
              disabled={submitting}
            >
              <SelectTrigger id="parentId">
                <SelectValue placeholder="选择父角色（可选）" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">无（不继承）</SelectItem>
                {getAvailableParentRoles(selectedRole?.id).map((role) => (
                  <SelectItem key={role.id} value={role.id.toString()}>
                    {role.name} ({role.slug})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              子角色会自动继承父角色的所有权限
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="color">颜色</Label>
              <Input
                id="color"
                type="color"
                value={roleForm.color}
                onChange={(e) => setRoleForm({ ...roleForm, color: e.target.value })}
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">优先级</Label>
              <Input
                id="priority"
                type="number"
                value={roleForm.priority}
                onChange={(e) => setRoleForm({ ...roleForm, priority: parseInt(e.target.value) || 0 })}
                disabled={submitting}
              />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isDefault"
                checked={roleForm.isDefault}
                onCheckedChange={(checked) => setRoleForm({ ...roleForm, isDefault: checked })}
                disabled={submitting}
              />
              <Label htmlFor="isDefault" className="text-sm font-normal cursor-pointer">
                默认角色
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isDisplayed"
                checked={roleForm.isDisplayed}
                onCheckedChange={(checked) => setRoleForm({ ...roleForm, isDisplayed: checked })}
                disabled={submitting}
              />
              <Label htmlFor="isDisplayed" className="text-sm font-normal cursor-pointer">
                在用户资料展示
              </Label>
            </div>
          </div>
        </div>
      </FormDialog>

      {/* 权限配置对话框 */}
      <FormDialog
        open={showPermissionDialog}
        onOpenChange={setShowPermissionDialog}
        title={`配置权限 - ${selectedRole?.name || ''}`}
        description={
          selectedRole?.parentId
            ? '选择该角色拥有的权限。标记为"继承"的权限来自父角色，不可直接修改。'
            : '选择该角色拥有的权限'
        }
        submitText="保存"
        onSubmit={handleSavePermissions}
        loading={submitting}
        maxWidth="sm:max-w-3xl"
      >
        <div className="space-y-4 py-4">
          {moduleOptions.map(({ value: moduleKey, label: moduleLabel }) => {
            const perms = sortPermissions(groupedPermissions[moduleKey], moduleKey);
            if (!perms || perms.length === 0) return null;

            return (
              <div key={moduleKey} className="space-y-2">
                <div className="flex items-center gap-2 sticky top-0 bg-muted/90 backdrop-blur-sm px-4 py-2 border-y z-10 first:border-t-0">
                  <span className="font-semibold text-sm text-foreground/80">{moduleLabel}</span>
                  <Badge variant="secondary" className="text-xs">{perms.length}</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-1 py-1">
                  {perms.map((perm) => {
                  const selected = isPermissionSelected(perm.id);
                  const inherited = isPermissionInherited(perm.id);
                  const isChecked = selected || inherited;
                  const conditions = getPermissionConditions(perm.id);
                  const hasConfig = conditions && Object.keys(conditions).length > 0;
                  const conditionCount = getPermissionConditionTypes(perm.slug).length;

                  return (
                    <div
                      key={perm.id}
                      className={cn(
                        'flex items-center gap-3 h-11 px-4 rounded-md transition-all',
                        selected && 'bg-primary/5 text-primary',
                        inherited && !selected && 'bg-muted/40 text-muted-foreground',
                        !isChecked && 'hover:bg-muted/60'
                      )}
                    >
                      <Checkbox
                        id={`perm-${perm.id}`}
                        checked={isChecked}
                        onCheckedChange={() => !inherited && togglePermission(perm.id)}
                        disabled={submitting || inherited}
                      />
                      <Label
                        htmlFor={`perm-${perm.id}`}
                        className={cn(
                          'text-sm font-medium cursor-pointer flex-1 truncate',
                          inherited && !selected && 'cursor-default'
                        )}
                        title={`${perm.name} (${perm.slug})${inherited ? ' - 继承自父角色' : ''}`}
                      >
                        {perm.name}
                        {inherited && !selected && (
                          <span className="ml-1.5 text-[10px] text-muted-foreground font-normal">(继承)</span>
                        )}
                      </Label>
                      {/* 显示已配置的条件数量 */}
                      {isChecked && hasConfig && (
                        <Badge variant="outline" className="text-[11px] px-1.5 h-5 font-medium">
                          {Object.keys(conditions).length}
                        </Badge>
                      )}
                      {/* 条件配置按钮 - 只对直接权限显示 */}
                      <div className="flex-shrink-0 flex justify-center">
                        {selected && conditionCount > 0 && (
                          <ConditionEditor
                            conditions={conditions}
                            permission={perm}
                            onChange={(newConditions) => updatePermissionConditions(perm.id, newConditions)}
                            disabled={submitting}
                            hasConfig={hasConfig}
                            conditionTypes={getPermissionConditionTypes(perm.slug)}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        </div>
      </FormDialog>
    </div>
  );
}
