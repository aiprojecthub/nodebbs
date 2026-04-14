'use client';

import { useState, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSettings } from '@/contexts/SettingsContext';
import { toast } from 'sonner';
import {
  Settings,
  KeyRound,
  Shield,
  Bot,
  Fingerprint,
  Users,
  ShieldAlert,
  Gauge,
  Unplug,
  Send,
  HardDrive,
  Webhook
} from 'lucide-react';
import { Loading } from '@/components/common/Loading';

// 导入所有重构后或原有的配置子组件
import { GeneralSettings } from './components/GeneralSettings';
import { RegistrationSettings } from './components/RegistrationSettings';
import { SecuritySettings } from './components/SecuritySettings';
import { AuthenticationSettings } from './components/AuthenticationSettings';
import { UserManagementSettings } from './components/UserManagementSettings';
import { SpamProtectionSettings } from './components/SpamProtectionSettings';
import { RateLimitSettings } from './components/RateLimitSettings';
import { CaptchaSettings } from './components/CaptchaSettings';
import { OAuthSettings } from './components/OAuthProviderCard';
import { MessageSettings } from './components/MessageSettings';
import { StorageSettings } from './components/StorageProviderCard';
import { WebhookSettings } from './components/WebhookSettings';

// 扁平化的全局导航菜单
const navigationGroups = [
  {
    group: '基础配置',
    items: [
      { id: 'general', label: '通用设置', icon: Settings, description: '站点名称、Logo与SEO优化' },
    ]
  },
  {
    group: '用户与权限',
    items: [
      { id: 'registration', label: '注册设置', icon: KeyRound, description: '开放注册与首选验证方式' },
      { id: 'user-management', label: '账户资料', icon: Users, description: '用户名修改权限与头像上传' },
    ]
  },
  {
    group: '安全与防护',
    items: [
      { id: 'security', label: '内容安全', icon: Shield, description: '邮箱验证与全站内容审核机制' },
      { id: 'spam-protection', label: '垃圾拦截', icon: ShieldAlert, description: '防垃圾库与邮箱域名黑名单' },
      { id: 'rate-limit', label: '访问限速', icon: Gauge, description: 'API调用频率限制与防DDoS' },
      { id: 'captcha', label: '人机验证', icon: Bot, description: 'Cloudflare Turnstile 验证配置' },
    ]
  },
  {
    group: '认证与集成',
    items: [
      { id: 'authentication', label: '认证方式', icon: Fingerprint, description: '密码登录与验证码快捷配置' },
      { id: 'oauth', label: '三方登录', icon: Unplug, description: 'GitHub, Google 等 SSO 接入' },
    ]
  },
  {
    group: '外部服务',
    items: [
      { id: 'message', label: '消息服务', icon: Send, description: '邮件(SMTP/Resend)与短信通道' },
      { id: 'storage', label: '存储服务', icon: HardDrive, description: '本地存储与 S3 兼容对象网关' },
      { id: 'webhook', label: 'Webhook 集成', icon: Webhook, description: '事件通知与外部系统集成' },
    ]
  }
];

// 提取所有 items 为一维数组方便查找
const flatNavigationItems = navigationGroups.flatMap(group => group.items);

function SystemSettingsContent() {
  const { settings, loading, updateSetting } = useSettings();
  const [saving, setSaving] = useState(false);
  
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'general';

  const setActiveTab = (tabId) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('tab', tabId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

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

  const handleChange = (key, rawValue) => {
    const setting = settings[key];
    if (!setting) return;

    let value = rawValue;
    if (setting.valueType === 'number') {
      value = parseFloat(rawValue);
      if (isNaN(value)) return;
    } else if (setting.valueType === 'boolean') {
      value = Boolean(rawValue);
    } else {
      value = String(rawValue).trim();
    }

    if (setting.value !== value) {
      handleSave(key, value);
    }
  };

  // 通用 onBlur 处理：数字输入空值恢复，其余直接保存
  const handleInputBlur = (key, e) => {
    const raw = e.target.value.trim();
    const setting = settings[key];
    if (!setting) return;

    if (setting.valueType === 'number' && raw === '') {
      e.target.value = setting.value ?? '';
      return;
    }

    handleChange(key, raw);
  };

  if (loading) {
    return <Loading text='加载中...' className='min-h-100' />;
  }

  const activeItem = flatNavigationItems.find(item => item.id === activeTab);

  const renderContent = () => {
    switch (activeTab) {
      case 'general':
        return <GeneralSettings settings={settings} handleChange={handleChange} handleInputBlur={handleInputBlur} saving={saving} />;
      case 'registration':
        return <RegistrationSettings settings={settings} handleChange={handleChange} saving={saving} />;
      case 'user-management':
        return <UserManagementSettings settings={settings} handleChange={handleChange} handleInputBlur={handleInputBlur} saving={saving} />;
      case 'security':
        return <SecuritySettings settings={settings} handleChange={handleChange} handleInputBlur={handleInputBlur} saving={saving} />;
      case 'spam-protection':
        return <SpamProtectionSettings settings={settings} handleChange={handleChange} handleInputBlur={handleInputBlur} saving={saving} />;
      case 'rate-limit':
        return <RateLimitSettings settings={settings} handleChange={handleChange} handleInputBlur={handleInputBlur} saving={saving} />;
      case 'captcha':
        return <CaptchaSettings />;
      case 'authentication':
        return <AuthenticationSettings settings={settings} handleChange={handleChange} saving={saving} />;
      case 'oauth':
        return <OAuthSettings />;
      case 'message':
        return <MessageSettings />;
      case 'storage':
        return <StorageSettings />;
      case 'webhook':
        return <WebhookSettings />;
      default:
        return null;
    }
  };

  return (
    <div className='space-y-6'>

      {/* 移动端选择器 */}
      <div className='lg:hidden'>
        <Select value={activeTab} onValueChange={setActiveTab}>
          <SelectTrigger className='w-full bg-card h-12'>
            <SelectValue>
              {activeItem && (
                <div className='flex items-center gap-3'>
                  <activeItem.icon className='h-5 w-5 text-primary' />
                  <span className="font-medium">{activeItem.label}</span>
                </div>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {navigationGroups.map((group, groupIdx) => (
              <div key={groupIdx}>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground/70 tracking-wider">
                  {group.group}
                </div>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <SelectItem key={item.id} value={item.id}>
                      <div className='flex items-center gap-3 py-1'>
                        <Icon className='h-4.5 w-4.5 opacity-70' />
                        <div>
                          <div className='font-medium'>{item.label}</div>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </div>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 桌面端：左侧边栏 + 右侧内容 */}
      <div className='flex flex-col lg:flex-row gap-8 items-start'>
        
        {/* 左侧导航：极简透明风格 */}
        <aside className='hidden lg:block w-56 shrink-0 sticky top-[var(--header-offset)] self-start'>
          <nav className='space-y-6 lg:pr-6 lg:border-r lg:border-border/40'>
            {navigationGroups.map((group, groupIdx) => (
              <div key={groupIdx}>
                <h4 className="px-2 mb-2 text-[11px] font-semibold text-muted-foreground/60 tracking-wider">
                  {group.group}
                </h4>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={cn(
                          'w-full flex items-center gap-3 px-2 py-2 rounded-md text-left transition-colors group relative',
                          isActive
                            ? 'text-foreground font-medium'
                            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                        )}
                      >
                        {isActive && (
                          <div className="absolute left-0 -ml-2 h-full w-0.75 rounded-r-full bg-primary" />
                        )}
                        <Icon className={cn(
                          'h-4 w-4 shrink-0 transition-colors',
                          isActive ? 'text-primary' : 'group-hover:text-foreground'
                        )} />
                        <span className="flex-1 text-[13px] truncate">
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* 右侧设置渲染区的标题和包裹 */}
        <main className='flex-1 min-w-0 w-full'>
          <div className="mb-6 hidden lg:block">
             <h2 className="text-2xl font-semibold tracking-tight">{activeItem?.label}</h2>
             <p className="text-muted-foreground mt-1">{activeItem?.description}</p>
          </div>
          {/* 这里不再渲染一个巨大的边框，而是让子组件自己用 SettingLayout 去规划区块 */}
          <div className='pb-20'>
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function SystemSettingsPage() {
  return (
    <Suspense fallback={<Loading text='加载中...' className='min-h-100' />}>
      <SystemSettingsContent />
    </Suspense>
  );
}
