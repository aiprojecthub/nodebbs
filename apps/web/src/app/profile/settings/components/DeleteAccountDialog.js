'use client';

import { useState } from 'react';
import { FormDialog } from '@/components/common/FormDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle } from 'lucide-react';

/**
 * 账号注销确认弹窗 — 多步确认流程
 */
export function DeleteAccountDialog({ open, onOpenChange, user, onConfirm, loading, cooldownDays = 30 }) {
  const [step, setStep] = useState(1);
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [reason, setReason] = useState('');

  const hasPassword = user?.hasPassword !== false;

  const reset = () => {
    setStep(1);
    setPassword('');
    setConfirmText('');
    setReason('');
  };

  const handleOpenChange = (val) => {
    if (!val) reset();
    onOpenChange(val);
  };

  const handleConfirm = () => {
    onConfirm({
      password: hasPassword ? password : undefined,
      confirmText: hasPassword ? undefined : confirmText,
      reason: reason || undefined,
    });
  };

  const isStep2Valid = hasPassword ? password.length > 0 : confirmText === 'DELETE';

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="注销账号"
      description="请仔细阅读以下信息"
      maxWidth="sm:max-w-125"
      footer={
        <div className="shrink-0 p-6 pt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            取消
          </Button>
          {step === 1 ? (
            <Button variant="destructive" onClick={() => setStep(2)}>
              我已了解，继续
            </Button>
          ) : (
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={!isStep2Valid || loading}
            >
              {loading ? '处理中...' : '确认注销'}
            </Button>
          )}
        </div>
      }
    >
      {step === 1 ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/30">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm">
              <p className="font-medium text-destructive">注销账号后：</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>账号将<strong>立即无法登录</strong></li>
                {cooldownDays > 0 ? (
                  <>
                    <li>{cooldownDays} 天冷静期内可联系管理员恢复</li>
                    <li>到期后个人信息将被<strong>永久删除</strong></li>
                  </>
                ) : (
                  <li>个人信息将被<strong>立即永久删除</strong></li>
                )}
                <li>发布的帖子和话题将保留，但作者显示为&ldquo;已注销用户&rdquo;</li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {hasPassword ? (
            <div>
              <Label className="text-sm font-medium block mb-2">
                请输入密码以确认身份 *
              </Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入当前密码"
                autoFocus
              />
            </div>
          ) : (
            <div>
              <Label className="text-sm font-medium block mb-2">
                请输入 <span className="font-mono font-bold">DELETE</span> 以确认注销 *
              </Label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder='输入 DELETE'
                autoFocus
              />
            </div>
          )}
          <div>
            <Label className="text-sm font-medium block mb-2">
              注销原因（可选）
            </Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="告诉我们您注销的原因，帮助我们改进"
              rows={3}
            />
          </div>
        </div>
      )}
    </FormDialog>
  );
}
