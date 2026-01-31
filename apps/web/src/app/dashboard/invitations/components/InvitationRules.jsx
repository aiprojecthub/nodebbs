'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { confirm } from '@/components/common/ConfirmPopover';
import { FormDialog } from '@/components/common/FormDialog';
import { toast } from 'sonner';
import { Shield, Edit, Plus, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Loading } from '@/components/common/Loading';
import { invitationsApi, rbacApi } from '@/lib/api';
import { useDefaultCurrencyName } from '@/extensions/ledger/contexts/LedgerContext';

export function InvitationRules() {
  const currencyName = useDefaultCurrencyName();
  const [rules, setRules] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);


  // 获取角色标签（动态从 roles 列表中获取）
  const getRoleLabel = (roleSlug) => {
    const role = roles.find(r => r.slug === roleSlug);
    return role ? role.name : roleSlug;
  };

  // 检查角色是否可以删除（系统角色不可删除）
  const canDeleteRule = (roleSlug) => {
    const role = roles.find(r => r.slug === roleSlug);
    return role ? !role.isSystem : true;
  };

  const [formData, setFormData] = useState({
    role: '',
    dailyLimit: 1,
    maxUsesPerCode: 1,
    expireDays: 30,
    pointsCost: 0,
  });

  // 加载规则列表和角色列表
  const loadData = async () => {
    try {
      setLoading(true);
      const [rulesData, rolesData] = await Promise.all([
        invitationsApi.rules.getAll(),
        rbacApi.admin.getRoles(),
      ]);
      // 适配新的数据结构 {items, page, limit, total}
      setRules(rulesData.items || rulesData);
      // 角色数据
      setRoles(rolesData.items || rolesData);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 打开编辑对话框
  const handleEdit = (rule) => {
    setEditingRule(rule);
    setFormData({
      role: rule.role,
      dailyLimit: rule.dailyLimit,
      maxUsesPerCode: rule.maxUsesPerCode,
      expireDays: rule.expireDays,
      pointsCost: rule.pointsCost,
    });
    setIsDialogOpen(true);
  };

  // 打开新建对话框
  const handleCreate = () => {
    setEditingRule(null);
    setFormData({
      role: '',
      dailyLimit: 1,
      maxUsesPerCode: 1,
      expireDays: 30,
      pointsCost: 0,
    });
    setIsDialogOpen(true);
  };

  // 保存规则
  const handleSave = async () => {
    try {
      setSaving(true);

      if (!formData.role) {
        toast.error('请选择角色');
        return;
      }

      const updatedRule = await invitationsApi.rules.upsert(formData.role, {
        dailyLimit: formData.dailyLimit,
        maxUsesPerCode: formData.maxUsesPerCode,
        expireDays: formData.expireDays,
        pointsCost: formData.pointsCost,
      });

      // 局部更新：在列表中查找并更新或添加规则
      setRules((prevRules) => {
        const existingIndex = prevRules.findIndex(
          (r) => r.role === formData.role
        );
        if (existingIndex >= 0) {
          // 更新现有规则
          const newRules = [...prevRules];
          newRules[existingIndex] = updatedRule;
          return newRules;
        } else {
          // 添加新规则
          return [...prevRules, updatedRule];
        }
      });

      toast.success(editingRule ? '规则已更新' : '规则已创建');
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to save rule:', error);
      toast.error(error.message || '保存规则失败');
    } finally {
      setSaving(false);
    }
  };

  // 确认删除
  const handleDeleteClick = async (e, role) => {
    const confirmed = await confirm(e, {
      title: '确认删除规则？',
      description: `确定要删除角色 "${getRoleLabel(role)}" 的规则吗？`,
      confirmText: '确认删除',
      variant: 'destructive',
    });
    
    if (!confirmed) return;

    try {
      await invitationsApi.rules.delete(role);

      // 局部更新：从列表中移除删除的规则
      setRules((prevRules) => prevRules.filter((r) => r.role !== role));

      toast.success('规则已删除');
    } catch (error) {
      console.error('Failed to delete rule:', error);
      toast.error(error.message || '删除规则失败');
    }
  };

  if (loading) {
    return <Loading text='加载中...' className='min-h-[400px]' />;
  }

  // 计算可添加规则的角色（排除 guest 和已有规则的角色）
  const availableRoles = roles.filter((role) => {
    if (role.slug === 'guest') return false;
    const existingRoleSlugs = rules.map(r => r.role);
    return !existingRoleSlugs.includes(role.slug);
  });
  const canCreateRule = availableRoles.length > 0;

  return (
    <div className='space-y-6'>
      <div className="flex justify-end">
        <Button onClick={handleCreate} disabled={!canCreateRule}>
            <Plus className='h-4 w-4' />
            新建规则
        </Button>
      </div>

      {/* 规则列表 */}
      <div className='grid gap-4'>
        {rules.length === 0 ? (
          <Card className='p-12 text-center shadow-none'>
            <Shield className='h-12 w-12 mx-auto text-muted-foreground mb-4' />
            <p className='text-muted-foreground mb-4'>还没有配置任何规则</p>
            <Button onClick={handleCreate} disabled={!canCreateRule}>创建第一个规则</Button>
          </Card>
        ) : (
          rules.map((rule) => (
            <Card key={rule.id} className='p-6 shadow-none'>
              <div className='flex items-start justify-between'>
                <div className='flex-1'>
                  <div className='flex items-center gap-3 mb-4'>
                    <div className='flex items-center gap-2'>
                        <h3 className='text-lg font-semibold'>
                            {getRoleLabel(rule.role)}
                        </h3>
                        {rule.isEnabled ? (
                            <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200 gap-1 font-normal">
                                <CheckCircle2 className="w-3 h-3" /> <span className="text-xs">权限已开启</span>
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="text-amber-600 bg-amber-50 border-amber-200 gap-1 font-normal">
                                <AlertTriangle className="w-3 h-3" /> <span className="text-xs">权限未开启</span>
                            </Badge>
                        )}
                    </div>
                  </div>

                  <div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-sm'>
                    <div>
                      <p className='text-muted-foreground'>每日限制</p>
                      <p className='text-lg font-semibold'>
                        {rule.dailyLimit} 个
                      </p>
                    </div>
                    <div>
                      <p className='text-muted-foreground'>每码使用次数</p>
                      <p className='text-lg font-semibold'>
                        {rule.maxUsesPerCode} 次
                      </p>
                    </div>
                    <div>
                      <p className='text-muted-foreground'>有效期</p>
                      <p className='text-lg font-semibold'>
                        {rule.expireDays} 天
                      </p>
                    </div>
                    <div>
                      <p className='text-muted-foreground'>{currencyName}消耗</p>
                      <p className='text-lg font-semibold'>
                        {rule.pointsCost} 分
                      </p>
                    </div>
                  </div>
                </div>

                <div className='flex items-center gap-2 ml-4'>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => handleEdit(rule)}
                  >
                    <Edit className='h-4 w-4' />
                  </Button>
                  {canDeleteRule(rule.role) && (
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={(e) => handleDeleteClick(e, rule.role)}
                    >
                      <Trash2 className='h-4 w-4 text-red-600' />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* 编辑/新建对话框 */}
      <FormDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          title={editingRule ? '编辑规则' : '新建规则'}
          description="配置该角色的邀请码生成规则"
          submitText={saving ? '保存中...' : '保存'}
          onSubmit={handleSave}
          loading={saving}
      >
          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <Label htmlFor='role'>角色</Label>
              <Select
                value={formData.role}
                onValueChange={(value) =>
                  setFormData({ ...formData, role: value })
                }
                disabled={!!editingRule}
              >
                <SelectTrigger id='role'>
                  <SelectValue placeholder='选择角色' />
                </SelectTrigger>
                <SelectContent>
                  {roles
                    .filter((role) => {
                      // 排除访客角色
                      if (role.slug === 'guest') return false;
                      // 新建时排除已有规则的角色
                      if (!editingRule) {
                        const existingRoleSlugs = rules.map(r => r.role);
                        if (existingRoleSlugs.includes(role.slug)) return false;
                      }
                      return true;
                    })
                    .map((role) => (
                      <SelectItem key={role.id} value={role.slug}>
                        {role.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='dailyLimit'>每日生成限制</Label>
              <Input
                id='dailyLimit'
                type='number'
                min='0'
                value={formData.dailyLimit}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    dailyLimit: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='maxUsesPerCode'>每个码的使用次数</Label>
              <Input
                id='maxUsesPerCode'
                type='number'
                min='1'
                value={formData.maxUsesPerCode}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxUsesPerCode: parseInt(e.target.value) || 1,
                  })
                }
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='expireDays'>有效期（天）</Label>
              <Input
                id='expireDays'
                type='number'
                min='1'
                value={formData.expireDays}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    expireDays: parseInt(e.target.value) || 1,
                  })
                }
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='pointsCost'>生成消耗{currencyName}</Label>
              <Input
                id='pointsCost'
                type='number'
                min='0'
                value={formData.pointsCost}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    pointsCost: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>
      </FormDialog>
    </div>
  );
}
