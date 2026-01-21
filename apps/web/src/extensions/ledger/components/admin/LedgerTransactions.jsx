'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { LedgerTransactionTable } from '../../components/common/LedgerTransactionTable';
import { UserSearchInput } from '../../components/admin/UserSearchInput';
import { ledgerApi } from '../../api';
import { toast } from 'sonner';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export function LedgerTransactions() {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currencies, setCurrencies] = useState([]);
    
    // Filters
    const [filterUser, setFilterUser] = useState(null);
    const [filterCurrency, setFilterCurrency] = useState('all');
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

    // Load available currencies for filter
    useEffect(() => {
        const loadCurrencies = async () => {
            try {
                const data = await ledgerApi.getCurrencies();
                setCurrencies(data);
            } catch (error) {
                console.error('Failed to load currencies for filter', error);
            }
        };
        loadCurrencies();
    }, []);

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const params = {
                page: pagination.page,
                limit: pagination.limit
            };
            if (filterCurrency && filterCurrency !== 'all') {
                params.currency = filterCurrency;
            }
            if (filterUser?.id) {
                params.userId = filterUser.id;
            }
            const data = await ledgerApi.getTransactions(params);
            setTransactions(data.items);
            setPagination(prev => ({ ...prev, total: data.total }));
        } catch (error) {
            console.error(error);
            toast.error('获取交易记录失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, [pagination.page, filterCurrency, filterUser]);

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 mb-4 items-end">
                <div className="w-full sm:w-[300px]">
                    <UserSearchInput 
                        selectedUser={filterUser}
                        onSelectUser={setFilterUser}
                    />
                </div>
                <div className="w-full sm:w-[200px] space-y-2">
                     <Label>筛选货币</Label>
                     <Select value={filterCurrency} onValueChange={setFilterCurrency}>
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
            </div>

            <LedgerTransactionTable 
                transactions={transactions}
                loading={loading}
                pagination={{
                    ...pagination,
                    onPageChange: (page) => setPagination(prev => ({ ...prev, page }))
                }}
                showUserColumn={true}
            />
        </div>
    );
}
