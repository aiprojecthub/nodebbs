'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormDialog } from '@/components/common/FormDialog';
import { Plus, X, Clock, Ticket } from 'lucide-react';
import CopyButton from '@/components/common/CopyButton';
import { Loading } from '@/components/common/Loading';
import { Pager } from '@/components/common/Pagination';
import { toast } from 'sonner';

// 导入 Hook
import { useInvitations } from '@/hooks/profile/useInvitations';

/**
 * 邀请码页面
 * 纯 UI 组件，消费 useInvitations Hook
 */
export default function InvitationsPage() {
  const {
    // 列表数据
    codes,
    stats,
    quota,
    loading,
    page,
    pageSize,
    total,
    statusFilter,
    setPage,
    setStatusFilter,
    // 生成对话框
    isGenerateDialogOpen,
    setIsGenerateDialogOpen,
    generating,
    generateForm,
    updateGenerateForm,
    handleGenerate,
    // 工具函数
    getStatusBadgeProps,
    formatDate,
    // 派生状态
    canGenerate,
  } = useInvitations();

  // 渲染状态标签
  const renderStatusBadge = (status) => {
    const { label, className } = getStatusBadgeProps(status);
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${className}`}>
        {label}
      </span>
    );
  };

  if (loading && !codes.length) {
    return <Loading text="加载中..." className="min-h-[400px]" />;
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h2 className="text-2xl font-semibold mb-2">我的邀请码</h2>
        <p className="text-sm text-muted-foreground">
          管理您的邀请码，邀请好友加入社区
        </p>
      </div>

      {/* 配额信息卡片 */}
      {quota ? (
        <Card className="p-6 shadow-none">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">今日剩余</p>
              <p className="text-2xl font-bold">
                {quota.todayRemaining}/{quota.dailyLimit}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">总计</p>
              <p className="text-2xl font-bold">{stats?.total || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">活跃</p>
              <p className="text-2xl font-bold text-green-600">
                {stats?.active || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">已使用</p>
              <p className="text-2xl font-bold text-gray-600">
                {stats?.used || 0}
              </p>
            </div>
          </div>
        </Card>
      ) : !loading && (
        <Card className="p-6 bg-yellow-50 border-yellow-200">
          <div className="flex items-center gap-3">
            <X className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-900">邀请功能已禁用</p>
              <p className="text-sm text-yellow-700">
                您当前的角色无法生成邀请码，请联系管理员了解详情
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* 操作栏 */}
      <div className="flex items-center justify-between">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="active">活跃</SelectItem>
            <SelectItem value="used">已使用</SelectItem>
            <SelectItem value="expired">已过期</SelectItem>
          </SelectContent>
        </Select>

        <Button
          onClick={() => setIsGenerateDialogOpen(true)}
          disabled={!canGenerate}
        >
          <Plus className="h-4 w-4" />
          生成邀请码
        </Button>
      </div>

      {/* 邀请码列表 */}
      <div className="space-y-4">
        {codes.length === 0 && !loading ? (
          <Card className="p-12 text-center shadow-none">
            <Ticket className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">还没有邀请码</p>
            <Button
              className="mt-4"
              onClick={() => setIsGenerateDialogOpen(true)}
              disabled={!canGenerate}
            >
              生成第一个邀请码
            </Button>
          </Card>
        ) : loading ? (
          <Loading text="加载中..." className="min-h-[200px]" />
        ) : (
          codes.map((code) => (
            <Card key={code.id} className="p-4 shadow-none">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <code className="text-lg font-mono font-bold bg-muted px-3 py-1 rounded">
                      {code.code}
                    </code>
                    {renderStatusBadge(code.status)}
                    <CopyButton
                      value={code.code}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      iconSize="h-4 w-4"
                      onCopy={() => toast.success('邀请码已复制到剪贴板')}
                    />
                  </div>

                  {code.note && (
                    <p className="text-sm text-muted-foreground">{code.note}</p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      使用次数: {code.usedCount}/{code.maxUses}
                    </span>
                    <span>创建于: {formatDate(code.createdAt)}</span>
                    {code.expiresAt && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        过期于: {formatDate(code.expiresAt)}
                      </span>
                    )}
                  </div>

                  {code.usedBy && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">使用者:</span>
                      <span className="font-medium">
                        {code.usedBy.username}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        于 {formatDate(code.usedAt)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* 分页 */}
      {total > pageSize && (
        <Pager
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={(newPage) => setPage(newPage)}
        />
      )}

      {/* 生成邀请码对话框 */}
      <FormDialog
        open={isGenerateDialogOpen}
        onOpenChange={setIsGenerateDialogOpen}
        title="生成邀请码"
        description="创建一个新的邀请码，邀请好友加入社区"
        submitText={generating ? '生成中...' : '生成'}
        onSubmit={handleGenerate}
        loading={generating}
      >
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="count">生成数量</Label>
            <Input
              id="count"
              type="number"
              min="1"
              max={quota?.todayRemaining || 1}
              value={generateForm.count}
              onChange={(e) => updateGenerateForm('count', parseInt(e.target.value) || 1)}
            />
            {quota && (
              <p className="text-xs text-muted-foreground">
                今日剩余 {quota.todayRemaining} 个，最多可生成 {quota.todayRemaining} 个
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">备注（可选）</Label>
            <Input
              id="note"
              placeholder="例如：给朋友的邀请码"
              value={generateForm.note}
              onChange={(e) => updateGenerateForm('note', e.target.value)}
            />
            {generateForm.count > 1 && (
              <p className="text-xs text-muted-foreground">
                批量生成时，备注会自动添加序号（如：备注 #1, 备注 #2）
              </p>
            )}
          </div>

          {quota && (
            <div className="bg-muted p-3 rounded-lg space-y-2 text-sm">
              <p className="font-medium">邀请码规则</p>
              <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                <div>
                  <span className="font-medium">每日限制:</span> {quota.dailyLimit} 个
                </div>
                <div>
                  <span className="font-medium">今日剩余:</span> {quota.todayRemaining} 个
                </div>
                <div>
                  <span className="font-medium">使用次数:</span> {quota.maxUsesPerCode} 次
                </div>
                <div>
                  <span className="font-medium">有效期:</span> {quota.expireDays} 天
                </div>
              </div>
            </div>
          )}
        </div>
      </FormDialog>
    </div>
  );
}
