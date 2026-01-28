'use client';

import { useState } from 'react';
import { FormDialog } from '@/components/common/FormDialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { moderationApi } from '@/lib/api';
import { toast } from 'sonner';

export function BanUserDialog({ open, onOpenChange, user, onBanned }) {
  const [form, setForm] = useState({ duration: 0, reason: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleOpenChange = (v) => {
    if (v) setForm({ duration: 0, reason: '' });
    onOpenChange(v);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await moderationApi.banUser(user.id, {
        duration: form.duration || null,
        reason: form.reason || null,
      });
      const durationText = form.duration ? `${form.duration} 分钟` : '永久';
      toast.success(`已封禁用户 ${user.username}（${durationText}）`);
      onBanned?.(user.id);
      onOpenChange(false);
    } catch (err) {
      console.error('封禁失败:', err);
      toast.error('封禁失败：' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="封禁用户"
      description={
        <>
          封禁用户 &quot;{user?.username}&quot;，封禁后将无法登录
          {user?.role === 'admin' && (
            <>
              <br />
              <span className="text-amber-600 font-medium">
                注意：该用户是管理员，只有创始人可以封禁其他管理员。
              </span>
            </>
          )}
        </>
      }
      submitText="确认封禁"
      onSubmit={handleSubmit}
      loading={submitting}
      maxWidth="sm:max-w-[450px]"
    >
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="banDuration">封禁时长</Label>
          <Select
            value={form.duration?.toString() || '0'}
            onValueChange={(value) => setForm({ ...form, duration: parseInt(value) })}
            disabled={submitting}
          >
            <SelectTrigger id="banDuration">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="60">1 小时</SelectItem>
              <SelectItem value="360">6 小时</SelectItem>
              <SelectItem value="1440">1 天</SelectItem>
              <SelectItem value="4320">3 天</SelectItem>
              <SelectItem value="10080">7 天</SelectItem>
              <SelectItem value="43200">30 天</SelectItem>
              <SelectItem value="129600">90 天</SelectItem>
              <SelectItem value="0">永久</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="banReason">封禁原因（可选）</Label>
          <Textarea
            id="banReason"
            placeholder="请输入封禁原因..."
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            disabled={submitting}
            rows={3}
          />
        </div>
      </div>
    </FormDialog>
  );
}
