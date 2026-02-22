'use client';

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSettings } from '@/contexts/SettingsContext';
import { toast } from 'sonner';
import { Settings, ToggleLeft, Gauge, Layers, MessageSquare, Shield, HardDrive } from 'lucide-react';
import { Loading } from '@/components/common/Loading';
import { PageHeader } from '@/components/common/PageHeader';

// 导入组件
import { GeneralSettings } from './components/GeneralSettings';
import { FeatureSettings } from './components/FeatureSettings';
import { OAuthSettings } from './components/OAuthProviderCard';
import { MessageSettings } from './components/MessageSettings';
import { StorageSettings } from './components/StorageProviderCard';
import { RateLimitSettings } from './components/RateLimitSettings';
import { CaptchaSettings } from './components/CaptchaSettings';


// Tab 配置
const tabItems = [
  {
    value: 'general',
    label: '通用设置',
    shortLabel: '通用',
    icon: Settings,
  },
  {
    value: 'features',
    label: '功能开关',
    shortLabel: '功能',
    icon: ToggleLeft,
  },
  {
    value: 'oauth',
    label: '三方登录',
    shortLabel: 'OAuth',
    icon: Layers,
  },
  {
    value: 'message',
    label: '消息服务',
    shortLabel: '消息',
    icon: MessageSquare,
  },
  {
    value: 'storage',
    label: '存储服务',
    shortLabel: '存储',
    icon: HardDrive,
  },
  {
    value: 'rate-limit',
    label: '访问限速',
    shortLabel: '限速',
    icon: Gauge,
  },
  {
    value: 'captcha',
    label: '人机验证',
    shortLabel: '验证',
    icon: Shield,
  },
];

export default function SystemSettingsPage() {
  const { settings, loading, updateSetting } = useSettings();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  const handleSave = async (key, value) => {
    setSaving(true);
    try {
      const result = await updateSetting(key, value);
      if (result.success) {
        toast.success('配置已保存');
      } else {
        toast.error('保存配置失败');
      }
    } catch (error) {
      console.error('Failed to save setting:', error);
      toast.error('保存配置失败');
    } finally {
      setSaving(false);
    }
  };

  const handleBooleanChange = (key, checked) => {
    if (settings[key] && settings[key].value !== checked) {
      handleSave(key, checked);
    }
  };

  const handleNumberChange = (key, value) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && settings[key] && settings[key].value !== numValue) {
      handleSave(key, numValue);
    }
  };

  const handleStringChange = (key, value) => {
    const trimmedValue = value.trim();
    if (settings[key] && settings[key].value !== trimmedValue) {
      handleSave(key, trimmedValue);
    }
  };

  if (loading) {
    return <Loading text='加载中...' className='min-h-[400px]' />;
  }

  const activeItem = tabItems.find(item => item.value === activeTab);

  return (
    <div className='space-y-6'>
      <PageHeader
        title='系统配置'
        description='管理论坛的全局设置和功能开关'
      />

      {/* 移动端选择器 */}
      <div className='md:hidden'>
        <Select value={activeTab} onValueChange={setActiveTab}>
          <SelectTrigger className='w-full'>
            <SelectValue>
              {activeItem && (
                <div className='flex items-center gap-2'>
                  <activeItem.icon className='h-4 w-4' />
                  <span>{activeItem.label}</span>
                </div>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {tabItems.map((item) => {
              const Icon = item.icon;
              return (
                <SelectItem key={item.value} value={item.value}>
                  <div className='flex items-center gap-2'>
                    <Icon className='h-4 w-4' />
                    <span>{item.label}</span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* 桌面端 Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className='space-y-6'>
        <TabsList className='hidden md:inline-flex'>
          {tabItems.map((item) => {
            const Icon = item.icon;
            return (
              <TabsTrigger key={item.value} value={item.value} className='gap-2'>
                <Icon className='h-4 w-4' />
                <span className='hidden lg:inline'>{item.label}</span>
                <span className='md:inline lg:hidden'>{item.shortLabel}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* 通用设置 Tab */}
        <TabsContent value='general'>
          <GeneralSettings
            settings={settings}
            handleStringChange={handleStringChange}
            handleNumberChange={handleNumberChange}
            saving={saving}
          />
        </TabsContent>

        {/* 功能开关 Tab */}
        <TabsContent value='features'>
          <FeatureSettings
            settings={settings}
            handleStringChange={handleStringChange}
            handleBooleanChange={handleBooleanChange}
            handleNumberChange={handleNumberChange}
            saving={saving}
          />
        </TabsContent>

        {/* OAuth 配置 Tab */}
        <TabsContent value='oauth'>
          <OAuthSettings />
        </TabsContent>

        {/* 消息服务配置 Tab */}
        <TabsContent value='message'>
          <MessageSettings />
        </TabsContent>

        {/* 存储服务配置 Tab */}
        <TabsContent value='storage'>
          <StorageSettings />
        </TabsContent>

        {/* 访问限速 Tab */}
        <TabsContent value='rate-limit'>
          <RateLimitSettings
            settings={settings}
            handleBooleanChange={handleBooleanChange}
            handleNumberChange={handleNumberChange}
            saving={saving}
          />
        </TabsContent>

        {/* 人机验证 Tab */}
        <TabsContent value='captcha'>
          <CaptchaSettings />
        </TabsContent>

      </Tabs>
    </div>
  );
}
