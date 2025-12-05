'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { creditsApi } from '@/lib/api';
import { Coins, Loader2, Heart } from 'lucide-react';
import { toast } from 'sonner';

const QUICK_AMOUNTS = [1, 5, 10, 20, 50, 100];

export function RewardDialog({ open, onOpenChange, postId, postAuthor, onSuccess, onViewHistory }) {
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [balance, setBalance] = useState(null);
  const [minAmount, setMinAmount] = useState(1);
  const [maxAmount, setMaxAmount] = useState(1000);

  useEffect(() => {
    if (open) {
      // 获取用户余额
      fetchBalance();
      // 获取配置（可选：如果后端提供）
    }
  }, [open]);

  const fetchBalance = async () => {
    try {
      const data = await creditsApi.getBalance();
      setBalance(data.balance);
    } catch (error) {
      console.error('获取余额失败:', error);
    }
  };

  const handleQuickSelect = (value) => {
    setAmount(String(value));
  };

  const handleSubmit = async () => {
    const rewardAmount = parseInt(amount);

    if (!rewardAmount || isNaN(rewardAmount)) {
      toast.error('请输入有效的打赏金额');
      return;
    }

    if (rewardAmount < minAmount) {
      toast.error(`打赏金额不能低于 ${minAmount}`);
      return;
    }

    if (rewardAmount > maxAmount) {
      toast.error(`打赏金额不能超过 ${maxAmount}`);
      return;
    }

    if (balance !== null && rewardAmount > balance) {
      toast.error('积分余额不足');
      return;
    }

    setIsSubmitting(true);
    try {
      await creditsApi.reward(postId, rewardAmount, message || undefined);
      toast.success(`成功打赏 ${rewardAmount} 积分！`);

      // 刷新余额
      await fetchBalance();

      // 调用成功回调
      if (onSuccess) {
        onSuccess();
      }

      // 重置表单
      setAmount('');
      setMessage('');

      // 关闭弹窗
      onOpenChange(false);
    } catch (error) {
      toast.error(error.message || '打赏失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setAmount('');
    setMessage('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              打赏 {postAuthor}
            </div>
            {onViewHistory && (
              <Button 
                variant="link" 
                size="sm" 
                className="text-xs text-muted-foreground h-auto p-0 mr-10"
                onClick={onViewHistory}
              >
                查看记录
              </Button>
            )}
          </DialogTitle>
          <DialogDescription>
            向优质内容的创作者表示感谢
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 余额显示 */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>当前余额</span>
            <span className="flex items-center gap-1 font-medium text-foreground">
              <Coins className="h-4 w-4" />
              {balance !== null ? balance : '-'}
            </span>
          </div>

          {/* 快速选择金额 */}
          <div>
            <Label>快速选择</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {QUICK_AMOUNTS.map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant={amount === String(value) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleQuickSelect(value)}
                  disabled={balance !== null && value > balance}
                >
                  <Coins className="h-3 w-3 mr-1" />
                  {value}
                </Button>
              ))}
            </div>
          </div>

          {/* 自定义金额 */}
          <div>
            <Label htmlFor="amount">打赏金额</Label>
            <Input
              id="amount"
              type="number"
              placeholder={`输入金额 (${minAmount}-${maxAmount})`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={minAmount}
              max={maxAmount}
              className="mt-2"
            />
          </div>

          {/* 打赏留言 */}
          <div>
            <Label htmlFor="message">留言 (可选)</Label>
            <Textarea
              id="message"
              placeholder="给作者留言..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={200}
              rows={3}
              className="mt-2"
            />
            <div className="text-xs text-muted-foreground mt-1 text-right">
              {message.length}/200
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !amount}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                打赏中...
              </>
            ) : (
              <>
                <Heart className="mr-2 h-4 w-4" />
                确认打赏
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
