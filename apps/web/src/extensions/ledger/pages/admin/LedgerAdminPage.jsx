'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { DataTable } from '@/components/forum/DataTable';
import { FormDialog } from '@/components/common/FormDialog';
import { CurrencyOperationDialog } from '../../components/admin/CurrencyOperationDialog';
import { LedgerTransactionTable } from '../../components/admin/LedgerTransactionTable';
import { Wallet, Plus, Coins, ArrowUpCircle, ArrowDownCircle, List as ListIcon } from 'lucide-react';
import { ledgerApi } from '../../api';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserSearchInput } from '@/extensions/rewards/components/admin/UserSearchInput';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export default function LedgerAdminPage() {
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState(null);
  
  // Operation Dialog State
  const [operationOpen, setOperationOpen] = useState(false);
  const [operationMode, setOperationMode] = useState('grant');
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    symbol: '',
    isActive: true
  });

  // Transaction View State
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txPagination, setTxPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [txFilterUser, setTxFilterUser] = useState(null);
  const [txFilterCurrency, setTxFilterCurrency] = useState('all');

  useEffect(() => {
    fetchCurrencies();
  }, []);

  useEffect(() => {
      fetchTransactions();
  }, [txPagination.page, txFilterUser, txFilterCurrency]);

  const fetchTransactions = async () => {
      setTxLoading(true);
      try {
          const params = {
              page: txPagination.page,
              limit: txPagination.limit,
          };
          if (txFilterCurrency && txFilterCurrency !== 'all') {
              params.currency = txFilterCurrency;
          }
          if (txFilterUser?.id) {
              params.userId = txFilterUser.id;
          }
          const data = await ledgerApi.getTransactions(params);
          setTransactions(data.items || []);
          setTxPagination(prev => ({ ...prev, total: data.total || 0 }));
      } catch (err) {
          console.error("Failed to load transactions", err);
          toast.error("加载交易记录失败");
      } finally {
          setTxLoading(false);
      }
  };

  const fetchCurrencies = async () => {
    setLoading(true);
    try {
      const data = await ledgerApi.admin.getCurrencies();
      setCurrencies(data);
    } catch (err) {
      console.error('Failed to load currencies:', err);
      toast.error('加载货币列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCurrency = async () => {
      setSubmitting(true);
      
      const data = {
          code: formData.code,
          name: formData.name,
          symbol: formData.symbol,
          isActive: formData.isActive
      };
      
      try {
          await ledgerApi.admin.upsertCurrency(data);
          toast.success('货币保存成功');
          setIsDialogOpen(false);
          fetchCurrencies();
      } catch (err) {
          console.error(err);
          toast.error('保存货币失败');
      } finally {
          setSubmitting(false);
      }
  };

  const handleOperationSubmit = async (data) => {
      setSubmitting(true);
      try {
          await ledgerApi.admin.operation(data);
          toast.success(data.type === 'grant' ? '货币发放成功' : '货币扣除成功');
          setOperationOpen(false);
      } catch (err) {
          console.error(err);
          toast.error('操作失败');
      } finally {
          setSubmitting(false);
      }
  };


  const handleCreateClick = () => {
      setEditingCurrency(null);
      setFormData({
        code: '',
        name: '',
        symbol: '',
        isActive: true
      });
      setIsDialogOpen(true);
  };

  const handleEditClick = (currency) => {
      setEditingCurrency(currency);
      setFormData({
        code: currency.code,
        name: currency.name,
        symbol: currency.symbol,
        isActive: currency.isActive
      });
      setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-card-foreground mb-2 flex items-center gap-2">
            <Wallet className="h-6 w-6" />
            货币管理
          </h1>
          <p className="text-muted-foreground">管理系统货币类型及相关金融设置</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setOperationMode('grant'); setOperationOpen(true); }}>
                <ArrowUpCircle className="h-4 w-4 mr-2" />
                充值
            </Button>
            <Button variant="outline" onClick={() => { setOperationMode('deduct'); setOperationOpen(true); }}>
                <ArrowDownCircle className="h-4 w-4 mr-2" />
                扣除
            </Button>
            <Button onClick={handleCreateClick}>
                <Plus className="h-4 w-4" />
                添加货币
            </Button>
        </div>
      </div>

      <CurrencyOperationDialog 
          open={operationOpen}
          onOpenChange={setOperationOpen}
          onSubmit={handleOperationSubmit}
          submitting={submitting}
          mode={operationMode}
          currencies={currencies}
      />

      <CurrencyOperationDialog 
          open={operationOpen}
          onOpenChange={setOperationOpen}
          onSubmit={handleOperationSubmit}
          submitting={submitting}
          mode={operationMode}
          currencies={currencies}
      />

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
            <TabsTrigger value="overview" className="gap-2">
                <Wallet className="h-4 w-4" />
                货币管理
            </TabsTrigger>
            <TabsTrigger value="transactions" className="gap-2">
                <ListIcon className="h-4 w-4" />
                交易记录
            </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
            <FormDialog 
                open={isDialogOpen} 
                onOpenChange={setIsDialogOpen}
                title={editingCurrency ? '编辑货币' : '添加货币'}
                description={editingCurrency ? `编辑 ${editingCurrency.name} (${editingCurrency.code}) 的信息` : '添加新的系统货币类型'}
                onSubmit={handleSaveCurrency}
                loading={submitting}
                maxWidth="sm:max-w-[500px]"
            >
                <div className="space-y-4 py-2">
                    <div className="grid gap-2">
                        <Label htmlFor="code">代码 (Code)</Label>
                        <Input 
                            id="code" 
                            name="code" 
                            value={formData.code}
                            onChange={(e) => setFormData({...formData, code: e.target.value})}
                            required 
                            disabled={!!editingCurrency} 
                            placeholder="例如: gold" 
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="name">名称</Label>
                        <Input 
                            id="name" 
                            name="name" 
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            required 
                            placeholder="例如: 金币" 
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="symbol">符号</Label>
                        <Input 
                            id="symbol" 
                            name="symbol" 
                            value={formData.symbol}
                            onChange={(e) => setFormData({...formData, symbol: e.target.value})}
                            required 
                            placeholder="例如: 💰" 
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <Label htmlFor="isActive">启用状态</Label>
                        <Switch 
                            id="isActive" 
                            name="isActive" 
                            checked={formData.isActive}
                            onCheckedChange={(checked) => setFormData({...formData, isActive: checked})}
                        />
                    </div>
                </div>
            </FormDialog>

            <Card>
                <CardHeader>
                    <CardTitle>货币列表</CardTitle>
                </CardHeader>
                <CardContent>
                    <DataTable
                        columns={[
                            { key: 'code', label: '代码', render: (val) => <span className="font-mono">{val}</span> },
                            { key: 'name', label: '名称' },
                            { key: 'symbol', label: '符号' },
                            { 
                                key: 'isActive', 
                                label: '状态', 
                                render: (isActive) => isActive ? 
                                    <span className="text-green-600">已启用</span> : 
                                    <span className="text-muted-foreground">已禁用</span> 
                            },
                            {
                                key: 'actions',
                                label: '操作',
                                align: 'right',
                                render: (_, currency) => (
                                    <Button variant="ghost" size="sm" onClick={() => handleEditClick(currency)}>编辑</Button>
                                )
                            }
                        ]}
                        data={currencies}
                        loading={loading}
                    />
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 mb-4 items-end">
                <div className="w-full sm:w-[300px]">
                    <UserSearchInput 
                        selectedUser={txFilterUser}
                        onSelectUser={setTxFilterUser}
                    />
                </div>
                <div className="w-full sm:w-[200px] space-y-2">
                     <Label>筛选货币</Label>
                     <Select value={txFilterCurrency} onValueChange={setTxFilterCurrency}>
                        <SelectTrigger>
                            <SelectValue placeholder="全部货币" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">全部货币</SelectItem>
                            {currencies.map(c => (
                                <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="pb-2">
                    <Button variant="ghost" onClick={() => {
                        setTxFilterUser(null);
                        setTxFilterCurrency('all');
                        setTxPagination(prev => ({ ...prev, page: 1 }));
                    }}>
                        重置筛选
                    </Button>
                </div>
            </div>

            <LedgerTransactionTable 
                transactions={transactions}
                loading={txLoading}
                pagination={{
                    ...txPagination,
                    onPageChange: (page) => setTxPagination(prev => ({ ...prev, page }))
                }}
            />
        </TabsContent>
      </Tabs>
    </div>
  );
}
