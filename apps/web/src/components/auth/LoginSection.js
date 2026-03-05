'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useSettings } from '@/contexts/SettingsContext';
import { useLoginForm } from '@/hooks/auth/useLoginForm';
import { useOAuthProviders } from '@/hooks/auth/useOAuthProviders';
import { LoginForm } from '@/components/auth/LoginDialog/LoginForm';
import { OAuthSection } from '@/components/auth/LoginDialog/OAuthSection';
import { QRLoginTab } from '@/components/auth/LoginDialog/QRLoginTab';
import { PhoneLoginForm } from '@/components/auth/LoginDialog/PhoneLoginForm';

export function LoginSection({ onSuccess, onForgotPassword }) {
  const { settings } = useSettings();
  const qrLoginEnabled = settings?.qr_login_enabled?.value === true;
  const phoneLoginEnabled = settings?.phone_login_enabled?.value === true;

  const loginForm = useLoginForm({ onSuccess });
  const { oauthProviders } = useOAuthProviders();

  const loginContent = (
    <>
      <LoginForm
        formData={loginForm.formData}
        error={loginForm.error}
        isLoading={loginForm.isLoading}
        onSubmit={loginForm.handleSubmit}
        onChange={loginForm.handleChange}
        onForgotPassword={onForgotPassword}
        onCaptchaVerify={loginForm.setCaptchaToken}
      />
      <OAuthSection
        providers={oauthProviders}
        isLogin={true}
        isLoading={loginForm.isLoading}
        setIsLoading={() => {}}
        setError={loginForm.setError}
      />
    </>
  );

  const hasTabs = qrLoginEnabled || phoneLoginEnabled;

  if (hasTabs) {
    // 计算 tab 数量
    const tabCount = 1 + (phoneLoginEnabled ? 1 : 0) + (qrLoginEnabled ? 1 : 0);

    // 计算 tab 列样式
    const gridColsClass = tabCount === 3 ? 'grid-cols-3' : 'grid-cols-2';

    return (
      <Tabs defaultValue="password" className="w-full">
        <TabsList className={`grid w-full ${gridColsClass}`}>
          <TabsTrigger value="password">密码登录</TabsTrigger>
          {phoneLoginEnabled && (
            <TabsTrigger value="phone">手机登录</TabsTrigger>
          )}
          {qrLoginEnabled && (
            <TabsTrigger value="qr">扫码登录</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="password" className="">
          {loginContent}
        </TabsContent>

        {phoneLoginEnabled && (
          <TabsContent value="phone" className="">
            <PhoneLoginForm onSuccess={onSuccess} />
          </TabsContent>
        )}

        {qrLoginEnabled && (
          <TabsContent value="qr" className="">
            <QRLoginTab onSuccess={onSuccess} />
          </TabsContent>
        )}
      </Tabs>
    );
  }

  return loginContent;
}
