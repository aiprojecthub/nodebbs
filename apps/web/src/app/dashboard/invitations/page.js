'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Loader2,
  Plus,
  Ban,
  Copy,
  Check,
  Clock,
  TrendingUp,
  Users,
  Ticket,
  RotateCcw,
} from 'lucide-react';
import { invitationsApi } from '@/lib/api';
import { toast } from 'sonner';
import Time from '@/components/forum/Time';

export default function AdminInvitationsPage() {
  const [codes, setCodes] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [selectedCode, setSelectedCode] = useState(null);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [showEnableDialog, setShowEnableDialog] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);
  const limit = 20;

  const [generateForm, setGenerateForm] = useState({
    note: '',
    maxUses: 1,
    expireDays: 30,
  });

  useEffect(() => {
    fetchCodes();
    fetchStats();
  }, [page, statusFilter]);

  const fetchCodes = async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (search) params.search = search;
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



  const handleSearch = () => {
    setPage(1);
    fetchCodes();
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

  const handleDisable = async () => {
    setSubmitting(true);
    try {
      const updatedCode = await invitationsApi.admin.disable(selectedCode.id);
      toast.success(`已禁用邀请码 ${selectedCode.code}`);
      setShowDisableDialog(false);

      // 局部更新：更新列表中被禁用的邀请码状态
      setCodes((prevCodes) =>
        prevCodes.map((code) =>
          code.id === selectedCode.id
            ? { ...code, status: 'disabled', ...updatedCode }
            : code
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

  const openDisableDialog = (code) => {
    setSelectedCode(code);
    setShowDisableDialog(true);
  };

  const openEnableDialog = (code) => {
    setSelectedCode(code);
    setShowEnableDialog(true);
  };

  const handleEnable = async () => {
    setSubmitting(true);
    try {
      const updatedCode = await invitationsApi.admin.enable(selectedCode.id);
      toast.success(`已恢复邀请码 ${selectedCode.code}`);
      setShowEnableDialog(false);

      // 局部更新：更新列表中被恢复的邀请码状态
      setCodes((prevCodes) =>
        prevCodes.map((code) =>
          code.id === selectedCode.id
            ? { ...code, status: 'active', ...updatedCode }
            : code
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

  const handleCopy = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success('邀请码已复制到剪贴板');
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      toast.error('复制失败');
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
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-semibold mb-2">邀请码管理</h2>
        <p className="text-sm text-muted-foreground">
          管理所有邀请码的生成和使用情况
        </p>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
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

          <Card className="p-4">
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

          <Card className="p-4">
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(value)}
                  className="h-6 w-6 p-0"
                >
                  {copiedCode === value ? (
                    <Check className="h-3 w-3 text-green-600" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
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
            width: 'w-[80px]',
            align: 'right',
            sticky: 'right',
            render: (_, code) => (
              <div className="flex items-center justify-end gap-1">
                {code.status === 'active' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openDisableDialog(code)}
                    title="禁用"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <Ban className="h-4 w-4" />
                  </Button>
                )}
                {code.status === 'disabled' &&
                  code.usedCount < code.maxUses &&
                  (!code.expiresAt || new Date(code.expiresAt) > new Date()) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEnableDialog(code)}
                      title="恢复"
                      className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  )}
              </div>
            ),
          },
        ]}
        data={codes}
        loading={loading}
        search={{
          value: search,
          onChange: (value) => {
            setSearch(value);
            if (!value) {
              setPage(1);
              fetchCodes();
            }
          },
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
            // ...users.map((user) => ({
            //   value: `all-${user.id}`,
            //   label: `生成者: ${user.username}`,
            // })),
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

      {/* 禁用确认对话框 */}
      <ConfirmDialog
        open={showDisableDialog}
        onOpenChange={setShowDisableDialog}
        title="确认禁用邀请码？"
        description={
            <>
              确定要禁用邀请码 "{selectedCode?.code}" 吗？
              <br />
              禁用后该邀请码将无法使用。
            </>
        }
        confirmText="确认禁用"
        variant="destructive"
        onConfirm={handleDisable}
        loading={submitting}
      />

      {/* 恢复确认对话框 */}
      <ConfirmDialog
        open={showEnableDialog}
        onOpenChange={setShowEnableDialog}
        title="确认恢复邀请码？"
        description={
            <>
              确定要恢复邀请码 "{selectedCode?.code}" 吗？
              <br />
              恢复后该邀请码将可以继续使用。
            </>
        }
        confirmText="确认恢复"
        onConfirm={handleEnable}
        loading={submitting}
        variant="default" 
        confirmClassName="bg-green-600 hover:bg-green-700" 
      />
    </div>
  );
}
