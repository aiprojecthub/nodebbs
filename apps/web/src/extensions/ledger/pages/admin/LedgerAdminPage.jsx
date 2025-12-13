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
import { LedgerTransactionTable } from '../../components/common/LedgerTransactionTable';
import { CurrencyStats } from '../../components/admin/CurrencyStats';
import { Wallet, Plus, Coins, ArrowUpCircle, ArrowDownCircle, List as ListIcon } from 'lucide-react';
import { ledgerApi } from '../../api';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserSearchInput } from '../../components/admin/UserSearchInput';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export default function LedgerAdminPage() {
  const [currencies, setCurrencies] = useState([]);
  const [stats, setStats] = useState([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [operationOpen, setOperationOpen] = useState(false);
  const [operationMode, setOperationMode] = useState('grant'); // 'grant', 'deduct'
  const [submitting, setSubmitting] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState(null);
  const [formData, setFormData] = useState({
      code: '',
      name: '',
      symbol: '',
      exchangeRate: 1,
      isActive: true,
      config: {}
  });

  // State for transaction table
  const [txFilterUser, setTxFilterUser] = useState(null);
  const [txFilterCurrency, setTxFilterCurrency] = useState('all');
  const [txPagination, setTxPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [transactions, setTransactions] = useState([]);

  // Fetch functions
  const fetchCurrencies = async () => {
      try {
          const data = await ledgerApi.admin.getCurrencies();
          setCurrencies(data);
          setLoading(false);
      } catch (error) {
          toast.error('获取货币列表失败');
          setLoading(false);
      }
  };

  const fetchTransactions = async () => {
      setTxLoading(true);
      try {
          const params = {
              page: txPagination.page,
              limit: txPagination.limit
          };
          if (txFilterCurrency && txFilterCurrency !== 'all') {
              params.currency = txFilterCurrency;
          }
          if (txFilterUser?.id) {
              params.userId = txFilterUser.id;
          }
          const data = await ledgerApi.getTransactions(params);
          setTransactions(data.items);
          setTxPagination(prev => ({ ...prev, total: data.total }));
      } catch (error) {
          console.error(error);
          toast.error('获取交易记录失败');
      } finally {
          setTxLoading(false);
      }
  };

  const fetchStats = async () => {
      setStatsLoading(true);
      try {
          const data = await ledgerApi.getStats();
          setStats(Array.isArray(data) ? data : (data.items || [data]));
      } catch (error) {
          console.error(error);
      } finally {
          setStatsLoading(false);
      }
  };

  useEffect(() => {
      Promise.all([fetchCurrencies(), fetchStats()]);
  }, []);

  useEffect(() => {
      fetchTransactions();
  }, [txPagination.page, txFilterCurrency, txFilterUser]);

  const handleOperationSubmit = async (data) => {
      setSubmitting(true);
      try {
          await ledgerApi.admin.operation(data);
          toast.success(data.type === 'grant' ? '发放成功' : '扣除成功');
          setOperationOpen(false);
          // Refresh data
          fetchStats();
          fetchTransactions();
      } catch (error) {
          console.error(error);
          toast.error(error.message || '操作失败');
      } finally {
          setSubmitting(false);
      }
  };

  const handleSaveCurrency = async () => {
      setSubmitting(true);
      
      const data = {
          code: formData.code,
          name: formData.name,
          symbol: formData.symbol,
          isActive: formData.isActive,
          config: JSON.stringify(formData.config)
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

  const handleCreateClick = () => {
      setEditingCurrency(null);
      setFormData({
        code: '',
        name: '',
        symbol: '',
        isActive: true,
        config: {}
      });
      setIsDialogOpen(true);
  };

  const handleEditClick = (currency) => {
      setEditingCurrency(currency);
      let config = {};
      try {
          config = currency.config ? JSON.parse(currency.config) : {};
      } catch (e) {
          config = {};
      }

      // Normalize config items if they exist
      const normalizeConfig = (conf) => {
          const normalized = {};
          Object.keys(conf).forEach(key => {
              const item = conf[key];
              if (item && typeof item === 'object' && 'value' in item) {
                  normalized[key] = { 
                      value: item.value, 
                      description: item.description || key
                  };
              } else if (item !== undefined) {
                  // Legacy format (value only)
                  normalized[key] = { 
                      value: item, 
                      description: key 
                  };
              }
          });
          return normalized;
      };

      setFormData({
        code: currency.code,
        name: currency.name,
        symbol: currency.symbol,
        isActive: currency.isActive,
        config: normalizeConfig(config)
      });
      setIsDialogOpen(true);
  };

  const updateConfig = (key, value) => {
      setFormData(prev => ({
          ...prev,
          config: {
              ...prev.config,
              [key]: {
                  ...prev.config[key],
                  value: parseFloat(value) || 0
              }
          }
      }));
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

        <TabsContent value="overview" className="space-y-8">
            {/* Stats Sections for each currency */}
            {currencies.filter(c => c.isActive).map(currency => {
              const currencyStats = stats.find(s => s.currency === currency.code);
              if (!currencyStats) return null;
              
              return (
                <div key={currency.code} className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <span className="text-2xl">{currency.symbol}</span>
                    {currency.name} ({currency.code})
                  </h3>
                  <CurrencyStats 
                    stats={currencyStats} 
                    loading={statsLoading} 
                    currency={currency} 
                  />
                  <div className="border-b my-4 opacity-50"></div>
                </div>
              );
            })}

            <FormDialog 
                open={isDialogOpen} 
                onOpenChange={setIsDialogOpen}
                title={editingCurrency ? '编辑货币' : '添加货币'}
                description={editingCurrency ? `编辑 ${editingCurrency.name} (${editingCurrency.code}) 的信息` : '添加新的系统货币类型'}
                onSubmit={handleSaveCurrency}
                loading={submitting}
                maxWidth="sm:max-w-[600px]"
            >
                <div className="space-y-4 py-2 overflow-y-auto pr-2">
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
                    {
                    formData.config && <div className="border-t pt-4 mt-4">
                        <h4 className="font-semibold mb-4">奖励规则配置</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {Object.entries(formData.config || {}).map(([key, item]) => (
                                <div key={key} className="grid gap-2 p-3 border rounded-md">
                                    <Label title={key} className="flex justify-between">
                                        <span>{item.description || key}</span>
                                    </Label>
                                    <Input 
                                        type="number" 
                                        value={item.value ?? 0}
                                        onChange={(e) => updateConfig(key, e.target.value)}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                    }
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
             {/* Transaction Table Content (Re-using what was there or ensuring tabs work) */}
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
                showUserColumn={true}
            />
        </TabsContent>
      </Tabs>
    </div>
  );
}
