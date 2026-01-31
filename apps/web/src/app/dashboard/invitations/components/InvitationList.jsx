'use client';

import { useState, useEffect } from 'react';
import { useDebounce } from '@uidotdev/usehooks';
import { Button } from '@/components/ui/button';
import CopyButton from '@/components/common/CopyButton';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable } from '@/components/common/DataTable';
import { ActionMenu } from '@/components/common/ActionMenu';
import UserAvatar from '@/components/user/UserAvatar';
import { confirm } from '@/components/common/ConfirmPopover';
import { FormDialog } from '@/components/common/FormDialog';
import {
  Ban,
  Check,
  Clock,
  TrendingUp,
  Users,
  Ticket,
  RotateCcw,
  Plus,
} from 'lucide-react';
import { invitationsApi } from '@/lib/api';
import { toast } from 'sonner';
import Time from '@/components/common/Time';

export function InvitationList() {
  const [codes, setCodes] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [statusFilter, setStatusFilter] = useState('all');


  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const limit = 20;

  const [generateForm, setGenerateForm] = useState({
    note: '',
    maxUses: 1,
    expireDays: 30,
  });

  useEffect(() => {
    if (page !== 1) {
      setPage(1);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchCodes();
  }, [page, statusFilter, debouncedSearch]);

  const fetchCodes = async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter !== 'all') params.status = statusFilter;

      const data = await invitationsApi.admin.getAll(params);
      setCodes(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('获取邀请码列表失败:', err);
      toast.error('获取邀请码列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await invitationsApi.admin.getStats();
      setStats(data);
    } catch (err) {
      console.error('获取统计数据失败:', err);
    }
  };

  const handleGenerate = async () => {
    setSubmitting(true);
    try {
      const newCode = await invitationsApi.admin.generate(generateForm);
      toast.success('邀请码生成成功！');
      setShowGenerateDialog(false);
      setGenerateForm({ note: '', maxUses: 1, expireDays: 30 });

      // 局部更新：将新生成的邀请码添加到列表顶部
      setCodes((prevCodes) => [newCode, ...prevCodes]);
      setTotal((prevTotal) => prevTotal + 1);

      // 局部更新统计数据
      setStats((prevStats) => ({
        ...prevStats,
        totalCodes: prevStats.totalCodes + 1,
        activeCodes: prevStats.activeCodes + 1,
      }));
    } catch (err) {
      console.error('生成邀请码失败:', err);
      toast.error(err.response?.data?.error || '生成邀请码失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisableClick = async (e, code) => {
    const confirmed = await confirm(e, {
      title: '确认禁用邀请码？',
      description: (
        <>
          确定要禁用邀请码 "{code.code}" 吗？
          <br />
          禁用后该邀请码将无法使用。
        </>
      ),
      confirmText: '确认禁用',
      variant: 'destructive',
    });

    if (!confirmed) return;

    setSubmitting(true);
    try {
      const updatedCode = await invitationsApi.admin.disable(code.id);
      toast.success(`已禁用邀请码 ${code.code}`);

      // 局部更新：更新列表中被禁用的邀请码状态
      setCodes((prevCodes) =>
        prevCodes.map((c) =>
          c.id === code.id
            ? { ...c, status: 'disabled', ...updatedCode }
            : c
        )
      );

      // 局部更新统计数据：活跃数减1
      setStats((prevStats) => ({
        ...prevStats,
        activeCodes: Math.max(0, prevStats.activeCodes - 1),
      }));
    } catch (err) {
      console.error('禁用失败:', err);
      toast.error('禁用失败：' + err.message);
    } finally {
      setSubmitting(false);
    }
  };



  const handleEnableClick = async (e, code) => {
    const confirmed = await confirm(e, {
      title: '确认恢复邀请码？',
      description: (
        <>
          确定要恢复邀请码 "{code.code}" 吗？
          <br />
          恢复后该邀请码将可以继续使用。
        </>
      ),
      confirmText: '确认恢复',
      variant: 'default',
      confirmClassName: 'bg-green-600 hover:bg-green-700',
    });

    if (!confirmed) return;

    setSubmitting(true);
    try {
      const updatedCode = await invitationsApi.admin.enable(code.id);
      toast.success(`已恢复邀请码 ${code.code}`);

      // 局部更新：更新列表中被恢复的邀请码状态
      setCodes((prevCodes) =>
        prevCodes.map((c) =>
          c.id === code.id
            ? { ...c, status: 'active', ...updatedCode }
            : c
        )
      );

      // 局部更新统计数据：活跃数加1
      setStats((prevStats) => ({
        ...prevStats,
        activeCodes: prevStats.activeCodes + 1,
      }));
    } catch (err) {
      console.error('恢复失败:', err);
      toast.error('恢复失败：' + err.message);
    } finally {
      setSubmitting(false);
    }
  };



  const getStatusBadge = (status) => {
    const badges = {
      active: { label: '活跃', variant: 'default' },
      used: { label: '已使用', variant: 'secondary' },
      expired: { label: '已过期', variant: 'destructive' },
      disabled: { label: '已禁用', variant: 'outline' },
    };
    const badge = badges[status] || badges.active;
    return (
      <Badge variant={badge.variant} className="text-xs">
        {badge.label}
      </Badge>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return <Time date={dateString} />;
  };

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 shadow-none">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Ticket className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">总邀请码</p>
                <p className="text-2xl font-bold">{stats.totalCodes}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 shadow-none">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">活跃</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.activeCodes}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 shadow-none">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Check className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">已使用</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.usedCodes}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">邀请用户</p>
                <p className="text-2xl font-bold text-purple-600">
                  {stats.totalInvitedUsers}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 邀请码表格 */}
      <DataTable
        columns={[
          {
            key: 'code',
            label: '邀请码',
            width: 'w-[150px]',
            render: (value) => (
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono font-bold bg-muted px-2 py-1 rounded">
                  {value}
                </code>
                <CopyButton
                  value={value}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  iconSize="h-3 w-3"
                  onCopy={() => toast.success('邀请码已复制到剪贴板')}
                />
              </div>
            ),
          },
          {
            key: 'creator',
            label: '生成者',
            width: 'w-[150px]',
            render: (value) => (
              <div className="flex items-center gap-2">
                <UserAvatar url={value.avatar} name={value.username} size="xs" />
                <span className="text-sm">{value.username}</span>
              </div>
            ),
          },
          {
            key: 'status',
            label: '状态',
            width: 'w-[100px]',
            render: (value) => getStatusBadge(value),
          },
          {
            key: 'usage',
            label: '使用情况',
            width: 'w-[100px]',
            render: (_, code) => (
              <span className="text-sm text-muted-foreground">
                {code.usedCount}/{code.maxUses}
              </span>
            ),
          },
          {
            key: 'usedBy',
            label: '使用者',
            width: 'w-[150px]',
            render: (value) =>
              value ? (
                <div className="flex items-center gap-2">
                  <UserAvatar url={value.avatar} name={value.username} size="xs" />
                  <span className="text-sm">{value.username}</span>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">-</span>
              ),
          },
          {
            key: 'note',
            label: '备注',
            render: (value) =>
              value ? (
                <span className="text-sm text-muted-foreground">{value}</span>
              ) : (
                <span className="text-xs text-muted-foreground">-</span>
              ),
          },
          {
            key: 'expiresAt',
            label: '过期时间',
            width: 'w-[120px]',
            render: (value) => (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                {value ? (
                  <>
                    <Clock className="h-3 w-3" />
                    {formatDate(value)}
                  </>
                ) : (
                  '-'
                )}
              </span>
            ),
          },
          {
            key: 'createdAt',
            label: '创建时间',
            width: 'w-[120px]',
            render: (value) => (
              <span className="text-xs text-muted-foreground">
                {formatDate(value)}
              </span>
            ),
          },
          {
            key: 'actions',
            label: '操作',
            align: 'right',
            sticky: 'right',
            render: (_, code) => (
              <ActionMenu
                mode="inline"
                items={[
                  {
                    label: '禁用',
                    icon: Ban,
                    onClick: (e) => handleDisableClick(e, code),
                    variant: 'destructive',
                    hidden: code.status !== 'active',
                  },
                  {
                    label: '恢复',
                    icon: RotateCcw,
                    onClick: (e) => handleEnableClick(e, code),
                    hidden:
                      code.status !== 'disabled' ||
                      code.usedCount >= code.maxUses ||
                      (code.expiresAt && new Date(code.expiresAt) <= new Date()),
                  },
                ]}
              />
            ),
          },
        ]}
        data={codes}
        loading={loading}
        search={{
          value: search,
          onChange: (value) => setSearch(value),
          placeholder: '搜索邀请码或备注...',
        }}
        filter={{
          value: statusFilter,
          onChange: (value) => {
            setStatusFilter(value);
          },
          options: [
            { value: 'all', label: '全部' },
            { value: 'active', label: '活跃' },
            { value: 'used', label: '已使用' },
            { value: 'expired', label: '已过期' },
            { value: 'disabled', label: '已禁用' },
          ],
        }}
        pagination={{
          page,
          total,
          limit,
          onPageChange: setPage,
        }}
        actions={
          <Button onClick={() => setShowGenerateDialog(true)}>
            <Plus className="h-4 w-4" />
            生成邀请码
          </Button>
        }
        emptyMessage="暂无邀请码"
      />

      {/* 生成邀请码对话框 */}
      <FormDialog
          open={showGenerateDialog}
          onOpenChange={setShowGenerateDialog}
          title="生成邀请码"
          description="手动生成一个新的邀请码（管理员不受每日限制）"
          submitText="生成"
          onSubmit={handleGenerate}
          loading={submitting}
      >
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="note">备注（可选）</Label>
              <Input
                id="note"
                placeholder="例如：给特定用户的邀请码"
                value={generateForm.note}
                onChange={(e) =>
                  setGenerateForm({ ...generateForm, note: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxUses">最大使用次数</Label>
              <Input
                id="maxUses"
                type="number"
                min="1"
                value={generateForm.maxUses}
                onChange={(e) =>
                  setGenerateForm({
                    ...generateForm,
                    maxUses: parseInt(e.target.value) || 1,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expireDays">有效期（天）</Label>
              <Input
                id="expireDays"
                type="number"
                min="1"
                value={generateForm.expireDays}
                onChange={(e) =>
                  setGenerateForm({
                    ...generateForm,
                    expireDays: parseInt(e.target.value) || 30,
                  })
                }
              />
            </div>
          </div>
      </FormDialog>
    </div>
  );
}
