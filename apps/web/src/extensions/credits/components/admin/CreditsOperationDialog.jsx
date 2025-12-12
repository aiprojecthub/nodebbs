import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, Minus } from 'lucide-react';
import { UserSearchInput } from './UserSearchInput';
import { FormDialog } from '@/components/common/FormDialog';

/**
 * 用于发放或扣除积分的统一对话框
 * @param {Object} props
 * @param {boolean} props.open - 对话框打开状态
 * @param {Function} props.onOpenChange - 打开状态改变时的回调
 * @param {Function} props.onSubmit - 表单提交时的回调 (userId, amount, description)
 * @param {boolean} props.submitting - 提交进行中
 * @param {'grant' | 'deduct'} props.mode - 操作模式
 */
export function CreditsOperationDialog({ open, onOpenChange, onSubmit, submitting, mode = 'grant' }) {
  const [formData, setFormData] = useState({
    user: null,
    amount: 0,
    description: '',
  });

  const isGrant = mode === 'grant';

  const config = {
    grant: {
      title: '发放积分',
      description: '向指定用户发放积分',
      amountLabel: '积分数量',
      amountPlaceholder: '输入发放的积分数量',
      reasonLabel: '操作原因',
      reasonPlaceholder: '输入发放原因（可选）',
      buttonText: '确认发放',
      loadingText: '发放中...',
      icon: Plus,
      buttonVariant: 'default',
      showWarning: false,
    },
    deduct: {
      title: '扣除积分',
      description: '从指定用户扣除积分',
      amountLabel: '积分数量',
      amountPlaceholder: '输入扣除的积分数量',
      reasonLabel: '操作原因',
      reasonPlaceholder: '输入扣除原因（可选）',
      buttonText: '确认扣除',
      loadingText: '扣除中...',
      icon: Minus,
      buttonVariant: 'destructive',
      showWarning: true,
    },
  };

  const currentConfig = config[mode];
  const Icon = currentConfig.icon;

  const handleSubmit = () => {
    if (!formData.user || formData.amount <= 0) {
      return;
    }
    onSubmit(formData.user.id, formData.amount, formData.description);
  };

  const handleClose = () => {
    setFormData({ user: null, amount: 0, description: '' });
    onOpenChange(false);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={handleClose}
      title={currentConfig.title}
      description={currentConfig.description}
      submitText={
        <>
            {currentConfig.buttonText}
        </>
      }
      loading={submitting}
      onSubmit={handleSubmit}
      disabled={!formData.user || formData.amount <= 0}
      submitClassName={currentConfig.buttonVariant === 'destructive' ? 'bg-destructive hover:bg-destructive/90' : ''}
    >
        <div className="space-y-4">
          <UserSearchInput
            selectedUser={formData.user}
            onSelectUser={(user) => setFormData((prev) => ({ ...prev, user }))}
          />

          <div className="space-y-2">
            <Label htmlFor="amount">{currentConfig.amountLabel}</Label>
            <Input
              id="amount"
              type="number"
              min="1"
              value={formData.amount}
              onChange={(e) => setFormData((prev) => ({ ...prev, amount: parseInt(e.target.value) || 0 }))}
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
                ⚠️ 注意：如果用户余额不足，扣除操作将失败
              </p>
            </div>
          )}
        </div>
    </FormDialog>
  );
}
