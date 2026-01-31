'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/common/PageHeader';
import { InvitationList } from './components/InvitationList';
import { InvitationRules } from './components/InvitationRules';

export default function AdminInvitationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="邀请管理"
        description="管理平台邀请码生成情况及各角色生成规则"
      />

      <Tabs defaultValue="codes" className="gap-4">
        <TabsList className="">
          <TabsTrigger value="codes">邀请码列表</TabsTrigger>
          <TabsTrigger value="rules">邀请规则设置</TabsTrigger>
        </TabsList>

        <TabsContent value="codes" className="space-y-6">
          <InvitationList />
        </TabsContent>

        <TabsContent value="rules" className="space-y-6">
            <InvitationRules />
        </TabsContent>
      </Tabs>
    </div>
  );
}
