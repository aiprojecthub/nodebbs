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
import { Shield, Pencil, Trash2, Plus, Key } from 'lucide-react';
import { rbacApi, categoryApi } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ConditionEditor } from './ConditionEditor';

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
  const [allowedRolePermissions, setAllowedRolePermissions] = useState({});

  // 动态数据源（用于条件编辑器）
  const [dynamicDataSources, setDynamicDataSources] = useState({
    categories: [], // 分类列表
  });

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
    isDefault: false,
    isDisplayed: true,
    priority: 0,
  });

  const [rolePermissions, setRolePermissions] = useState([]); // [{ permissionId, conditions }]

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rolesData, permsData, configData, categoriesData] = await Promise.all([
        rbacApi.admin.getRoles(),
        rbacApi.admin.getPermissions(),
        rbacApi.getConfig(),
        categoryApi.getAll().catch(() => []),
      ]);

      setRoles(rolesData);
      setPermissions(permsData.permissions || []);
      setConditionTypes(configData.conditionTypes || {});
      setPermissionConditions(configData.permissionConditions || {});
      setModuleOptions(configData.modules || []);
      setCommonActions(configData.commonActions || []);
      setModuleSpecialActions(configData.moduleSpecialActions || {});
      setAllowedRolePermissions(configData.allowedRolePermissions || {});

      // 设置动态数据源
      setDynamicDataSources({
        categories: categoriesData.map(cat => ({
          value: cat.id,
          label: cat.name,
        })),
      });
    } catch (err) {
      console.error('获取数据失败:', err);
      toast.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setDialogMode('create');
    setSelectedRole(null);
    setRoleForm({
      slug: '',
      name: '',
      description: '',
      color: '#000000',
      icon: '',
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

      // 转换为 { permissionId, conditions } 格式
      setRolePermissions(perms.map(p => ({
        permissionId: p.id,
        conditions: typeof p.conditions === 'string' ? JSON.parse(p.conditions) : (p.conditions || null),
      })));
    } catch (err) {
      console.error('获取角色权限失败:', err);
      setRolePermissions([]);
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

  // 检查权限是否已选中
  const isPermissionSelected = (permId) => {
    return rolePermissions.some(rp => rp.permissionId === permId);
  };

  // 获取权限的条件
  const getPermissionConditions = (permId) => {
    const rp = rolePermissions.find(rp => rp.permissionId === permId);
    return rp?.conditions || null;
  };

  // 按模块分组权限
  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.module]) {
      acc[perm.module] = [];
    }
    acc[perm.module].push(perm);
    return acc;
  }, {});

  // 获取权限支持的条件类型列表
  const getPermissionConditionTypes = (permissionSlug) => {
    // 获取该权限支持的条件 key 列表
    const conditionKeys = permissionConditions[permissionSlug];
    if (!conditionKeys || conditionKeys.length === 0) {
      return [];
    }
    // 根据 key 列表获取完整的条件类型定义
    const allTypes = conditionKeys
      .map(key => conditionTypes[key])
      .filter(Boolean);
    
    // 如果没有选中角色，返回所有类型
    if (!selectedRole?.slug) {
      return allTypes;
    }
    
    // 过滤条件类型
    return allTypes.filter(type => {
      // 1. 检查 excludeRoles：完全排除某些角色
      if (type.excludeRoles?.includes(selectedRole.slug)) {
        return false;
      }
      
      // 2. 检查 excludeRolePermissions：特定角色的特定权限排除（支持通配符）
      if (type.excludeRolePermissions?.[selectedRole.slug]) {
        const patterns = type.excludeRolePermissions[selectedRole.slug];
        const isExcluded = patterns.some(pattern => {
          // 简单的通配符匹配：将 * 替换为 .*，然后用正则匹配
          const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
          return regex.test(permissionSlug);
        });
        if (isExcluded) {
          return false;
        }
      }
      
      return true;
    });
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
        description="选择该角色拥有的权限"
        submitText="保存"
        onSubmit={handleSavePermissions}
        loading={submitting}
        maxWidth="sm:max-w-3xl"
      >
        <div className="space-y-4 py-4">
          {moduleOptions.map(({ value: moduleKey, label: moduleLabel }) => {
            let perms = sortPermissions(groupedPermissions[moduleKey], moduleKey);

            // 根据后端配置过滤允许显示的权限
            if (selectedRole?.slug && allowedRolePermissions[selectedRole.slug]) {
              const allowed = allowedRolePermissions[selectedRole.slug];
              perms = perms.filter(p => allowed.includes(p.slug));
            }

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
                  const conditions = getPermissionConditions(perm.id);
                  const hasConfig = conditions && Object.keys(conditions).length > 0;
                  const conditionCount = getPermissionConditionTypes(perm.slug).length;

                  return (
                    <div
                      key={perm.id}
                      className={cn(
                        'flex items-center gap-3 h-11 px-4 rounded-md transition-all',
                        selected && 'bg-primary/5 text-primary',
                        !selected && 'hover:bg-muted/60'
                      )}
                    >
                      <Checkbox
                        id={`perm-${perm.id}`}
                        checked={selected}
                        onCheckedChange={() => togglePermission(perm.id)}
                        disabled={submitting}
                      />
                      <Label
                        htmlFor={`perm-${perm.id}`}
                        className="text-sm font-medium cursor-pointer flex-1 truncate"
                        title={`${perm.name} (${perm.slug})`}
                      >
                        {perm.name}
                      </Label>
                      {/* 显示已配置的条件数量 */}
                      {selected && hasConfig && (
                        <Badge variant="outline" className="text-[11px] px-1.5 h-5 font-medium">
                          {Object.keys(conditions).length}
                        </Badge>
                      )}
                      {/* 条件配置按钮 */}
                      <div className="flex-shrink-0 flex justify-center">
                        {selected && conditionCount > 0 && (
                          <ConditionEditor
                            conditions={conditions}
                            permission={perm}
                            onChange={(newConditions) => updatePermissionConditions(perm.id, newConditions)}
                            disabled={submitting}
                            hasConfig={hasConfig}
                            conditionTypes={getPermissionConditionTypes(perm.slug)}
                            dynamicDataSources={dynamicDataSources}
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
