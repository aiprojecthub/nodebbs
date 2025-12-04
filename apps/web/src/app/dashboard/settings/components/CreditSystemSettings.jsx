'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { creditsApi } from '@/lib/api';
import { toast } from 'sonner';
import { Coins, Loader2 } from 'lucide-react';

export function CreditSystemSettings() {
  const [configs, setConfigs] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const data = await creditsApi.admin.getConfig();
      // 转换为 key-value 对象
      const configMap = {};
      data.items.forEach((item) => {
        configMap[item.key] = {
          value: item.valueType === 'boolean' ? item.value === 'true' : Number(item.value),
          valueType: item.valueType,
          description: item.description,
        };
      });
      setConfigs(configMap);
    } catch (error) {
      console.error('获取配置失败:', error);
      toast.error('获取配置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (key, value) => {
    setSaving((prev) => ({ ...prev, [key]: true }));
    try {
      await creditsApi.admin.updateConfig(key, value);
      setConfigs((prev) => ({
        ...prev,
        [key]: { ...prev[key], value },
      }));
      toast.success('配置已保存');
    } catch (error) {
      console.error('保存配置失败:', error);
      toast.error('保存配置失败');
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleBooleanChange = (key, checked) => {
    handleUpdate(key, checked);
  };

  const handleNumberChange = (key, value) => {
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 0) {
      handleUpdate(key, numValue);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 系统开关 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            积分系统
          </CardTitle>
          <CardDescription>配置积分系统的全局开关和规则</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 系统启用开关 */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="system_enabled">启用积分系统</Label>
              <p className="text-sm text-muted-foreground">
                关闭后用户将无法进行任何积分相关操作
              </p>
            </div>
            <Switch
              id="system_enabled"
              checked={configs.system_enabled?.value || false}
              onCheckedChange={(checked) => handleBooleanChange('system_enabled', checked)}
              disabled={saving.system_enabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* 获取规则 */}
      <Card>
        <CardHeader>
          <CardTitle>获取规则</CardTitle>
          <CardDescription>配置用户通过各种行为获得积分的数量</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 签到基础积分 */}
          <div className="grid gap-2">
            <Label htmlFor="check_in_base_amount">签到基础积分</Label>
            <Input
              id="check_in_base_amount"
              type="number"
              min="0"
              value={configs.check_in_base_amount?.value || 0}
              onChange={(e) => handleNumberChange('check_in_base_amount', e.target.value)}
              onBlur={(e) => handleNumberChange('check_in_base_amount', e.target.value)}
              disabled={saving.check_in_base_amount}
            />
            <p className="text-xs text-muted-foreground">
              {configs.check_in_base_amount?.description}
            </p>
          </div>

          {/* 连续签到奖励 */}
          <div className="grid gap-2">
            <Label htmlFor="check_in_streak_bonus">连续签到额外奖励</Label>
            <Input
              id="check_in_streak_bonus"
              type="number"
              min="0"
              value={configs.check_in_streak_bonus?.value || 0}
              onChange={(e) => handleNumberChange('check_in_streak_bonus', e.target.value)}
              onBlur={(e) => handleNumberChange('check_in_streak_bonus', e.target.value)}
              disabled={saving.check_in_streak_bonus}
            />
            <p className="text-xs text-muted-foreground">
              {configs.check_in_streak_bonus?.description}
            </p>
          </div>

          {/* 发布话题奖励 */}
          <div className="grid gap-2">
            <Label htmlFor="post_topic_amount">发布话题奖励</Label>
            <Input
              id="post_topic_amount"
              type="number"
              min="0"
              value={configs.post_topic_amount?.value || 0}
              onChange={(e) => handleNumberChange('post_topic_amount', e.target.value)}
              onBlur={(e) => handleNumberChange('post_topic_amount', e.target.value)}
              disabled={saving.post_topic_amount}
            />
            <p className="text-xs text-muted-foreground">
              {configs.post_topic_amount?.description}
            </p>
          </div>

          {/* 发布回复奖励 */}
          <div className="grid gap-2">
            <Label htmlFor="post_reply_amount">发布回复奖励</Label>
            <Input
              id="post_reply_amount"
              type="number"
              min="0"
              value={configs.post_reply_amount?.value || 0}
              onChange={(e) => handleNumberChange('post_reply_amount', e.target.value)}
              onBlur={(e) => handleNumberChange('post_reply_amount', e.target.value)}
              disabled={saving.post_reply_amount}
            />
            <p className="text-xs text-muted-foreground">
              {configs.post_reply_amount?.description}
            </p>
          </div>

          {/* 获得点赞奖励 */}
          <div className="grid gap-2">
            <Label htmlFor="receive_like_amount">获得点赞奖励</Label>
            <Input
              id="receive_like_amount"
              type="number"
              min="0"
              value={configs.receive_like_amount?.value || 0}
              onChange={(e) => handleNumberChange('receive_like_amount', e.target.value)}
              onBlur={(e) => handleNumberChange('receive_like_amount', e.target.value)}
              disabled={saving.receive_like_amount}
            />
            <p className="text-xs text-muted-foreground">
              {configs.receive_like_amount?.description}
            </p>
          </div>

          {/* 邀请新用户奖励 */}
          <div className="grid gap-2">
            <Label htmlFor="invite_reward_amount">邀请新用户奖励</Label>
            <Input
              id="invite_reward_amount"
              type="number"
              min="0"
              value={configs.invite_reward_amount?.value || 0}
              onChange={(e) => handleNumberChange('invite_reward_amount', e.target.value)}
              onBlur={(e) => handleNumberChange('invite_reward_amount', e.target.value)}
              disabled={saving.invite_reward_amount}
            />
            <p className="text-xs text-muted-foreground">
              {configs.invite_reward_amount?.description}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 消费规则 */}
      <Card>
        <CardHeader>
          <CardTitle>消费规则</CardTitle>
          <CardDescription>配置积分消费的限制</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 打赏最小金额 */}
          <div className="grid gap-2">
            <Label htmlFor="reward_min_amount">打赏最小金额</Label>
            <Input
              id="reward_min_amount"
              type="number"
              min="1"
              value={configs.reward_min_amount?.value || 1}
              onChange={(e) => handleNumberChange('reward_min_amount', e.target.value)}
              onBlur={(e) => handleNumberChange('reward_min_amount', e.target.value)}
              disabled={saving.reward_min_amount}
            />
            <p className="text-xs text-muted-foreground">
              {configs.reward_min_amount?.description}
            </p>
          </div>

          {/* 打赏最大金额 */}
          <div className="grid gap-2">
            <Label htmlFor="reward_max_amount">打赏最大金额</Label>
            <Input
              id="reward_max_amount"
              type="number"
              min="1"
              value={configs.reward_max_amount?.value || 1000}
              onChange={(e) => handleNumberChange('reward_max_amount', e.target.value)}
              onBlur={(e) => handleNumberChange('reward_max_amount', e.target.value)}
              disabled={saving.reward_max_amount}
            />
            <p className="text-xs text-muted-foreground">
              {configs.reward_max_amount?.description}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
