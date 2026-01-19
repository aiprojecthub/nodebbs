'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { DataTable } from '@/components/common/DataTable';
import { FormDialog } from '@/components/common/FormDialog';
import { CurrencyOperationDialog } from './CurrencyOperationDialog';
import { Plus, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { ledgerApi } from '../../api';
import { DEFAULT_CURRENCY_CODE } from '../../constants';
import { toast } from 'sonner';

export function LedgerCurrencies() {
    const [currencies, setCurrencies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    
    // Operation Dialog State
    const [operationOpen, setOperationOpen] = useState(false);
    const [operationMode, setOperationMode] = useState('grant');

    const [editingCurrency, setEditingCurrency] = useState(null);
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        symbol: '',
        isActive: true,
        config: {}
    });

    const fetchCurrencies = async () => {
        try {
            const data = await ledgerApi.admin.getCurrencies();
            setCurrencies(data);
        } catch (error) {
            toast.error('获取货币列表失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCurrencies();
    }, []);

    // 将配置项的 value 统一转换为字符串，便于输入框编辑
    // value: 用户输入值（空字符串表示未修改，使用默认值）
    // defaultValue: 原始默认值，用于 placeholder 显示和空值回退
    const normalizeConfig = (conf) => {
        const normalized = {};
        Object.keys(conf).forEach(key => {
            const item = conf[key];
            if (item && typeof item === 'object' && 'value' in item) {
                const defaultVal = item.value ?? 0;
                normalized[key] = { 
                    value: String(defaultVal),  // 默认填充当前配置值
                    defaultValue: defaultVal,
                    description: item.description || key
                };
            } else if (item !== undefined) {
                // Legacy format
                const defaultVal = item ?? 0;
                normalized[key] = { 
                    value: String(defaultVal),  // 默认填充当前配置值
                    defaultValue: defaultVal,
                    description: key 
                };
            }
        });
        return normalized;
    };

    const handleCreateClick = () => {
        setEditingCurrency(null);
        setFormData({
            code: '',
            name: '',
            symbol: '',
            isActive: true,
            config: {} // Start empty
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

        setFormData({
            code: currency.code,
            name: currency.name,
            symbol: currency.symbol,
            isActive: currency.isActive,
            config: normalizeConfig(config)
        });
        setIsDialogOpen(true);
    };

    // 更新配置项的值，保持为字符串格式
    const updateConfig = (key, value) => {
        setFormData(prev => ({
            ...prev,
            config: {
                ...prev.config,
                [key]: {
                    ...prev.config[key],
                    value: value
                }
            }
        }));
    };

    // 保存时将配置项的值转换为数字格式
    // 如果用户未输入（空字符串），则使用默认值
    const serializeConfig = (config) => {
        const serialized = {};
        Object.keys(config).forEach(key => {
            const item = config[key];
            // 空值使用默认值，否则解析用户输入
            const finalValue = item.value === '' 
                ? item.defaultValue 
                : (parseFloat(item.value) || 0);
            serialized[key] = {
                value: finalValue,
                description: item.description
            };
        });
        return serialized;
    };

    const handleSaveCurrency = async () => {
        setSubmitting(true);
        const data = {
            code: formData.code,
            name: formData.name,
            symbol: formData.symbol,
            isActive: formData.isActive,
            config: JSON.stringify(serializeConfig(formData.config))
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
            toast.success(data.type === 'grant' ? '发放成功' : '扣除成功');
            setOperationOpen(false);
            // Optionally refresh stats if we had them, or just currencies list
        } catch (error) {
            console.error(error);
            toast.error(error.message || '操作失败');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setOperationMode('grant'); setOperationOpen(true); }}>
                    <ArrowUpCircle className="h-4 w-4" />
                    充值
                </Button>
                <Button variant="outline" onClick={() => { setOperationMode('deduct'); setOperationOpen(true); }}>
                    <ArrowDownCircle className="h-4 w-4" />
                    扣除
                </Button>
                <Button onClick={handleCreateClick}>
                    <Plus className="h-4 w-4" />
                    添加货币
                </Button>
            </div>

            <CurrencyOperationDialog 
                open={operationOpen}
                onOpenChange={setOperationOpen}
                onSubmit={handleOperationSubmit}
                submitting={submitting}
                mode={operationMode}
                currencies={currencies}
            />
            <DataTable
                columns={[
                    { key: 'name', label: '名称' },
                    { key: 'code', label: '代码', render: (val) => (
                        <span className="font-mono">
                            {val}
                            {val === DEFAULT_CURRENCY_CODE && (
                                <span className="ml-2 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">默认</span>
                            )}
                        </span>
                    )},
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
                

            <FormDialog 
                open={isDialogOpen} 
                onOpenChange={setIsDialogOpen}
                title={editingCurrency ? '编辑货币' : '添加货币'}
                description={editingCurrency ? `编辑 ${editingCurrency.name} (${editingCurrency.code}) 的信息` : '添加新的系统货币类型'}
                onSubmit={handleSaveCurrency}
                loading={submitting}
                maxWidth="sm:max-w-[680px]"
            >
                <div className="space-y-4 py-4">
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

                    {formData.config && Object.keys(formData.config).length > 0 && (
                        <div className="border-t pt-4 mt-4">
                            <h4 className="font-semibold mb-4">奖励规则配置</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {Object.entries(formData.config).map(([key, item]) => (
                                    <div key={key} className="grid gap-2 p-3 border rounded-md">
                                        <Label title={key} className="flex justify-between items-center h-6">
                                            <span className="truncate" title={item.description || key}>{item.description || key}</span>
                                        </Label>
                                        <Input 
                                            type="number" 
                                            value={item.value}
                                            placeholder={String(item.defaultValue)}
                                            onChange={(e) => updateConfig(key, e.target.value)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </FormDialog>
        </div>
    );
}
