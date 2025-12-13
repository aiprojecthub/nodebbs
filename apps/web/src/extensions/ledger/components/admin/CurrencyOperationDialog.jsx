import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, Minus } from 'lucide-react';
import { UserSearchInput } from '../../../rewards/components/admin/UserSearchInput';
import { FormDialog } from '@/components/common/FormDialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

/**
 * 用于管理员发放或扣除货币的操作对话框
 * @param {Object} props
 * @param {boolean} props.open - 对话框打开状态
 * @param {Function} props.onOpenChange - 打开状态改变时的回调
 * @param {Function} props.onSubmit - 表单提交时的回调 (data)
 * @param {boolean} props.submitting - 提交进行中
 * @param {'grant' | 'deduct'} props.mode - 操作模式
 * @param {Array} props.currencies - 货币列表
 */
export function CurrencyOperationDialog({ open, onOpenChange, onSubmit, submitting, mode = 'grant', currencies = [] }) {
    const [formData, setFormData] = useState({
        user: null,
        amount: 0,
        currency: '',
        description: '',
    });

    const isGrant = mode === 'grant';

    const config = {
        grant: {
            title: '发放货币',
            description: '向指定用户发放货币',
            amountLabel: '数量',
            amountPlaceholder: '输入发放数量',
            reasonLabel: '操作原因',
            reasonPlaceholder: '输入发放原因（可选）',
            buttonText: '确认发放',
            icon: Plus,
            buttonVariant: 'default',
            showWarning: false,
        },
        deduct: {
            title: '扣除货币',
            description: '从指定用户扣除货币',
            amountLabel: '数量',
            amountPlaceholder: '输入扣除数量',
            reasonLabel: '操作原因',
            reasonPlaceholder: '输入扣除原因（可选）',
            buttonText: '确认扣除',
            icon: Minus,
            buttonVariant: 'destructive',
            showWarning: true,
        },
    };

    const currentConfig = config[mode];

    const handleSubmit = () => {
        if (!formData.user || !formData.currency || formData.amount <= 0) {
            return;
        }
        onSubmit({
            userId: formData.user.id,
            currency: formData.currency,
            amount: formData.amount,
            description: formData.description,
            type: mode
        });
    };

    const handleClose = () => {
        setFormData({ user: null, amount: 0, currency: '', description: '' });
        onOpenChange(false);
    };

    return (
        <FormDialog
            open={open}
            onOpenChange={handleClose}
            title={currentConfig.title}
            description={currentConfig.description}
            submitText={currentConfig.buttonText}
            loading={submitting}
            onSubmit={handleSubmit}
            disabled={!formData.user || !formData.currency || formData.amount <= 0}
            submitClassName={currentConfig.buttonVariant === 'destructive' ? 'bg-destructive hover:bg-destructive/90' : ''}
        >
            <div className="space-y-4">
                <UserSearchInput
                    selectedUser={formData.user}
                    onSelectUser={(user) => setFormData((prev) => ({ ...prev, user }))}
                />

                <div className="space-y-2">
                    <Label htmlFor="currency">选择货币</Label>
                    <Select 
                        value={formData.currency} 
                        onValueChange={(val) => setFormData(prev => ({ ...prev, currency: val }))}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="选择货币" />
                        </SelectTrigger>
                        <SelectContent>
                            {currencies.map(c => (
                                <SelectItem key={c.code} value={c.code}>
                                    {c.name} ({c.code})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>


                <div className="space-y-2">
                    <Label htmlFor="amount">{currentConfig.amountLabel}</Label>
                    <Input
                        id="amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) => setFormData((prev) => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                        placeholder={currentConfig.amountPlaceholder}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="description">{currentConfig.reasonLabel}</Label>
                    <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                        placeholder={currentConfig.reasonPlaceholder}
                        rows={3}
                    />
                </div>

                {currentConfig.showWarning && (
                    <div className="p-3 border border-yellow-500/20 bg-yellow-500/5 rounded-lg">
                        <p className="text-sm text-yellow-600">
                            ⚠️ 注意：即使余额不足，管理员也可以强制扣除（导致负余额）
                        </p>
                    </div>
                )}
            </div>
        </FormDialog>
    );
}
