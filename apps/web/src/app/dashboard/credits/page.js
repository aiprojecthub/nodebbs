'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DataTable } from '@/components/forum/DataTable';
import { creditsApi, userApi } from '@/lib/api';
import { toast } from 'sonner';
import { Coins, TrendingUp, TrendingDown, Users, Plus, Minus, Loader2, Search } from 'lucide-react';
import { Loading } from '@/components/common/Loading';
import TimeAgo from '@/components/forum/TimeAgo';

export default function CreditsManagementPage() {
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGrantDialog, setShowGrantDialog] = useState(false);
  const [showDeductDialog, setShowDeductDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
  });

  const [formData, setFormData] = useState({
    userId: null,
    username: '',
    amount: 0,
    description: '',
  });

  useEffect(() => {
    fetchStats();
    fetchTransactions();
  }, [pagination.page]);

  const fetchStats = async () => {
    try {
      const data = await creditsApi.admin.getStats();
      setStats(data);
    } catch (error) {
      console.error('获取统计失败:', error);
      toast.error('获取统计失败');
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const data = await creditsApi.getTransactions({
        page: pagination.page,
        limit: pagination.limit,
      });
      setTransactions(data.items || []);
      setPagination((prev) => ({
        ...prev,
        total: data.total || 0,
      }));
    } catch (error) {
      console.error('获取交易记录失败:', error);
      toast.error('获取交易记录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const data = await userApi.getList({ search: searchQuery, limit: 10 });
      setSearchResults(data.items || []);
    } catch (error) {
      console.error('搜索用户失败:', error);
      toast.error('搜索用户失败');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectUser = (user) => {
    setFormData((prev) => ({
      ...prev,
      userId: user.id,
      username: user.username,
    }));
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleGrant = async () => {
    if (!formData.userId || formData.amount <= 0) {
      toast.error('请选择用户并输入有效金额');
      return;
    }

    setSubmitting(true);
    try {
      await creditsApi.admin.grant(formData.userId, formData.amount, formData.description);
      toast.success('积分发放成功');
      setShowGrantDialog(false);
      resetForm();
      fetchStats();
      fetchTransactions();
    } catch (error) {
      console.error('发放积分失败:', error);
      toast.error(error.message || '发放积分失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeduct = async () => {
    if (!formData.userId || formData.amount <= 0) {
      toast.error('请选择用户并输入有效金额');
      return;
    }

    setSubmitting(true);
    try {
      await creditsApi.admin.deduct(formData.userId, formData.amount, formData.description);
      toast.success('积分扣除成功');
      setShowDeductDialog(false);
      resetForm();
      fetchStats();
      fetchTransactions();
    } catch (error) {
      console.error('扣除积分失败:', error);
      toast.error(error.message || '扣除积分失败');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      userId: null,
      username: '',
      amount: 0,
      description: '',
    });
    setSearchQuery('');
    setSearchResults([]);
  };

  const getTypeLabel = (type) => {
    const labels = {
      check_in: '签到',
      post_topic: '发布话题',
      post_reply: '发布回复',
      receive_like: '获得点赞',
      reward_post: '打赏帖子',
      receive_reward: '收到打赏',
      buy_avatar_frame: '购买头像框',
      buy_badge: '购买勋章',
      buy_item: '购买商品',
      invite_user: '邀请用户',
      admin_grant: '管理员发放',
      admin_deduct: '管理员扣除',
    };
    return labels[type] || type;
  };

  const columns = [
    {
      label: 'ID',
      key: 'id',
      render: (value) => <span className="text-muted-foreground">#{value}</span>,
    },
    {
      label: '用户',
      key: 'username',
      render: (value, row) => (
        <a
          href={`/users/${row.username}`}
          className="hover:underline text-primary"
          target="_blank"
          rel="noopener noreferrer"
        >
          {row.username}
        </a>
      ),
    },
    {
      label: '类型',
      key: 'type',
      render: (value) => (
        <span className="text-sm text-muted-foreground">{getTypeLabel(value)}</span>
      ),
    },
    {
      label: '金额',
      key: 'amount',
      render: (value) => (
        <span className={`font-semibold ${value > 0 ? 'text-green-600' : 'text-red-600'}`}>
          {value > 0 ? '+' : ''}{value}
        </span>
      ),
    },
    {
      label: '余额',
      key: 'balance',
      render: (value) => <span className="font-medium">{value}</span>,
    },
    {
      label: '描述',
      key: 'description',
      render: (value) => (
        <span className="text-sm text-muted-foreground line-clamp-1">{value || '-'}</span>
      ),
    },
    {
      label: '时间',
      key: 'createdAt',
      render: (value) => <TimeAgo date={value} />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-card-foreground mb-2 flex items-center gap-2">
            <Coins className="h-6 w-6" />
            积分管理
          </h1>
          <p className="text-muted-foreground">查看积分系统统计和管理用户积分</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowGrantDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            发放积分
          </Button>
          <Button variant="destructive" onClick={() => setShowDeductDialog(true)}>
            <Minus className="mr-2 h-4 w-4" />
            扣除积分
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总流通积分</CardTitle>
              <Coins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCirculation.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">系统中所有用户的积分总和</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">今日发放</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                +{stats.todayEarned.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">今日用户获得的积分总数</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">今日消费</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                -{stats.todaySpent.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">今日用户消费的积分总数</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">活跃用户</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.userCount.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">拥有积分账户的用户数</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 交易记录 */}
      <Card>
        <CardHeader>
          <CardTitle>最近交易记录</CardTitle>
          <CardDescription>查看系统中所有用户的积分交易记录</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loading text="加载中..." className="py-12" />
          ) : (
            <DataTable
              columns={columns}
              data={transactions}
              pagination={{
                page: pagination.page,
                total: pagination.total,
                limit: pagination.limit,
                onPageChange: (newPage) => {
                  setPagination((prev) => ({
                    ...prev,
                    page: newPage,
                  }));
                },
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* 发放积分对话框 */}
      <Dialog open={showGrantDialog} onOpenChange={setShowGrantDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>发放积分</DialogTitle>
            <DialogDescription>向指定用户发放积分</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 用户搜索 */}
            <div className="space-y-2">
              <Label>选择用户</Label>
              {formData.userId ? (
                <div className="flex items-center justify-between p-3 border rounded-lg bg-muted">
                  <span className="font-medium">{formData.username}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormData((prev) => ({ ...prev, userId: null, username: '' }))}
                  >
                    更换
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <Input
                      placeholder="搜索用户名或邮箱"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <Button onClick={handleSearch} disabled={searching}>
                      {searching ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {searchResults.length > 0 && (
                    <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                      {searchResults.map((user) => (
                        <button
                          key={user.id}
                          className="w-full p-3 text-left hover:bg-muted transition-colors"
                          onClick={() => handleSelectUser(user)}
                        >
                          <div className="font-medium">{user.username}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 积分数量 */}
            <div className="space-y-2">
              <Label htmlFor="grant-amount">积分数量</Label>
              <Input
                id="grant-amount"
                type="number"
                min="1"
                value={formData.amount}
                onChange={(e) => setFormData((prev) => ({ ...prev, amount: parseInt(e.target.value) || 0 }))}
                placeholder="输入发放的积分数量"
              />
            </div>

            {/* 操作原因 */}
            <div className="space-y-2">
              <Label htmlFor="grant-description">操作原因</Label>
              <Textarea
                id="grant-description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="输入发放原因（可选）"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGrantDialog(false)} disabled={submitting}>
              取消
            </Button>
            <Button onClick={handleGrant} disabled={submitting || !formData.userId || formData.amount <= 0}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  发放中...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  确认发放
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 扣除积分对话框 */}
      <Dialog open={showDeductDialog} onOpenChange={setShowDeductDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>扣除积分</DialogTitle>
            <DialogDescription>从指定用户扣除积分</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 用户搜索 */}
            <div className="space-y-2">
              <Label>选择用户</Label>
              {formData.userId ? (
                <div className="flex items-center justify-between p-3 border rounded-lg bg-muted">
                  <span className="font-medium">{formData.username}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormData((prev) => ({ ...prev, userId: null, username: '' }))}
                  >
                    更换
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <Input
                      placeholder="搜索用户名或邮箱"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <Button onClick={handleSearch} disabled={searching}>
                      {searching ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {searchResults.length > 0 && (
                    <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                      {searchResults.map((user) => (
                        <button
                          key={user.id}
                          className="w-full p-3 text-left hover:bg-muted transition-colors"
                          onClick={() => handleSelectUser(user)}
                        >
                          <div className="font-medium">{user.username}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 积分数量 */}
            <div className="space-y-2">
              <Label htmlFor="deduct-amount">积分数量</Label>
              <Input
                id="deduct-amount"
                type="number"
                min="1"
                value={formData.amount}
                onChange={(e) => setFormData((prev) => ({ ...prev, amount: parseInt(e.target.value) || 0 }))}
                placeholder="输入扣除的积分数量"
              />
            </div>

            {/* 操作原因 */}
            <div className="space-y-2">
              <Label htmlFor="deduct-description">操作原因</Label>
              <Textarea
                id="deduct-description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="输入扣除原因（可选）"
                rows={3}
              />
            </div>

            <div className="p-3 border border-yellow-500/20 bg-yellow-500/5 rounded-lg">
              <p className="text-sm text-yellow-600">
                ⚠️ 注意：如果用户余额不足，扣除操作将失败
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeductDialog(false)} disabled={submitting}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeduct}
              disabled={submitting || !formData.userId || formData.amount <= 0}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  扣除中...
                </>
              ) : (
                <>
                  <Minus className="mr-2 h-4 w-4" />
                  确认扣除
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
