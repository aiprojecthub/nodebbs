'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { badgesApi } from '@/extensions/badges/api';
import { toast } from 'sonner';
import { UserSearchInput } from '@/extensions/ledger/components/admin/UserSearchInput';
import { FormDialog } from '@/components/common/FormDialog';

export function BadgeAssignmentDialog({ open, onOpenChange, badgeList = [] }) {
  const [mode, setMode] = useState('grant'); // 'grant' or 'revoke'
  const [selectedUser, setSelectedUser] = useState(null);
  const [badgeId, setBadgeId] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!selectedUser || !badgeId) {
      toast.error('请选择用户和勋章');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'grant') {
        await badgesApi.admin.grant({
          userId: selectedUser.id,
          badgeId: parseInt(badgeId),
          reason
        });
        toast.success(`勋章授予成功 (User: ${selectedUser.username}, Badge ID: ${badgeId})`);
      } else {
        await badgesApi.admin.revoke({
          userId: selectedUser.id,
          badgeId: parseInt(badgeId)
        });
        toast.success(`勋章撤销成功 (User: ${selectedUser.username}, Badge ID: ${badgeId})`);
      }
      onOpenChange(false);
      // Reset form
      setSelectedUser(null);
      setBadgeId('');
      setReason('');
    } catch (error) {
      console.error('Operation failed:', error);
      toast.error(error.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="管理用户勋章"
      description="手动授予或撤销用户的勋章。此操作会直接修改用户数据。"
      submitText={mode === 'grant' ? '确认授予' : '确认撤销'}
      onSubmit={handleSubmit}
      loading={loading}
    >
      <Tabs value={mode} onValueChange={setMode} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="grant">授予勋章</TabsTrigger>
          <TabsTrigger value="revoke">撤销勋章</TabsTrigger>
        </TabsList>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <UserSearchInput 
              onSelectUser={setSelectedUser} 
              selectedUser={selectedUser} 
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="badgeId">选择勋章</Label>
            <Select value={badgeId} onValueChange={setBadgeId} required>
              <SelectTrigger>
                <SelectValue placeholder="选择一个勋章" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {badgeList.map((badge) => (
                  <SelectItem key={badge.id} value={String(badge.id)}>
                    <div className="flex items-center gap-2">
                       {badge.iconUrl && <img src={badge.iconUrl} className="w-4 h-4 object-contain" alt="" />}
                       <span>{badge.name} (ID: {badge.id})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <TabsContent value="grant" className="mt-0">
            <div className="grid gap-2">
              <Label htmlFor="reason">授予原因 (可选)</Label>
              <Input
                id="reason"
                placeholder="例如: 活动奖励"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="revoke" className="mt-0">
             <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                注意：撤销后，用户将立即失去该勋章及其带来的所有权益（如特殊的头像边框或展示位）。
             </div>
          </TabsContent>
        </div>
      </Tabs>
    </FormDialog>
  );
}
