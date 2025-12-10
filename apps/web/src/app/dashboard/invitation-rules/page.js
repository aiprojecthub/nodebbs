'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/common/AlertDialog';
import { FormDialog } from '@/components/common/FormDialog';
import { toast } from 'sonner';
import { Shield, Edit, Plus, Trash2 } from 'lucide-react';
import { Loading } from '@/components/common/Loading';
import { invitationsApi } from '@/lib/api';

const ROLE_LABELS = {
  user: '普通用户',
  vip: 'VIP用户',
  moderator: '版主',
  admin: '管理员',
};

export default function InvitationRulesPage() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Delete Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteRole, setDeleteRole] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState({
    role: '',
    dailyLimit: 1,
    maxUsesPerCode: 1,
    expireDays: 30,
    pointsCost: 0,
    isActive: true,
  });

  // 加载规则列表
  const loadRules = async () => {
    try {
      setLoading(true);
      const data = await invitationsApi.rules.getAll();
      // 适配新的数据结构 {items, page, limit, total}
      setRules(data.items || data);
    } catch (error) {
      console.error('Failed to load rules:', error);
      toast.error('加载邀请规则失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
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
      isActive: rule.isActive,
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
      isActive: true,
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
        isActive: formData.isActive,
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

  // 切换启用状态
  const handleToggle = async (role) => {
    try {
      const updatedRule = await invitationsApi.rules.toggle(role);

      // 局部更新：切换指定规则的启用状态
      setRules((prevRules) =>
        prevRules.map((r) =>
          r.role === role ? updatedRule : r
        )
      );

      toast.success('状态已更新');
    } catch (error) {
      console.error('Failed to toggle rule:', error);
      toast.error(error.message || '切换状态失败');
    }
  };

  // 打开删除确认框
  const handleDelete = (role) => {
    setDeleteRole(role);
    setDeleteDialogOpen(true);
  };

  // 确认删除
  const confirmDelete = async () => {
    if (!deleteRole) return;
    
    setDeleting(true);
    try {
      await invitationsApi.rules.delete(deleteRole);

      // 局部更新：从列表中移除删除的规则
      setRules((prevRules) => prevRules.filter((r) => r.role !== deleteRole));

      toast.success('规则已删除');
      setDeleteDialogOpen(false);
      setDeleteRole(null);
    } catch (error) {
      console.error('Failed to delete rule:', error);
      toast.error(error.message || '删除规则失败');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <Loading text='加载中...' className='min-h-[400px]' />;
  }

  return (
    <div className='space-y-6'>
      {/* 页面标题 */}
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-semibold mb-2'>邀请规则管理</h2>
          <p className='text-sm text-muted-foreground'>
            为不同角色配置邀请码生成规则
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className='h-4 w-4' />
          新建规则
        </Button>
      </div>

      {/* 规则列表 */}
      <div className='grid gap-4'>
        {rules.length === 0 ? (
          <Card className='p-12 text-center'>
            <Shield className='h-12 w-12 mx-auto text-muted-foreground mb-4' />
            <p className='text-muted-foreground mb-4'>还没有配置任何规则</p>
            <Button onClick={handleCreate}>创建第一个规则</Button>
          </Card>
        ) : (
          rules.map((rule) => (
            <Card key={rule.id} className='p-6'>
              <div className='flex items-start justify-between'>
                <div className='flex-1'>
                  <div className='flex items-center gap-3 mb-4'>
                    <h3 className='text-lg font-semibold'>
                      {ROLE_LABELS[rule.role] || rule.role}
                    </h3>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        rule.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {rule.isActive ? '启用' : '禁用'}
                    </span>
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
                      <p className='text-muted-foreground'>积分消耗</p>
                      <p className='text-lg font-semibold'>
                        {rule.pointsCost} 分
                      </p>
                    </div>
                  </div>
                </div>

                <div className='flex items-center gap-2 ml-4'>
                  <div className='flex items-center h-8 px-2 rounded-md hover:bg-muted'>
                    <Switch
                      checked={rule.isActive}
                      onCheckedChange={() => handleToggle(rule.role)}
                    />
                  </div>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => handleEdit(rule)}
                  >
                    <Edit className='h-4 w-4' />
                  </Button>
                  {rule.role !== 'user' && (
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => handleDelete(rule.role)}
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
                  <SelectItem value='user'>普通用户</SelectItem>
                  <SelectItem value='vip'>VIP用户</SelectItem>
                  <SelectItem value='moderator'>版主</SelectItem>
                  <SelectItem value='admin'>管理员</SelectItem>
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
              <Label htmlFor='pointsCost'>生成消耗积分</Label>
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

            <div className='flex items-center justify-between'>
              <Label htmlFor='isActive'>启用规则</Label>
              <Switch
                id='isActive'
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
            </div>
          </div>
      </FormDialog>

      {/* 删除确认对话框 */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="确认删除规则？"
        description={`确定要删除角色 "${ROLE_LABELS[deleteRole] || deleteRole}" 的规则吗？`}
        confirmText="确认删除"
        variant="destructive"
        onConfirm={confirmDelete}
        loading={deleting}
      />
    </div>
  );
}
